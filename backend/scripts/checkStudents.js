import prisma from '../src/config/db.js';

async function main() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    take: 5
  });
  console.log(students.map(s => ({ email: s.email, name: s.fullName, roll: s.employeeOrRollId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
