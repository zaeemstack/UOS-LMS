import prisma from '../src/config/db.js';

async function main() {
  const sections = await prisma.section.findMany({
    where: {
      name: { in: ['BS.PHY1-A', 'BS.PHY3-A', 'BS.PHY5-A'] }
    },
    include: {
      students: {
        include: {
          student: true
        }
      }
    }
  });

  for (const sec of sections) {
    const studentIds = sec.students.map(s => s.studentId);
    const attendanceCount = await prisma.studentAttendance.count({
      where: { studentId: { in: studentIds } }
    });
    console.log(`Section ${sec.name}: ${sec.students.length} current enrollments, ${attendanceCount} student attendance records.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
