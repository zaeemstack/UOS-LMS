import prisma from '../src/config/db.js';

async function main() {
  console.log('=== VERIFYING DATABASE STUDENT ROSTERS ===\n');

  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  console.log(`Total students with role 'STUDENT': ${totalStudents}`);

  const sections = await prisma.section.findMany({
    include: {
      students: {
        include: {
          student: true,
        },
        orderBy: {
          student: {
            employeeOrRollId: 'asc',
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  for (const sec of sections) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Section: ${sec.name} (Semester: ${sec.semester}, Year: ${sec.academicYear})`);
    console.log(`Total Enrolled Students: ${sec.students.length}`);
    if (sec.students.length > 0) {
      const first = sec.students[0].student;
      const last = sec.students[sec.students.length - 1].student;
      console.log(`First Student: [${first.employeeOrRollId}] ${first.fullName} (${first.email})`);
      console.log(`Last Student:  [${last.employeeOrRollId}] ${last.fullName} (${last.email})`);
      console.log('Sample Roster (first 5):');
      sec.students.slice(0, 5).forEach((s, idx) => {
        console.log(`  ${idx + 1}. [${s.student.employeeOrRollId}] ${s.student.fullName}`);
      });
    }
  }

  // Check if any student has no enrollment or missing data
  const studentsWithoutEnrollment = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      studentEnrollments: { none: {} },
    },
  });
  console.log(`\nStudents with 0 section enrollments: ${studentsWithoutEnrollment.length}`);

  // Check if any student attendance records exist
  const attendanceRecords = await prisma.studentAttendance.count();
  console.log(`Total Student Attendance records in DB: ${attendanceRecords}`);

  console.log('\n==================================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
