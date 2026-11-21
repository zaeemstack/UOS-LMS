import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
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

