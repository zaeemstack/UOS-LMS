import prisma from '../config/db.js';
import { evaluateSlotStatus } from '../services/lockEngineService.js';

const DAYS_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Returns today's scheduled classes for the authenticated teacher,
 * decorated with the current lock/unlock evaluation status.
 */
export const getTeacherTodaySchedule = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const now = new Date();
    const systemTodayDay = DAYS_MAP[now.getDay()];

    // Optional query parameter ?day=MONDAY or ?day=ALL
    const reqDay = req.query.day ? req.query.day.toUpperCase() : null;
    const isAllDays = reqDay === 'ALL';
    const targetDay = reqDay && reqDay !== 'ALL' && DAYS_MAP.includes(reqDay) ? reqDay : systemTodayDay;

    const whereClause = { teacherId };
    if (!isAllDays) {
      whereClause.dayOfWeek = targetDay;
    }

    // Today's date normalized to midnight UTC/local
    const todayDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Fetch slots for this teacher
    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: {
        course: true,
        section: {
          include: {
            _count: { select: { students: true } },
          },
        },
        room: true,
        sessions: {
          where: {
            date: {
              gte: todayDateStart,
              lt: todayDateEnd,
            },
          },
          include: {
            overrideBy: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Decorate each slot with real-time lock status
    const evaluatedSlots = slots.map((slot) => {
      const todaySession = slot.sessions[0] || null;
      const statusEvaluation = evaluateSlotStatus(slot, todaySession);

      return {
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        course: {
          id: slot.course.id,
          code: slot.course.code,
          title: slot.course.title,
        },
        section: {
          id: slot.section.id,
          name: slot.section.name,
          studentCount: slot.section._count.students,
        },
        room: {
          id: slot.room.id,
          roomNumber: slot.room.roomNumber,
          building: slot.room.building,
        },
        session: todaySession
          ? {
              id: todaySession.id,
              teacherStatus: todaySession.teacherStatus,
              teacherMarkedAt: todaySession.teacherMarkedAt,
              clientIp: todaySession.clientIp,
              isLocked: todaySession.isLocked,
              isOverridden: todaySession.isOverridden,
              overrideReason: todaySession.overrideReason,
              overrideBy: todaySession.overrideBy?.fullName || null,
            }
          : null,
        lockEvaluation: statusEvaluation,
      };
    });

    res.json({
      success: true,
      currentDay: targetDay,
      systemDay: systemTodayDay,
      isAllDays,
      serverTime: now.toISOString(),
      clientIp: req.clientIp,
      slots: evaluatedSlots,
    });
  } catch (err) {
    console.error('Error fetching teacher schedule:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule.' });
  }
};

/**
 * Returns slot info and student roster for marking attendance.
 */
export const getSlotRosterForMarking = async (req, res) => {
  try {
    const { slotId } = req.params;
    const now = new Date();
    const todayDateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: {
        course: true,
        section: {
          include: {
            students: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    employeeOrRollId: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                student: { employeeOrRollId: 'asc' },
              },
            },
          },
        },
        room: true,
        teacher: {
          select: { id: true, fullName: true, employeeOrRollId: true },
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
          },
        },
      },
    });

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found.' });
    }

    // Ensure teacher owns this slot (unless admin)
    if (req.user.role === 'TEACHER' && slot.teacherId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
    }

    const todaySession = slot.sessions[0] || null;
    const lockEvaluation = evaluateSlotStatus(slot, todaySession);

    // Prepare student roster with existing attendance status if session was created
    const existingRecordsMap = new Map();
    if (todaySession?.studentRecords) {
      todaySession.studentRecords.forEach((rec) => {
        existingRecordsMap.set(rec.studentId, rec.status);
      });
    }

    const students = slot.section.students.map((entry) => ({
      id: entry.student.id,
      rollNumber: entry.student.employeeOrRollId,
      fullName: entry.student.fullName,
      email: entry.student.email,
      status: existingRecordsMap.get(entry.student.id) || 'PRESENT', // default to PRESENT for fast marking
    }));

    res.json({
      success: true,
      slot: {
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        course: slot.course,
        section: {
          id: slot.section.id,
          name: slot.section.name,
        },
        room: slot.room,
        teacher: slot.teacher,
      },
      lockEvaluation,
      alreadySubmitted: todaySession?.sessionStatus === 'COMPLETED',
      sessionInfo: todaySession
        ? {
            id: todaySession.id,
            teacherMarkedAt: todaySession.teacherMarkedAt,
            clientIp: todaySession.clientIp,
            isOverridden: todaySession.isOverridden,
          }
        : null,
      students,
    });
  } catch (err) {
    console.error('Error fetching slot roster:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch roster.' });
  }
};
