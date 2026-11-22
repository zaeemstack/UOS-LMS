import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { evaluateSlotStatus, timeStringToMinutes } from '../services/lockEngineService.js';
import { isIpInCampusSubnet, isIpInRoomSubnet } from '../utils/ipUtils.js';
import { broadcastAttendanceSubmission } from '../services/websocketService.js';
import emailService from '../services/emailService.js';

/**
 * Dual Attendance Submission Controller:
 * Records student roster attendance AND automatically marks teacher's attendance
 * with exact timestamp, room IP, and session fingerprint in a single atomic transaction.
 */
export const submitDualAttendance = async (req, res) => {
  try {
    const { slotId, studentAttendances, biometricVerified, biometricType, routerMac, teacherPassword } = req.body;
    const clientIp = req.clientIp;

    if (!slotId || !Array.isArray(studentAttendances) || studentAttendances.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: slotId and student attendance list are required.',
      });
    }

    // Verify Teacher Password / Security Credential if provided (Anti-Proxy Lock)
    if (teacherPassword) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (dbUser) {
        const isMatch = await bcrypt.compare(teacherPassword, dbUser.passwordHash);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TEACHER_CREDENTIALS',
            message: 'Security Verification Failed: Incorrect Teacher Password. Proxy submission rejected.',
          });
        }
      }
    }

    // 1. Double check Network Perimeter Gatekeeper
    if (process.env.BYPASS_NETWORK_FENCE !== 'true' && !isIpInCampusSubnet(clientIp)) {
      return res.status(403).json({
        success: false,
        code: 'CAMPUS_PERIMETER_RESTRICTION',
        message: 'Security Violation: Attendance can ONLY be marked from inside authorized campus Wi-Fi.',
        clientIp,
      });
    }

    // 2. Fetch slot and verify ownership
    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: {
        course: true,
        section: true,
        room: true,
        teacher: true,
      },
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Class slot not found.' });
    }

    if (req.user.role === 'TEACHER' && slot.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not assigned as instructor for this slot.' });
    }

    // 2b. University Campus Network Verified
    // (Specific classroom router check has been removed as per specification so any University Wi-Fi connection is accepted)
    console.log(`[Attendance Security] Campus Wi-Fi verified for teacher ${req.user.id} from IP: ${clientIp}`);

    // 3. Evaluate Class Lock Engine
    const now = new Date();
    const todayDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const existingSession = await prisma.AttendanceSession.findFirst({
      where: {
        timetableSlotId: slotId,
        date: {
          gte: todayDateStart,
          lt: todayDateEnd,
        },
      },
    });

    const statusEvaluation = evaluateSlotStatus(slot, existingSession);

    if (!statusEvaluation.canMark) {
      return res.status(423).json({
        success: false,
        code: 'CLASS_LOCKED',
        message: statusEvaluation.lockReason || 'This class is currently locked for attendance.',
        evaluation: statusEvaluation,
      });
    }

    // 4. Calculate Teacher Attendance Status based on Arrival Time
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = timeStringToMinutes(slot.startTime);
    let teacherAttendanceStatus = 'PRESENT';

    if (currentMinutes > startMinutes) {
      teacherAttendanceStatus = 'LATE';
    }

    // 5. Execute Atomic Dual-Attendance Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update AttendanceSession (Teacher Attendance Record)
      let sessionRecord;
      if (existingSession) {
        sessionRecord = await tx.attendanceSession.update({
          where: { id: existingSession.id },
          data: {
            teacherId: req.user.id,
            teacherMarkedAt: now,
            teacherStatus: teacherAttendanceStatus,
            clientIp: clientIp,
            userAgent: req.headers['user-agent'] || 'Web Portal',
            connectedRouterIp: slot.room?.routerIp || clientIp,
            connectedRouterMac: slot.room?.routerMac || routerMac || null,
            biometricVerified: !!biometricVerified,
            biometricType: biometricType || (biometricVerified ? 'WEBAUTHN_FINGERPRINT' : null),
            sessionStatus: 'COMPLETED',
            isLocked: false,
          },
        });
        // Delete old records if any
        await tx.studentAttendance.deleteMany({
          where: { attendanceSessionId: sessionRecord.id },
        });
      } else {
        sessionRecord = await tx.attendanceSession.create({
          data: {
            timetableSlotId: slotId,
            date: todayDateStart,
            teacherId: req.user.id,
            teacherMarkedAt: now,
            teacherStatus: teacherAttendanceStatus,
            clientIp: clientIp,
            userAgent: req.headers['user-agent'] || 'Web Portal',
            connectedRouterIp: slot.room?.routerIp || clientIp,
            connectedRouterMac: slot.room?.routerMac || routerMac || null,
            biometricVerified: !!biometricVerified,
            biometricType: biometricType || (biometricVerified ? 'WEBAUTHN_FINGERPRINT' : null),
            sessionStatus: 'COMPLETED',
            isLocked: false,
          },
        });
      }

      // Create Student Attendance records
      const studentDataToInsert = studentAttendances.map((s) => ({
        attendanceSessionId: sessionRecord.id,
        studentId: s.studentId,
        status: s.status || 'PRESENT',
        remarks: s.remarks || null,
        recordedAt: now,
      }));

      await tx.studentAttendance.createMany({
        data: studentDataToInsert,
      });

      return sessionRecord;
    });

    // 6. Compute metrics
    const presentCount = studentAttendances.filter((s) => s.status === 'PRESENT').length;
    const absentCount = studentAttendances.filter((s) => s.status === 'ABSENT').length;
    const lateCount = studentAttendances.filter((s) => s.status === 'LATE').length;

    // 7. Emit Live Real-Time Dashboard Notification via WebSocket
    broadcastAttendanceSubmission({
      sessionId: result.id,
      slotId: slot.id,
      courseCode: slot.course.code,
      courseTitle: slot.course.title,
      sectionName: slot.section.name,
      teacherName: req.user.fullName,
      teacherStatus: teacherAttendanceStatus,
      clientIp: clientIp,
      markedAt: now.toISOString(),
      studentStats: {
        total: studentAttendances.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
    });

    res.json({
      success: true,
      message: 'Dual attendance successfully recorded.',
      dualAttendanceSummary: {
        sessionId: result.id,
        slot: {
          course: `${slot.course.code} - ${slot.course.title}`,
          section: slot.section.name,
          room: slot.room.roomNumber,
        },
        teacherAttendance: {
          teacherId: req.user.id,
          teacherName: req.user.fullName,
          status: teacherAttendanceStatus,
          timestamp: now.toISOString(),
          campusIpRecorded: clientIp,
        },
        studentAttendance: {
          totalMarked: studentAttendances.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        },
      },
    });
  } catch (err) {
    console.error('Error submitting dual attendance:', err);
    res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
};

/**
 * Fetches attendance history for a teacher
 */
export const getTeacherAttendanceHistory = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const sessions = await prisma.attendanceSession.findMany({
      where: { teacherId },
      include: {
        timetableSlot: {
          include: {
            course: true,
            section: true,
            room: true,
          },
        },
        studentRecords: {
          select: { status: true },
        },
      },
      orderBy: { teacherMarkedAt: 'desc' },
      take: 50,
    });

    const formatted = sessions.map((sess) => {
      const totalStudents = sess.studentRecords.length;
      const present = sess.studentRecords.filter((r) => r.status === 'PRESENT').length;
      const absent = sess.studentRecords.filter((r) => r.status === 'ABSENT').length;

      return {
        id: sess.id,
        date: sess.date,
        markedAt: sess.teacherMarkedAt,
        teacherStatus: sess.teacherStatus,
        clientIp: sess.clientIp,
        courseCode: sess.timetableSlot.course.code,
        courseTitle: sess.timetableSlot.course.title,
        sectionName: sess.timetableSlot.section.name,
        roomNumber: sess.timetableSlot.room.roomNumber,
        isOverridden: sess.isOverridden,
        overrideReason: sess.overrideReason,
        stats: { totalStudents, present, absent },
      };
    });

    res.json({ success: true, history: formatted });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history.' });
  }
};

/**
 * Teacher submits request to HOD to unlock/change locked attendance
 */
export const createOverrideRequest = async (req, res) => {
  try {
    const { slotId, reason } = req.body;
    const teacherId = req.user.id;

    if (!slotId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Timetable slot ID and justification reason are required.',
      });
    }

    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: {
        teacher: true,
        course: { include: { department: true } },
      },
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    const deptId = slot.teacher.departmentId || slot.course.departmentId;

    // Find HOD for department
    const hod = await prisma.user.findFirst({
      where: { role: 'HOD', departmentId: deptId },
    });

    // Check for existing pending request
    const existingReq = await prisma.overrideRequest.findFirst({
      where: {
        timetableSlotId: slotId,
        teacherId,
        status: 'PENDING',
      },
    });

    if (existingReq) {
      return res.status(400).json({
        success: false,
        message: 'A pending request for this slot has already been submitted to your HOD.',
      });
    }

    const request = await prisma.overrideRequest.create({
      data: {
        timetableSlotId: slotId,
        teacherId,
        departmentId: deptId,
        hodId: hod ? hod.id : null,
        reason,
        status: 'PENDING',
      },
      include: {
        timetableSlot: { include: { course: true, section: true } },
      },
    });

    // Notify HOD asynchronously via Email
    if (hod && hod.email) {
      emailService.notifyHodOfOverrideRequest({
        hodEmail: hod.email,
        hodName: hod.fullName,
        teacherName: req.user.fullName,
        courseCode: request.timetableSlot.course.code,
        courseTitle: request.timetableSlot.course.title,
        sectionName: request.timetableSlot.section.name,
        reason,
        requestedAt: request.requestedAt,
      }).catch((emailErr) => console.error('[Email Dispatcher Error]', emailErr));
    }

    res.json({
      success: true,
      message: 'Attendance override request successfully sent to HOD for approval.',
      request,
    });
  } catch (err) {
    console.error('Error creating override request:', err);
    res.status(500).json({ success: false, message: 'Failed to submit override request.' });
  }
};

/**
 * Teacher views their override request status
 */
export const getTeacherOverrideRequests = async (req, res) => {
  try {
    const requests = await prisma.overrideRequest.findMany({
      where: { teacherId: req.user.id },
      include: {
        timetableSlot: { include: { course: true, section: true } },
        hod: { select: { fullName: true, email: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    res.json({ success: true, requests });
  } catch (err) {
    console.error('Error fetching teacher override requests:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
};

/**
 * Robust CSV parser for student rosters (supports CSV, TSV, quoted cells)
 */
function parseCsvStudents(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const delimiter = line.includes('\t') && !line.includes(',') ? '\t' : ',';
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const firstTokens = parseLine(lines[0]);
  const isHeader = firstTokens.some((t) =>
    /roll|name|student|class|section|session|batch|reg/i.test(t)
  );

  let rollIdx = -1, nameIdx = -1, classIdx = -1, secIdx = -1, sessionIdx = -1, emailIdx = -1;

  if (isHeader) {
    firstTokens.forEach((col, idx) => {
      const c = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (/roll|reg|seat|urn|studentid|id$/.test(c)) rollIdx = idx;
      else if (/name|studentname|fullname/.test(c)) nameIdx = idx;
      else if (/class|degree|program|dept|department/.test(c)) classIdx = idx;
      else if (/section|sec/.test(c)) secIdx = idx;
      else if (/session|year|batch|academicyear/.test(c)) sessionIdx = idx;
      else if (/email/.test(c)) emailIdx = idx;
    });
  }

  // Fallbacks if columns weren't labelled with recognizable headers
  if (rollIdx === -1) rollIdx = 0;
  if (nameIdx === -1) nameIdx = 1;

  const rows = [];
  const startIndex = isHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === 0) continue;
    const roll = cols[rollIdx] || '';
    const name = cols[nameIdx] || '';
    if (!roll && !name) continue;

    rows.push({
      rollNumber: roll,
      fullName: name,
      className: classIdx >= 0 ? cols[classIdx] : '',
      sectionName: secIdx >= 0 ? cols[secIdx] : '',
      session: sessionIdx >= 0 ? cols[sessionIdx] : '',
      email: emailIdx >= 0 ? cols[emailIdx] : '',
    });
  }

  return rows;
}

/**
 * Teacher & Class Roster Bulk Student Import:
 * Enables teachers and HODs to upload or paste a roster containing:
 * Roll Number, Full Name, Class / Degree, Section, Session.
 * Automatically provisions student accounts, binds them to the section,
 * and attaches them to the current timetable slot roster.
 */
export const importStudentsForClass = async (req, res) => {
  let tempFilePath = null;
  try {
    const { slotId, sectionName: bodySection, session: bodySession, className: bodyClass, rawText } = req.body;

    let content = '';
    if (req.file) {
      tempFilePath = req.file.path;
      content = fs.readFileSync(tempFilePath, 'utf8');
    } else if (rawText) {
      content = rawText;
    }

    if (!content.trim() && !Array.isArray(req.body.students)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a student list file (.csv / .txt) or provide student data.',
      });
    }

    // 1. If slotId provided, get slot information for defaults
    let slot = null;
    if (slotId) {
      slot = await prisma.timetableSlot.findUnique({
        where: { id: slotId },
        include: {
          course: { include: { department: true } },
          section: true,
        },
      });
    }

    // 2. Parse student entries
    let parsedRows = [];
    if (Array.isArray(req.body.students)) {
      parsedRows = req.body.students;
    } else {
      parsedRows = parseCsvStudents(content);
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student records detected. Please ensure file contains Roll Number and Full Name.',
      });
    }

    const defaultPassword = await bcrypt.hash('password123', 10);

    // Pre-cache departments and sections
    const [depts, sections] = await Promise.all([
      prisma.department.findMany(),
      prisma.section.findMany(),
    ]);

    const deptMap = new Map(depts.map((d) => [d.code.toUpperCase(), d]));
    const sectionMap = new Map(sections.map((s) => [`${s.name.toUpperCase()}_${s.academicYear}`, s]));

    const defaultDept =
      slot?.course?.department ||
      depts[0] ||
      (await prisma.department.create({ data: { name: 'Department of Computer Science', code: 'CS' } }));
    const defaultSectionName = (bodySection?.trim() || slot?.section?.name || 'BSCS-6A').toUpperCase();
    const defaultAcademicYear = bodySession?.trim() || slot?.section?.academicYear || '2025-2026';

    let enrolledCount = 0;
    const errors = [];
    const enrolledStudents = [];

    for (const row of parsedRows) {
      try {
        const rollNumber = (row.rollNumber || row.roll_no || row.roll || row.id || '').trim().toUpperCase();
        const fullName = (row.fullName || row.name || row.studentName || row.student_name || '').trim();

        if (!rollNumber || !fullName) continue;

        const secName = (row.sectionName || row.section || defaultSectionName).trim().toUpperCase();
        const academicYear = (row.session || row.academicYear || defaultAcademicYear).trim();
        const deptCode = (row.className || row.class || row.departmentCode || defaultDept.code || 'CS').toUpperCase().trim();
        const email = (
          row.email || `${rollNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.uos.edu.pk`
        ).toLowerCase().trim();

        // 1. Resolve Department
        let dept = deptMap.get(deptCode);
        if (!dept) {
          dept = await prisma.department.create({
            data: { name: `Department of ${deptCode}`, code: deptCode },
          });
          deptMap.set(deptCode, dept);
        }

        // 2. Resolve Section
        const secKey = `${secName}_${academicYear}`;
        let section = sectionMap.get(secKey);
        if (!section) {
          section = await prisma.section.create({
            data: {
              name: secName,
              semester: 1,
              academicYear,
              departmentId: dept.id,
            },
          });
          sectionMap.set(secKey, section);
        }

        // 3. Upsert Student User
        const studentUser = await prisma.user.upsert({
          where: { email },
          update: {
            fullName,
            employeeOrRollId: rollNumber,
            departmentId: dept.id,
          },
          create: {
            email,
            passwordHash: defaultPassword,
            fullName,
            employeeOrRollId: rollNumber,
            role: 'STUDENT',
            departmentId: dept.id,
          },
        });

        // 4. Enroll in Section via StudentSection
        await prisma.studentSection.upsert({
          where: {
            studentId_sectionId: {
              studentId: studentUser.id,
              sectionId: section.id,
            },
          },
          update: {},
          create: {
            studentId: studentUser.id,
            sectionId: section.id,
          },
        });

        // 5. If called from a class slot, ensure enrollment in slot's section so roster updates immediately
        if (slot && slot.sectionId !== section.id) {
          await prisma.studentSection.upsert({
            where: {
              studentId_sectionId: {
                studentId: studentUser.id,
                sectionId: slot.sectionId,
              },
            },
            update: {},
            create: {
              studentId: studentUser.id,
              sectionId: slot.sectionId,
            },
          });
        }

        enrolledCount++;
        enrolledStudents.push({
          id: studentUser.id,
          rollNumber,
          fullName,
          section: secName,
          session: academicYear,
        });
      } catch (rowErr) {
        errors.push({ row, error: rowErr.message });
      }
    }

    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }

    res.json({
      success: true,
      message: `Successfully enrolled ${enrolledCount} students into ${defaultSectionName} (${defaultAcademicYear})!`,
      enrolledCount,
      sectionName: defaultSectionName,
      session: defaultAcademicYear,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err) {
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }
    console.error('Error in importStudentsForClass:', err);
    res.status(500).json({ success: false, message: 'Failed to import student roster: ' + err.message });
  }
};

