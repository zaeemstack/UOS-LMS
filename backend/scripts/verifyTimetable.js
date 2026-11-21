import prisma from '../src/config/db.js';

async function main() {
  const thuSlots = await prisma.timetableSlot.findMany({
    where: { dayOfWeek: 'THURSDAY', startTime: '11:00' },
    include: { course: true, section: true, room: true, teacher: true }
  });
  console.log('--- Simultaneous Thursday 11:00 Slots ---');
  thuSlots.forEach(s => {
    console.log(`[${s.room.roomNumber}] (Router: ${s.room.routerIp}) | ${s.course.code}: ${s.course.title} | Section: ${s.section.name} | Teacher: ${s.teacher.fullName}`);
  });

  const friSlots = await prisma.timetableSlot.findMany({
    where: { dayOfWeek: 'FRIDAY', startTime: '10:00' },
    include: { course: true, section: true, room: true, teacher: true }
  });
  console.log('\n--- Simultaneous Friday 10:00 Slots ---');
  friSlots.forEach(s => {
    console.log(`[${s.room.roomNumber}] (Router: ${s.room.routerIp}) | ${s.course.code}: ${s.course.title} | Section: ${s.section.name} | Teacher: ${s.teacher.fullName}`);
  });

  const monEvening = await prisma.timetableSlot.findMany({
    where: { dayOfWeek: 'MONDAY', startTime: '16:00' },
    include: { course: true, section: true, room: true, teacher: true }
  });
  console.log('\n--- Simultaneous Monday 16:00 MPhil Slots ---');
  monEvening.forEach(s => {
    console.log(`[${s.room.roomNumber}] (Router: ${s.room.routerIp}) | ${s.course.code}: ${s.course.title} | Section: ${s.section.name} | Teacher: ${s.teacher.fullName}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
