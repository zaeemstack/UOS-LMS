import prisma from '../config/db.js';

/**
 * Generate Comprehensive Attendance Report
 * Supports filtering by departmentId, sectionId, courseId, startDate, endDate
 */
export const getAttendanceSummaryReport = async (req, res) => {
  try {
    const { departmentId, sectionId, courseId, startDate, endDate } = req.query;

    // Scope check: If requester is HOD, restrict to their department
    let targetDeptId = departmentId;
    if (req.user.role === 'HOD' && req.user.departmentId) {
      targetDeptId = req.user.departmentId;
    }

    // Build Date Filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      };
    } else {
      // Default: Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = {
        date: {
          gte: thirtyDaysAgo,
        },
      };
    }

    // 1. Find all matching sections and courses
    const sectionWhere = {};
    if (sectionId) sectionWhere.id = sectionId;
    if (targetDeptId) sectionWhere.departmentId = targetDeptId;

    const sections = await prisma.section.findMany({
      where: sectionWhere,
      include: {
        department: true,
        students: {
          include: {
            student: {
              select: { id: true, fullName: true, employeeOrRollId: true, email: true },
            },
          },
        },
        slots: {
          where: courseId ? { courseId } : {},
          include: {
            course: true,
            teacher: { select: { id: true, fullName: true, employeeOrRollId: true } },
            sessions: {
              where: dateFilter,
              include: {
                studentRecords: true,
              },
            },
          },
        },
      },
    });

    const report = [];

    for (const section of sections) {
      for (const slot of section.slots) {
        const totalSessionsConducted = slot.sessions.length;

        // Tally per-student attendance
        const studentStats = section.students.map(({ student }) => {
          let presentCount = 0;
          let absentCount = 0;
          let lateCount = 0;
          let excusedCount = 0;

          slot.sessions.forEach((session) => {
            const record = session.studentRecords.find((r) => r.studentId === student.id);
            if (record) {
              if (record.status === 'PRESENT') presentCount++;
              else if (record.status === 'ABSENT') absentCount++;
              else if (record.status === 'LATE') lateCount++;
              else if (record.status === 'EXCUSED') excusedCount++;
            } else {
              absentCount++;
            }
          });

          const attendedCount = presentCount + lateCount;
          const percentage = totalSessionsConducted > 0
            ? Math.round((attendedCount / totalSessionsConducted) * 100)
            : 0;

          return {
            studentId: student.id,
            rollNumber: student.employeeOrRollId,
            fullName: student.fullName,
            email: student.email,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            totalAttended: attendedCount,
            percentage,
            isShortAttendance: percentage < 75,
          };
        });

        const overallAttendedTally = studentStats.reduce((acc, s) => acc + s.percentage, 0);
        const avgSectionPercentage = studentStats.length > 0
          ? Math.round(overallAttendedTally / studentStats.length)
          : 0;

        report.push({
          slotId: slot.id,
          department: section.department.name,
          departmentCode: section.department.code,
          sectionName: section.name,
          semester: section.semester,
          academicYear: section.academicYear,
          courseCode: slot.course.code,
          courseTitle: slot.course.title,
          creditHours: slot.course.creditHours,
          teacherName: slot.teacher.fullName,
          teacherId: slot.teacher.employeeOrRollId,
          totalLecturesConducted: totalSessionsConducted,
          totalEnrolledStudents: studentStats.length,
          averageAttendanceRate: avgSectionPercentage,
          shortAttendanceCount: studentStats.filter((s) => s.isShortAttendance).length,
          students: studentStats,
        });
      }
    }

    res.json({
      success: true,
      count: report.length,
      report,
    });
  } catch (err) {
    console.error('Error generating attendance summary report:', err);
    res.status(500).json({ success: false, message: 'Failed to generate attendance report.' });
  }
};

/**
 * Export Attendance Report as CSV Stream
 */
export const exportAttendanceReportCsv = async (req, res) => {
  try {
    const { departmentId, sectionId, courseId, startDate, endDate } = req.query;

    let targetDeptId = departmentId;
    if (req.user.role === 'HOD' && req.user.departmentId) {
      targetDeptId = req.user.departmentId;
    }

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      };
    }

    const sectionWhere = {};
    if (sectionId) sectionWhere.id = sectionId;
    if (targetDeptId) sectionWhere.departmentId = targetDeptId;

    const sections = await prisma.section.findMany({
      where: sectionWhere,
      include: {
        department: true,
        students: {
          include: {
            student: { select: { id: true, fullName: true, employeeOrRollId: true, email: true } },
          },
        },
        slots: {
          where: courseId ? { courseId } : {},
          include: {
            course: true,
            teacher: { select: { fullName: true, employeeOrRollId: true } },
            sessions: {
              where: dateFilter,
              include: { studentRecords: true },
            },
          },
        },
      },
    });

    const csvRows = [];
    csvRows.push([
      'Department',
      'Semester',
      'Section',
      'Course Code',
      'Course Title',
      'Teacher',
      'Student Roll No',
      'Student Name',
      'Total Conducted',
      'Present',
      'Absent',
      'Late',
      'Attendance %',
      'Eligibility (75% Rule)',
    ].join(','));

    for (const section of sections) {
      for (const slot of section.slots) {
        const totalSessions = slot.sessions.length;

        section.students.forEach(({ student }) => {
          let presentCount = 0;
          let absentCount = 0;
          let lateCount = 0;

          slot.sessions.forEach((session) => {
            const record = session.studentRecords.find((r) => r.studentId === student.id);
            if (record) {
              if (record.status === 'PRESENT') presentCount++;
              else if (record.status === 'ABSENT') absentCount++;
              else if (record.status === 'LATE') lateCount++;
            } else {
              absentCount++;
            }
          });

          const attended = presentCount + lateCount;
          const pct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
          const status = pct >= 75 ? 'ELIGIBLE' : 'SHORT ATTENDANCE (DETAINED)';

          csvRows.push([
            `"${section.department.name}"`,
            section.semester,
            `"${section.name}"`,
            `"${slot.course.code}"`,
            `"${slot.course.title}"`,
            `"${slot.teacher.fullName}"`,
            `"${student.employeeOrRollId}"`,
            `"${student.fullName}"`,
            totalSessions,
            presentCount,
            absentCount,
            lateCount,
            `"${pct}%"`,
            `"${status}"`,
          ].join(','));
        });
      }
    }

    const filename = `UOS_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvRows.join('\n'));
  } catch (err) {
    console.error('Error exporting attendance report CSV:', err);
    res.status(500).send('Failed to export CSV.');
  }
};

/**
 * Master Faculty Attendance Audit Ledger
 * Returns clean chronological records of which teacher submitted attendance,
 * for what course, section, date, exact timestamp, IP, and student counts.
 */
export const getFacultyAttendanceAuditLedger = async (req, res) => {
  try {
    const { teacherId, departmentId, courseId, startDate, endDate, search } = req.query;

    let targetDeptId = departmentId;
    if (req.user.role === 'HOD' && req.user.departmentId) {
      targetDeptId = req.user.departmentId;
    }

    const where = {};

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (targetDeptId) {
      where.timetableSlot = {
        OR: [
          { course: { departmentId: targetDeptId } },
          { section: { departmentId: targetDeptId } },
          { teacher: { departmentId: targetDeptId } },
        ],
      };
    }

    if (courseId) {
      where.timetableSlot = {
        ...(where.timetableSlot || {}),
        courseId,
      };
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { teacherMarkedAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            employeeOrRollId: true,
            email: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
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
    });

    let records = sessions.map((s) => {
      const totalStudents = s.studentRecords.length;
      const presentCount = s.studentRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = s.studentRecords.filter((r) => r.status === 'ABSENT').length;
      const lateCount = s.studentRecords.filter((r) => r.status === 'LATE').length;
      const attended = presentCount + lateCount;
      const attendanceRate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;

      return {
        id: s.id,
        slotId: s.timetableSlotId,
        date: s.date,
        markedAt: s.teacherMarkedAt,
        teacherStatus: s.teacherStatus,
        clientIp: s.clientIp,
        connectedRouterMac: s.connectedRouterMac,
        biometricVerified: s.biometricVerified,
        biometricType: s.biometricType,
        teacher: {
          id: s.teacher.id,
          name: s.teacher.fullName,
          employeeId: s.teacher.employeeOrRollId,
          email: s.teacher.email,
          department: s.teacher.department?.name || 'Department of Physics',
        },
        course: {
          code: s.timetableSlot.course.code,
          title: s.timetableSlot.course.title,
          creditHours: s.timetableSlot.course.creditHours,
        },
        section: {
          name: s.timetableSlot.section.name,
          semester: s.timetableSlot.section.semester,
          academicYear: s.timetableSlot.section.academicYear,
        },
        room: {
          roomNumber: s.timetableSlot.room.roomNumber,
          building: s.timetableSlot.room.building,
        },
        stats: {
          totalStudents,
          presentCount,
          absentCount,
          lateCount,
          attendanceRate,
        },
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          r.teacher.name.toLowerCase().includes(q) ||
          r.teacher.employeeId.toLowerCase().includes(q) ||
          r.course.code.toLowerCase().includes(q) ||
          r.course.title.toLowerCase().includes(q) ||
          r.section.name.toLowerCase().includes(q) ||
          r.room.roomNumber.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (err) {
    console.error('Error fetching faculty attendance audit ledger:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance audit ledger.' });
  }
};

/**
 * Get Faculty Semester Summary
 * Provides an overview of each teacher with total classes marked and average attendance,
 * plus a 1-click CSV export action.
 */
export const getFacultySemesterSummary = async (req, res) => {
  try {
    const { departmentId } = req.query;

    let targetDeptId = departmentId;
    if (req.user.role === 'HOD' && req.user.departmentId) {
      targetDeptId = req.user.departmentId;
    }

    const teacherWhere = { role: 'TEACHER' };
    if (targetDeptId) {
      teacherWhere.departmentId = targetDeptId;
    }

    const teachers = await prisma.user.findMany({
      where: teacherWhere,
      include: {
        department: true,
        taughtSlots: {
          include: {
            course: true,
            section: true,
            room: true,
            sessions: {
              include: {
                studentRecords: true,
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const summary = teachers.map((teacher) => {
      let totalSessions = 0;
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      let totalStudentLogs = 0;
      let lastMarkedAt = null;

      const coursesMap = new Map();

      teacher.taughtSlots.forEach((slot) => {
        coursesMap.set(slot.course.id, {
          code: slot.course.code,
          title: slot.course.title,
          section: slot.section.name,
        });

        slot.sessions.forEach((sess) => {
          totalSessions++;
          if (!lastMarkedAt || new Date(sess.teacherMarkedAt) > new Date(lastMarkedAt)) {
            lastMarkedAt = sess.teacherMarkedAt;
          }

          sess.studentRecords.forEach((rec) => {
            totalStudentLogs++;
            if (rec.status === 'PRESENT') totalPresent++;
            else if (rec.status === 'ABSENT') totalAbsent++;
            else if (rec.status === 'LATE') totalLate++;
          });
        });
      });

      const attended = totalPresent + totalLate;
      const averageRate = totalStudentLogs > 0 ? Math.round((attended / totalStudentLogs) * 100) : 0;

      return {
        id: teacher.id,
        name: teacher.fullName,
        email: teacher.email,
        employeeId: teacher.employeeOrRollId,
        department: teacher.department?.name || 'Department of Physics',
        totalSlots: teacher.taughtSlots.length,
        totalSessions,
        totalStudentLogs,
        averageRate,
        lastMarkedAt,
        courses: Array.from(coursesMap.values()),
      };
    });

    res.json({
      success: true,
      count: summary.length,
      teachers: summary,
    });
  } catch (err) {
    console.error('Error fetching faculty semester summary:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch faculty summary.' });
  }
};

/**
 * 1-Click Export: Specific Teacher Entire Semester Attendance (CSV)
 * Downloads a complete, beautifully structured Excel/CSV file with all classes
 * conducted by this teacher across the semester.
 */
export const exportSingleTeacherSemesterCsv = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        department: true,
        taughtSlots: {
          include: {
            course: true,
            section: true,
            room: true,
            sessions: {
              orderBy: { teacherMarkedAt: 'asc' },
              include: {
                studentRecords: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return res.status(404).send('Faculty member not found.');
    }

    // Flatten all sessions marked by this teacher
    const allSessions = [];
    teacher.taughtSlots.forEach((slot) => {
      slot.sessions.forEach((sess) => {
        allSessions.push({
          slot,
          session: sess,
        });
      });
    });

    allSessions.sort((a, b) => new Date(a.session.teacherMarkedAt) - new Date(b.session.teacherMarkedAt));

    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const csvRows = [];

    // Header Metadata
    csvRows.push([escapeCsv('UNIVERSITY OF SAHIWAL - FACULTY ATTENDANCE SEMESTER AUDIT LEDGER')]);
    csvRows.push([escapeCsv(`Faculty Member: ${teacher.fullName}`), escapeCsv(`Employee ID: ${teacher.employeeOrRollId}`), escapeCsv(`Department: ${teacher.department?.name || 'Physics'}`)]);
    csvRows.push([escapeCsv(`Official Email: ${teacher.email}`), escapeCsv(`Total Classes Conducted: ${allSessions.length}`), escapeCsv(`Generated At: ${new Date().toLocaleString()}`)]);
    csvRows.push([]); // blank line

    // Column Headers
    csvRows.push([
      'Sr #',
      'Lecture Date',
      'Submission Time',
      'Course Code',
      'Course Title',
      'Student Section',
      'Classroom / Lab',
      'Enrolled Students',
      'Present Count',
      'Absent Count',
      'Late Count',
      'Lecture Attendance Rate',
      'Teacher Biometric Status',
      'Client Gateway IP',
    ].join(','));

    let totalStudentsAll = 0;
    let totalPresentAll = 0;

    allSessions.forEach((item, index) => {
      const s = item.session;
      const slot = item.slot;
      const totalStudents = s.studentRecords.length;
      const presentCount = s.studentRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = s.studentRecords.filter((r) => r.status === 'ABSENT').length;
      const lateCount = s.studentRecords.filter((r) => r.status === 'LATE').length;
      const attended = presentCount + lateCount;
      const rate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;

      totalStudentsAll += totalStudents;
      totalPresentAll += attended;

      const dateStr = new Date(s.date).toLocaleDateString();
      const timeStr = new Date(s.teacherMarkedAt).toLocaleTimeString();
      const bioText = s.biometricVerified ? `Verified (${s.biometricType || 'Thumbprint'})` : 'Standard Verification';

      csvRows.push([
        index + 1,
        escapeCsv(dateStr),
        escapeCsv(timeStr),
        escapeCsv(slot.course.code),
        escapeCsv(slot.course.title),
        escapeCsv(slot.section.name),
        escapeCsv(`${slot.room.roomNumber} (${slot.room.building})`),
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        escapeCsv(`${rate}%`),
        escapeCsv(bioText),
        escapeCsv(s.clientIp),
      ].join(','));
    });

    const overallAvg = totalStudentsAll > 0 ? Math.round((totalPresentAll / totalStudentsAll) * 100) : 0;
    csvRows.push([]);
    csvRows.push([
      escapeCsv('OVERALL SEMESTER SUMMARY:'),
      escapeCsv(`${allSessions.length} Total Lectures`),
      '',
      '',
      '',
      '',
      '',
      totalStudentsAll,
      totalPresentAll,
      totalStudentsAll - totalPresentAll,
      '',
      escapeCsv(`${overallAvg}% Cumulative Attendance`),
      escapeCsv('OFFICIALLY CERTIFIED RECORD'),
      '',
    ].join(','));

    // UTF-8 BOM so Excel opens cleanly
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const safeTeacherName = teacher.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTeacherName}_Semester_Attendance_Ledger.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error exporting teacher semester CSV:', err);
    res.status(500).send('Failed to export teacher attendance CSV.');
  }
};

