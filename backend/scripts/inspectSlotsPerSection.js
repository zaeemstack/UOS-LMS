import prisma from '../src/config/db.js';

async function main() {
  const sections = await prisma.section.findMany({
    include: {
      slots: {
        include: {
          course: true,
          teacher: true
        }
      }
    }
  });

  for (const s of sections) {
    console.log(`\nSection: ${s.name} (Semester: ${s.semester}, ID: ${s.id})`);
    console.log(`Slots count: ${s.slots.length}`);
    const uniqueCourses = [...new Set(s.slots.map(slot => `${slot.course.code}: ${slot.course.title}`))];
    console.log('Courses:', uniqueCourses);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
