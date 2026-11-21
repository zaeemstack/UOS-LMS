import prisma from '../src/config/db.js';

async function main() {
  const sections = await prisma.section.findMany({
    include: {
      department: true,
      _count: { select: { students: true, slots: true } }
    }
  });
  console.log('Total sections:', sections.length);
  sections.forEach(s => {
    console.log(s.id, '|', s.name, '| Sem:', s.semester, '| Year:', s.academicYear, '| Dept:', s.department.code, '| Students:', s._count.students, '| Slots:', s._count.slots);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
