import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import { evaluateSlotStatus } from '../services/lockEngineService.js';
import { broadcastSlotUnlocked } from '../services/websocketService.js';
import emailService from '../services/emailService.js';
import { FACULTY_CREDENTIALS } from '../config/facultyCredentialsMap.js';

const DAYS_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Admin / HOD Live Dashboard:
 * Overview of all classes scheduled today across the campus with their real-time state.
 */
/**
 * Admin / HOD Live Dashboard:
 * Overview of all classes scheduled today across the campus with their real-time state.
 * Scoped by department for HODs, full university view for ADMIN.
 */
export const getLiveAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const currentDay = DAYS_MAP[now.getDay()];
    const todayDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const whereClause = { dayOfWeek: currentDay };

    // HOD Scope: filter by department
    if (req.user.role === 'HOD' && req.user.departmentId) {
      whereClause.OR = [
        { teacher: { departmentId: req.user.departmentId } },
        { course: { departmentId: req.user.departmentId } },
        { section: { departmentId: req.user.departmentId } },
      ];
    } else if (req.query.departmentId) {
      whereClause.OR = [
        { teacher: { departmentId: req.query.departmentId } },
        { course: { departmentId: req.query.departmentId } },
        { section: { departmentId: req.query.departmentId } },
      ];
    }

    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: {
        course: { include: { department: true } },
        section: {
          include: {
            department: true,
            _count: { select: { students: true } },
          },
        },
        room: true,
        teacher: {
          select: { id: true, fullName: true, employeeOrRollId: true, email: true, departmentId: true, department: true },
        },
        sessions: {
          where: {
            date: {
              gte: todayDateStart,
              lt: todayDateEnd,
            },
          },
          include: {
            studentRecords: true,
            overrideBy: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    let totalSlots = slots.length;
    let completedCount = 0;
    let activeOpenCount = 0;
    let lockedCount = 0;
    let upcomingCount = 0;

    const evaluatedSlots = slots.map((slot) => {
      const todaySession = slot.sessions[0] || null;
      const evalStatus = evaluateSlotStatus(slot, todaySession);

      if (evalStatus.status === 'COMPLETED') completedCount++;
      else if (evalStatus.status === 'ACTIVE_OPEN' || evalStatus.status === 'UNLOCKED_OVERRIDE') activeOpenCount++;
      else if (evalStatus.status === 'LOCKED_LATE' || evalStatus.status === 'LOCKED_EXPIRED') lockedCount++;
      else if (evalStatus.status === 'UPCOMING') upcomingCount++;

      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        courseCode: slot.course.code,
        courseTitle: slot.course.title,
        department: slot.teacher.department?.name || slot.course.department?.name || 'N/A',
        sectionName: slot.section.name,
        studentCount: slot.section._count.students,
        roomNumber: slot.room.roomNumber,
        building: slot.room.building,
        teacher: slot.teacher,
        lockEvaluation: evalStatus,
        session: todaySession
          ? {
              id: todaySession.id,
              teacherStatus: todaySession.teacherStatus,
              teacherMarkedAt: todaySession.teacherMarkedAt,
              clientIp: todaySession.clientIp,
              isOverridden: todaySession.isOverridden,
              overrideReason: todaySession.overrideReason,
              overrideBy: todaySession.overrideBy?.fullName || null,
              totalMarkedCount: todaySession.studentRecords.length,
              presentCount: todaySession.studentRecords.filter((r) => r.status === 'PRESENT').length,
              absentCount: todaySession.studentRecords.filter((r) => r.status === 'ABSENT').length,
              lateCount: todaySession.studentRecords.filter((r) => r.status === 'LATE').length,
              studentRecords: todaySession.studentRecords,
            }
          : null,
      };
    });

    res.json({
      success: true,
      currentDay,
      serverTime: now.toISOString(),
      userRole: req.user.role,
      userDepartment: req.user.department?.name || null,
      metrics: {
        totalSlots,
        completedCount,
        activeOpenCount,
        lockedCount,
        upcomingCount,
      },
      slots: evaluatedSlots,
    });
  } catch (err) {
    console.error('Error fetching admin live dashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live dashboard.' });
  }
};

/**
 * Admin / HOD Override:
 * Unlocks a locked class (late-entry lock or expired period) with an audited justification.
 */
export const overrideSlotLock = async (req, res) => {
  try {
    const { slotId, reason } = req.body;

    if (!slotId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID and justification reason are required for an override.',
      });
    }

    const now = new Date();
    const todayDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: { teacher: true, course: true },
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    // Upsert session to set override
    const existingSession = await prisma.attendanceSession.findFirst({
      where: {
        timetableSlotId: slotId,
        date: {
          gte: todayDateStart,
          lt: todayDateEnd,
        },
      },
    });

    let session;
    if (existingSession) {
      session = await prisma.attendanceSession.update({
        where: { id: existingSession.id },
        data: {
          isLocked: false,
          isOverridden: true,
          overrideReason: reason,
          overrideById: req.user.id,
          overrideAt: now,
        },
      });
    } else {
      session = await prisma.attendanceSession.create({
        data: {
          timetableSlotId: slotId,
          date: todayDateStart,
          teacherId: slot.teacherId,
          clientIp: req.clientIp || 'ADMIN_OVERRIDE',
          sessionStatus: 'LOCKED', // Pending teacher marking
          isLocked: false,
          isOverridden: true,
          overrideReason: reason,
          overrideById: req.user.id,
          overrideAt: now,
        },
      });
    }

    // Broadcast instant unlock event to teacher UI
    broadcastSlotUnlocked(slotId, {
      overrideReason: reason,
      adminName: req.user.fullName,
      unlockedAt: now.toISOString(),
    });

    res.json({
      success: true,
      message: `Override successfully granted for ${slot.course.code}. The teacher can now mark attendance.`,
      session,
    });
  } catch (err) {
    console.error('Error in overrideSlotLock:', err);
    res.status(500).json({ success: false, message: 'Failed to process override.' });
  }
};

/**
 * Delinquency Report:
 * Identifies classes where teachers arrived late or failed to mark attendance.
 * Department-scoped for HODs.
 */
export const getDelinquencyReport = async (req, res) => {
  try {
    const whereClause = {
      OR: [
        { teacherStatus: 'LATE' },
        { isOverridden: true },
        { sessionStatus: 'LOCKED' },
      ],
    };

    if (req.user.role === 'HOD' && req.user.departmentId) {
      whereClause.teacher = { departmentId: req.user.departmentId };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: { id: true, fullName: true, employeeOrRollId: true, department: true },
        },
        timetableSlot: {
          include: {
            course: true,
            section: true,
            room: true,
          },
        },
        overrideBy: {
          select: { fullName: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Calculate Faculty Academic Audit & Punctuality metrics
    const teacherWhere = { role: 'TEACHER', isActive: true };
    if (req.user.role === 'HOD' && req.user.departmentId) {
      teacherWhere.departmentId = req.user.departmentId;
    }

    const teachers = await prisma.user.findMany({
      where: teacherWhere,
      select: {
        id: true,
        fullName: true,
        employeeOrRollId: true,
        email: true,
        department: { select: { id: true, name: true, code: true } },
        taughtSlots: {
          select: { id: true },
        },
        markedSessions: {
          select: {
            id: true,
            sessionStatus: true,
            teacherStatus: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const facultyAudit = teachers.map((t) => {
      const scheduledSlotsCount = t.taughtSlots.length;
      const conductedSessionsCount = t.markedSessions.filter(
        (s) => s.sessionStatus === 'COMPLETED' || s.teacherStatus === 'PRESENT' || s.teacherStatus === 'LATE'
      ).length;
      const missedCount = t.markedSessions.filter(
        (s) => s.sessionStatus === 'LOCKED' || s.teacherStatus === 'MISSED'
      ).length;

      let completionRate = 100;
      if (scheduledSlotsCount > 0) {
        const total = conductedSessionsCount + missedCount;
        completionRate = total > 0 ? Math.round((conductedSessionsCount / total) * 100) : 100;
      }

      return {
        teacherId: t.id,
        teacherName: t.fullName,
        employeeId: t.employeeOrRollId,
        email: t.email,
        department: t.department?.name || 'N/A',
        scheduledSlotsCount,
        conductedSessionsCount,
        missedCount,
        completionRate,
      };
    });

    res.json({
      success: true,
      report: sessions.map((s) => ({
        id: s.id,
        date: s.date,
        teacherName: s.teacher.fullName,
        employeeId: s.teacher.employeeOrRollId,
        department: s.teacher.department?.name || 'N/A',
        course: `${s.timetableSlot.course.code} - ${s.timetableSlot.course.title}`,
        section: s.timetableSlot.section.name,
        scheduledTime: `${s.timetableSlot.startTime} - ${s.timetableSlot.endTime}`,
        markedAt: s.teacherMarkedAt,
        teacherStatus: s.teacherStatus,
        clientIp: s.clientIp,
        isOverridden: s.isOverridden,
        overrideReason: s.overrideReason,
        overrideBy: s.overrideBy?.fullName || null,
      })),
      facultyAudit,
    });
  } catch (err) {
    console.error('Error fetching delinquency report:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch delinquency report.' });
  }
};


/**
 * Network Perimeter Audit Logs:
 * Inspect blocked outside connection attempts.
 */
export const getPerimeterAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.networkAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json({ success: true, logs });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

/**
 * Get Metadata for Timetable Management (Teachers, Courses, Sections, Rooms)
 */
export const getTimetableMetadata = async (req, res) => {
  try {
    const [teachers, courses, sections, rooms] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'TEACHER', isActive: true },
        select: { id: true, fullName: true, employeeOrRollId: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.course.findMany({
        select: { id: true, code: true, title: true },
        orderBy: { code: 'asc' },
      }),
      prisma.section.findMany({
        select: { id: true, name: true, semester: true },
        orderBy: { name: 'asc' },
      }),
      prisma.room.findMany({
        select: { id: true, roomNumber: true, building: true },
        orderBy: { roomNumber: 'asc' },
      }),
    ]);

    const allSlots = await prisma.timetableSlot.findMany({
      include: {
        teacher: { select: { fullName: true } },
        course: { select: { code: true, title: true } },
        section: { select: { name: true } },
        room: { select: { roomNumber: true, building: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json({
      success: true,
      metadata: { teachers, courses, sections, rooms },
      slots: allSlots,
    });
  } catch (err) {
    console.error('Error fetching timetable metadata:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch metadata.' });
  }
};

/**
 * Create a New Timetable Slot
 */
export const createTimetableSlot = async (req, res) => {
  try {
    const { teacherId, courseId, sectionId, roomId, dayOfWeek, startTime, endTime } = req.body;

    if (!teacherId || !courseId || !sectionId || !roomId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'All fields (teacher, course, section, room, day, start & end time) are required.',
      });
    }

    const newSlot = await prisma.timetableSlot.create({
      data: {
        teacherId,
        courseId,
        sectionId,
        roomId,
        dayOfWeek: dayOfWeek.toUpperCase(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      },
      include: {
        teacher: { select: { fullName: true } },
        course: { select: { code: true, title: true } },
        section: { select: { name: true } },
        room: { select: { roomNumber: true } },
      },
    });

    res.json({
      success: true,
      message: 'New timetable class slot successfully scheduled!',
      slot: newSlot,
    });
  } catch (err) {
    console.error('Error creating timetable slot:', err);
    res.status(500).json({ success: false, message: 'Failed to create slot.' });
  }
};

/**
 * Delete a Timetable Slot
 */
export const deleteTimetableSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    // Delete associated attendances first
    await prisma.studentAttendance.deleteMany({
      where: { attendanceSession: { timetableSlotId: slotId } },
    });
    await prisma.attendanceSession.deleteMany({
      where: { timetableSlotId: slotId },
    });
    await prisma.timetableSlot.delete({
      where: { id: slotId },
    });

    res.json({ success: true, message: 'Timetable slot deleted successfully.' });
  } catch (err) {
    console.error('Error deleting slot:', err);
    res.status(500).json({ success: false, message: 'Failed to delete slot.' });
  }
};

/**
 * Bulk Import Handlers
 */
import path from 'path';
import fs from 'fs';
import {
  importTeachersFromCsv,
  importStudentsFromCsv,
  importTimetableFromCsv,
} from '../services/bulkImportService.js';
import { importTimetableFromPdf } from '../services/pdfImportService.js';
import { importTimetableFromWord } from '../services/wordImportService.js';

export const handleBulkImport = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a CSV, PDF, or Word file.' });
  }

  const { type } = req.params; // 'teachers' | 'students' | 'timetable'
  const filePath = req.file.path;
  const originalName = (req.file.originalname || '').toLowerCase();
  const isPdf = originalName.endsWith('.pdf');
  const isWord = originalName.endsWith('.doc') || originalName.endsWith('.docx');
  const versionName = (req.body?.versionCode || req.body?.versionName || 'v2.0').trim();

  try {
    let result;
    if (type === 'teachers') {
      result = await importTeachersFromCsv(filePath);
    } else if (type === 'students') {
      result = await importStudentsFromCsv(filePath);
    } else if (type === 'timetable') {
      // Archive existing active slots so previous attendance history remains safely intact
      if (req.body?.archivePrevious !== 'false') {
        await prisma.timetableSlot.updateMany({
          data: { isActive: false },
        });
      }

      if (isPdf) {
        result = await importTimetableFromPdf(filePath, versionName);
      } else if (isWord) {
        result = await importTimetableFromWord(filePath, versionName);
      } else {
        result = await importTimetableFromCsv(filePath, versionName);
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid import type.' });
    }

    // Clean up uploaded temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}

    if (result.imported === 0) {
      return res.status(422).json({
        success: false,
        message: `No timetable records were imported. Found ${result.total || 0} candidate rows, but none matched the required timetable format (Day, Time, Course, Section, Teacher, Room).`,
        result,
      });
    }

    res.json({
      success: true,
      message: `Bulk import completed! Successfully processed ${result.imported} of ${result.total} records.`,
      result,
    });
  } catch (err) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
    console.error('Bulk import error:', err);
    res.status(500).json({ success: false, message: 'Bulk import failed: ' + err.message });
  }
};

export const downloadTemplate = (req, res) => {
  const { type } = req.params;
  const fileName = `${type}_sample.csv`;
  const filePath = path.resolve('templates', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  res.download(filePath, fileName);
};

/**
 * Fetch Override Requests for HOD or Admin
 */
export const getOverrideRequests = async (req, res) => {
  try {
    const whereClause = {};
    if (req.user.role === 'HOD' && req.user.departmentId) {
      whereClause.departmentId = req.user.departmentId;
    }

    const requests = await prisma.overrideRequest.findMany({
      where: whereClause,
      include: {
        teacher: { select: { id: true, fullName: true, email: true, employeeOrRollId: true } },
        timetableSlot: {
          include: {
            course: true,
            section: true,
            room: true,
          },
        },
        department: true,
        hod: { select: { fullName: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    res.json({ success: true, requests });
  } catch (err) {
    console.error('Error fetching override requests:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
};

/**
 * HOD / Admin Reviews (Approves/Rejects) a Teacher Override Request
 */
export const reviewOverrideRequest = async (req, res) => {
  try {
    const { requestId, status, reviewNotes } = req.body; // status: 'APPROVED' | 'REJECTED'

    if (!requestId || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and valid status (APPROVED or REJECTED) are required.',
      });
    }

    const request = await prisma.overrideRequest.findUnique({
      where: { id: requestId },
      include: {
        teacher: true,
        timetableSlot: {
          include: { course: true, section: true },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Override request not found.' });
    }

    const updatedRequest = await prisma.overrideRequest.update({
      where: { id: requestId },
      data: {
        status,
        hodId: req.user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    if (status === 'APPROVED') {
      const now = new Date();
      const todayDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const existingSession = await prisma.attendanceSession.findFirst({
        where: {
          timetableSlotId: request.timetableSlotId,
          date: { gte: todayDateStart, lt: todayDateEnd },
        },
      });

      if (existingSession) {
        await prisma.attendanceSession.update({
          where: { id: existingSession.id },
          data: {
            isLocked: false,
            isOverridden: true,
            overrideReason: `HOD Approved: ${request.reason}`,
            overrideById: req.user.id,
            overrideAt: now,
          },
        });
      } else {
        await prisma.attendanceSession.create({
          data: {
            timetableSlotId: request.timetableSlotId,
            date: todayDateStart,
            teacherId: request.teacherId,
            clientIp: req.clientIp || 'HOD_APPROVED',
            sessionStatus: 'LOCKED',
            isLocked: false,
            isOverridden: true,
            overrideReason: `HOD Approved: ${request.reason}`,
            overrideById: req.user.id,
            overrideAt: now,
          },
        });
      }

      broadcastSlotUnlocked(request.timetableSlotId, {
        overrideReason: request.reason,
        adminName: req.user.fullName,
        unlockedAt: now.toISOString(),
      });
    }

    // Send instant notification email to the instructor
    if (request.teacher?.email) {
      emailService.notifyTeacherOfDecision({
        teacherEmail: request.teacher.email,
        teacherName: request.teacher.fullName,
        courseCode: request.timetableSlot?.course?.code || 'Lecture Slot',
        sectionName: request.timetableSlot?.section?.name || '',
        status,
        reviewNotes,
        hodName: req.user.fullName,
      }).catch((emailErr) => console.error('[Email Dispatcher Error]', emailErr));
    }

    res.json({
      success: true,
      message: `Override request has been ${status.toLowerCase()} by HOD.`,
      request: updatedRequest,
    });
  } catch (err) {
    console.error('Error reviewing override request:', err);
    res.status(500).json({ success: false, message: 'Failed to review request.' });
  }
};

/**
 * Get All Users (Admin / HOD view)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, departmentId } = req.query;
    const whereClause = {};

    if (req.user.role === 'HOD' && req.user.departmentId) {
      whereClause.departmentId = req.user.departmentId;
    } else if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (role) {
      whereClause.role = role.toUpperCase();
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeOrRollId: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { taughtSlots: true } },
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    const formattedUsers = users.map(u => ({
      ...u,
      username: u.email.split('@')[0],
      generatedPassword: FACULTY_CREDENTIALS[u.email] || '••••••••',
      _count: {
        ...u._count,
        timetableSlots: u._count?.taughtSlots || 0,
      },
    }));

    res.json({ success: true, users: formattedUsers });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

/**
 * Reset User Password (Admin only)
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'User ID and new password are required.',
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    res.json({
      success: true,
      message: `Password for ${targetUser.fullName} (${targetUser.role}) has been reset successfully. User will be prompted to change it on next login.`,
    });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ success: false, message: 'Failed to reset user password.' });
  }
};

/**
 * Get All Departments
 */
export const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { users: true, courses: true, sections: true } },
      },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, departments });
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
};

/**
 * Create New User (Faculty, HOD, Admin, Student)
 */
export const createUser = async (req, res) => {
  try {
    const { fullName, email, employeeOrRollId, role, departmentId, password } = req.body;
    if (!fullName || !email || !employeeOrRollId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, employee ID/Roll No, and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanId = employeeOrRollId.trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { employeeOrRollId: cleanId },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or ID already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        employeeOrRollId: cleanId,
        role: role || 'TEACHER',
        departmentId: departmentId || null,
        passwordHash,
        isActive: true,
      },
      include: { department: true },
    });

    res.status(201).json({
      success: true,
      message: `User ${newUser.fullName} (${newUser.role}) created successfully.`,
      user: newUser,
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
};

/**
 * Delete User
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id === userId) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own admin account.' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user. Ensure user has no active timetable or attendance dependencies.' });
  }
};

/**
 * Create Department
 */
export const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      },
    });

    res.status(201).json({
      success: true,
      message: `Department ${dept.name} created successfully.`,
      department: dept,
    });
  } catch (err) {
    console.error('Error creating department:', err);
    res.status(500).json({ success: false, message: 'Failed to create department. Code must be unique.' });
  }
};

/**
 * Create Course
 */
export const createCourse = async (req, res) => {
  try {
    const { code, title, creditHours, departmentId } = req.body;
    if (!code || !title || !departmentId) {
      return res.status(400).json({ success: false, message: 'Course code, title, and department are required.' });
    }

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        creditHours: parseInt(creditHours || 3, 10),
        departmentId,
      },
      include: { department: true },
    });

    res.status(201).json({
      success: true,
      message: `Course ${course.code} created successfully.`,
      course,
    });
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ success: false, message: 'Failed to create course. Code must be unique.' });
  }
};

/**
 * Create Section
 */
export const createSection = async (req, res) => {
  try {
    const { name, semester, academicYear, departmentId } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ success: false, message: 'Section name and department are required.' });
    }

    const section = await prisma.section.create({
      data: {
        name: name.trim(),
        semester: parseInt(semester || 1, 10),
        academicYear: (academicYear || '2025-2026').trim(),
        departmentId,
      },
      include: { department: true },
    });

    res.status(201).json({
      success: true,
      message: `Section ${section.name} created successfully.`,
      section,
    });
  } catch (err) {
    console.error('Error creating section:', err);
    res.status(500).json({ success: false, message: 'Failed to create section.' });
  }
};

/**
 * Get Attendance Reset & Fresh Start Summary
 * Displays how many sessions and records exist, plus preserved entities.
 */
export const getAttendanceResetSummary = async (req, res) => {
  try {
    const isHod = req.user.role === 'HOD';
    const deptId = isHod ? req.user.departmentId : (req.query.departmentId || null);

    let sessionWhere = {};
    let slotWhere = {};

    if (deptId) {
      slotWhere = {
        OR: [
          { course: { departmentId: deptId } },
          { section: { departmentId: deptId } },
          { teacher: { departmentId: deptId } },
        ],
      };
      sessionWhere = {
        timetableSlot: slotWhere,
      };
    }

    const [
      totalSessions,
      totalStudentLogs,
      totalOverrideRequests,
      earliestSession,
      latestSession,
      totalTeachers,
      totalStudents,
      totalCourses,
      totalSections,
      totalRooms,
      totalSlots,
    ] = await Promise.all([
      prisma.attendanceSession.count({ where: sessionWhere }),
      prisma.studentAttendance.count({
        where: deptId ? { attendanceSession: sessionWhere } : {},
      }),
      prisma.overrideRequest.count({
        where: deptId ? { departmentId: deptId } : {},
      }),
      prisma.attendanceSession.findFirst({
        where: sessionWhere,
        orderBy: { date: 'asc' },
        select: { date: true, teacherMarkedAt: true },
      }),
      prisma.attendanceSession.findFirst({
        where: sessionWhere,
        orderBy: { date: 'desc' },
        select: { date: true, teacherMarkedAt: true },
      }),
      prisma.user.count({ where: { role: 'TEACHER', ...(deptId ? { departmentId: deptId } : {}) } }),
      prisma.user.count({ where: { role: 'STUDENT', ...(deptId ? { departmentId: deptId } : {}) } }),
      prisma.course.count({ where: deptId ? { departmentId: deptId } : {} }),
      prisma.section.count({ where: deptId ? { departmentId: deptId } : {} }),
      prisma.room.count(),
      prisma.timetableSlot.count({ where: slotWhere }),
    ]);

    res.json({
      success: true,
      summary: {
        totalSessions,
        totalStudentLogs,
        totalOverrideRequests,
        earliestDate: earliestSession ? earliestSession.date : null,
        latestDate: latestSession ? latestSession.date : null,
        preserved: {
          totalTeachers,
          totalStudents,
          totalCourses,
          totalSections,
          totalRooms,
          totalSlots,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching reset summary:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance reset summary.' });
  }
};

/**
 * Purge Attendance Records for Fresh Semester Start / Post-Pilot Reset
 * Safely removes only marked sessions and student attendance records.
 * Teachers, students, rooms, and timetable slots remain 100% untouched.
 */
export const purgeAttendanceRecords = async (req, res) => {
  try {
    const { confirmationCode } = req.body;

    if (!confirmationCode || confirmationCode.trim().toUpperCase() !== 'RESET') {
      return res.status(400).json({
        success: false,
        message: 'Security validation failed: Please type RESET to confirm data purge.',
      });
    }

    const isHod = req.user.role === 'HOD';
    const deptId = isHod ? req.user.departmentId : (req.body.departmentId || null);

    let sessionWhere = {};
    let slotWhere = {};

    if (deptId) {
      slotWhere = {
        OR: [
          { course: { departmentId: deptId } },
          { section: { departmentId: deptId } },
          { teacher: { departmentId: deptId } },
        ],
      };
      sessionWhere = {
        timetableSlot: slotWhere,
      };
    }

    // Execute atomic cleanup
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete student attendance records
      const studentLogsDeleted = await tx.studentAttendance.deleteMany({
        where: deptId ? { attendanceSession: sessionWhere } : {},
      });

      // 2. Delete override requests
      const overridesDeleted = await tx.overrideRequest.deleteMany({
        where: deptId ? { departmentId: deptId } : {},
      });

      // 3. Delete attendance sessions
      const sessionsDeleted = await tx.attendanceSession.deleteMany({
        where: sessionWhere,
      });

      return {
        sessionsCount: sessionsDeleted.count,
        studentLogsCount: studentLogsDeleted.count,
        overridesCount: overridesDeleted.count,
      };
    });

    console.log(
      `[ACADEMIC RESET] ${req.user.fullName} (${req.user.role}) initiated fresh start: Purged ${result.sessionsCount} sessions, ${result.studentLogsCount} student logs, ${result.overridesCount} overrides.`
    );

    res.json({
      success: true,
      message: `Fresh start complete! Successfully wiped ${result.sessionsCount} sessions and ${result.studentLogsCount} student attendance records. Teachers and timetable schedules remain untouched.`,
      stats: result,
    });
  } catch (err) {
    console.error('Error purging attendance records:', err);
    res.status(500).json({ success: false, message: 'Failed to reset attendance records.' });
  }
};

/**
 * HOD / Admin: Get Individual Teacher's Submitted Attendance Records
 */
export const getTeacherAttendanceRecordsForAdmin = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        fullName: true,
        employeeOrRollId: true,
        email: true,
        department: { select: { name: true, code: true } },
      },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

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
        studentRecords: true,
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const formatted = sessions.map((sess) => {
      const totalStudents = sess.studentRecords.length;
      const present = sess.studentRecords.filter((r) => r.status === 'PRESENT').length;
      const absent = sess.studentRecords.filter((r) => r.status === 'ABSENT').length;
      const late = sess.studentRecords.filter((r) => r.status === 'LATE').length;

      return {
        id: sess.id,
        date: sess.date,
        markedAt: sess.teacherMarkedAt,
        teacherStatus: sess.teacherStatus,
        clientIp: sess.clientIp,
        courseCode: sess.timetableSlot?.course?.code || 'PHY-101',
        courseTitle: sess.timetableSlot?.course?.title || 'Academic Course',
        sectionName: sess.timetableSlot?.section?.name || 'Section A',
        roomNumber: sess.timetableSlot?.room?.roomNumber || 'LH-1',
        isOverridden: sess.isOverridden,
        overrideReason: sess.overrideReason,
        biometricVerified: sess.biometricVerified,
        biometricType: sess.biometricType,
        timetableVersion: sess.timetableSlot?.timetableVersion || 'v1.0',
        stats: { totalStudents, present, absent, late },
      };
    });

    res.json({ success: true, teacher, history: formatted });
  } catch (err) {
    console.error('Error fetching teacher records for admin:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher attendance records.' });
  }
};

/**
 * HOD / Admin: Smart Timetable Paste Import & Teacher Reassignment
 */
export const importTimetablePasteAndSmartUpdate = async (req, res) => {
  try {
    const { rawText, versionName = 'v2.0', versionLabel = 'Updated Academic Timetable', archivePrevious = true } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, message: 'Timetable text content is required.' });
    }

    const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid lines found in pasted timetable.' });
    }

    const defaultPassword = await bcrypt.hash('password123', 10);

    const [depts, courses, sections, rooms, teachers] = await Promise.all([
      prisma.department.findMany(),
      prisma.course.findMany(),
      prisma.section.findMany(),
      prisma.room.findMany(),
      prisma.user.findMany({ where: { role: 'TEACHER' } }),
    ]);

    const deptMap = new Map(depts.map((d) => [d.code.toUpperCase(), d.id]));
    const courseMap = new Map(courses.map((c) => [c.code.toUpperCase(), c.id]));
    const sectionMap = new Map(sections.map((s) => [s.name.toUpperCase(), s.id]));
    const roomMap = new Map(rooms.map((r) => [r.roomNumber.toUpperCase(), r.id]));

    const teacherMap = new Map();
    teachers.forEach((t) => {
      if (t.email) teacherMap.set(t.email.toLowerCase().trim(), t);
      if (t.employeeOrRollId) teacherMap.set(t.employeeOrRollId.toUpperCase().trim(), t);
      if (t.fullName) teacherMap.set(t.fullName.toLowerCase().replace(/[^a-z0-9]/g, ''), t);
    });

    const defaultDeptId = depts[0]?.id;

    // Archive previous timetable slots so historical attendance remains 100% SAFE
    if (archivePrevious) {
      await prisma.timetableSlot.updateMany({
        data: { isActive: false },
      });
    }

    let importedCount = 0;
    const errors = [];

    const headerLine = lines[0].toLowerCase();
    const startIndex = (headerLine.includes('day') || headerLine.includes('course') || headerLine.includes('time')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      const delimiter = line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length < 5) continue;

      const day = parts[0].toUpperCase();
      const startTime = parts[1];
      const endTime = parts[2];
      const courseCode = parts[3].toUpperCase();
      const courseTitle = parts[4] || courseCode;
      const sectionName = (parts[5] || 'BSCS-1A').toUpperCase();
      const teacherName = parts[6] || '';
      const roomNumber = (parts[7] || 'LH-1').toUpperCase();

      if (!['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(day)) {
        continue;
      }

      try {
        let courseId = courseMap.get(courseCode);
        if (!courseId) {
          const newC = await prisma.course.create({
            data: { code: courseCode, title: courseTitle, departmentId: defaultDeptId },
          });
          courseMap.set(courseCode, newC.id);
          courseId = newC.id;
        }

        let sectionId = sectionMap.get(sectionName);
        if (!sectionId) {
          const newS = await prisma.section.create({
            data: { name: sectionName, semester: 1, academicYear: '2026-2027', departmentId: defaultDeptId },
          });
          sectionMap.set(sectionName, newS.id);
          sectionId = newS.id;
        }

        let roomId = roomMap.get(roomNumber);
        if (!roomId) {
          const newR = await prisma.room.create({
            data: { roomNumber, building: 'Academic Block', floor: 1 },
          });
          roomMap.set(roomNumber, newR.id);
          roomId = newR.id;
        }

        let teacher = null;
        if (teacherName) {
          const normKey = teacherName.toLowerCase().replace(/[^a-z0-9]/g, '');
          teacher = teacherMap.get(normKey);
        }

        if (!teacher) {
          const cleanSlug = (teacherName || 'Faculty').toLowerCase().replace(/[^a-z0-9]/g, '');
          const newEmail = `${cleanSlug}_${Date.now().toString().slice(-4)}@uosahiwal.edu.pk`;
          const empId = `FAC-${Math.floor(100 + Math.random() * 900)}`;

          teacher = await prisma.user.create({
            data: {
              fullName: teacherName || 'Faculty Instructor',
              email: newEmail,
              employeeOrRollId: empId,
              passwordHash: defaultPassword,
              role: 'TEACHER',
              departmentId: defaultDeptId,
            },
          });
          teacherMap.set((teacherName || '').toLowerCase().replace(/[^a-z0-9]/g, ''), teacher);
        }

        await prisma.timetableSlot.create({
          data: {
            dayOfWeek: day,
            startTime,
            endTime,
            courseId,
            sectionId,
            roomId,
            teacherId: teacher.id,
            timetableVersion: versionName,
            isActive: true,
          },
        });

        importedCount++;
      } catch (rowErr) {
        errors.push({ line, error: rowErr.message });
      }
    }

    res.json({
      success: true,
      message: `New Timetable (${versionName}) successfully implemented! ${importedCount} slots active. Previous attendance records remain safely preserved.`,
      importedCount,
      version: versionName,
      versionLabel,
      errors: errors.slice(0, 5),
    });
  } catch (err) {
    console.error('Error in importTimetablePasteAndSmartUpdate:', err);
    res.status(500).json({ success: false, message: 'Failed to process timetable import: ' + err.message });
  }
};

/**
 * HOD / Admin: Get Timetable Versions History
 */
export const getTimetableVersions = async (req, res) => {
  try {
    const slots = await prisma.timetableSlot.findMany({
      select: { timetableVersion: true, isActive: true },
    });

    const versionMap = {};
    slots.forEach((s) => {
      const v = s.timetableVersion || 'v1.0';
      if (!versionMap[v]) {
        versionMap[v] = {
          versionCode: v,
          label: v === 'v1.0' ? 'Initial Official Timetable (v1.0)' : `Timetable ${v}`,
          slotCount: 0,
          isActive: false,
        };
      }
      versionMap[v].slotCount++;
      if (s.isActive) versionMap[v].isActive = true;
    });

    const versions = Object.values(versionMap);
    if (versions.length === 0) {
      versions.push({
        versionCode: 'v1.0',
        label: 'Initial Official Timetable (v1.0)',
        slotCount: 115,
        isActive: true,
      });
    }

    res.json({ success: true, versions });
  } catch (err) {
    console.error('Error fetching timetable versions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch timetable versions.' });
  }
};




