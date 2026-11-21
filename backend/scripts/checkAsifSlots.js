import prisma from '../src/config/db.js';

async function main() {
  const asif = await prisma.user.findFirst({
    where: { email: 'dr.asif@uosahiwal.edu.pk' },
    include: { taughtSlots: { include: { course: true, section: true, room: true } } }
  });
  console.log('Dr. Asif User:', asif?.id, asif?.fullName, asif?.role);
  console.log('Taught Slots count:', asif?.taughtSlots?.length);
  asif?.taughtSlots?.forEach(s => console.log('Slot:', s.dayOfWeek, s.startTime, s.endTime, s.course.code, s.section.name, s.room.roomNumber));

  const allAsifs = await prisma.user.findMany({ where: { fullName: { contains: 'Asif' } } });
  console.log('\nAll Asifs in DB:', allAsifs.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.fullName })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
