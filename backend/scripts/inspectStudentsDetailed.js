import prisma from '../src/config/db.js';

async function main() {
  const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });
  const attendanceCount = await prisma.studentAttendance.count();
  const enrollmentCount = await prisma.studentSection.count();
  const sections = await prisma.section.findMany({
    select: {
      id: true,
      name: true,
      semester: true,
      academicYear: true,
      _count: { select: { students: true, slots: true } }
    }
  });
  console.log('Student count:', studentCount);
  console.log('Attendance records:', attendanceCount);
  console.log('Enrollments:', enrollmentCount);
  console.log('Sections:');
  sections.forEach(s => {
    console.log(`- ${s.name} (Semester: ${s.semester}, Year: ${s.academicYear}, Students: ${s._count.students}, Slots: ${s._count.slots})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
