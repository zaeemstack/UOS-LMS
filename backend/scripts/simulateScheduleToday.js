import prisma from '../src/config/db.js';
import { evaluateSlotStatus } from '../src/services/lockEngineService.js';

async function main() {
  console.log('===============================================================');
  console.log(' UOS Attendance: Timetable Lock Engine Status Inspector');
  console.log('===============================================================');

  const now = new Date();
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const today = days[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  console.log(`Current Day:  ${today}`);
  console.log(`Current Time: ${currentTimeStr} (${now.toLocaleTimeString()})`);
  console.log(`Lock Mode:    ${process.env.BYPASS_TIMETABLE_LOCK === 'true' ? 'BYPASS_OPEN (Testing Mode)' : 'STRICT_LOCK (Production Mode)'}`);
  console.log('---------------------------------------------------------------\n');

  const allSlots = await prisma.timetableSlot.findMany({
    include: {
      course: true,
      section: true,
      teacher: true,
      room: true,
    },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' },
    ],
  });

  console.log(`Total Timetable Slots in System: ${allSlots.length}`);

  const todaySlots = allSlots.filter((s) => s.dayOfWeek.toUpperCase() === today);
  console.log(`Slots Scheduled for Today (${today}): ${todaySlots.length}\n`);

  if (todaySlots.length > 0) {
    console.log('Status of Today\'s Classes:');
    todaySlots.forEach((slot, idx) => {
      const evalStatus = evaluateSlotStatus(slot, null, now);
      console.log(
        `${idx + 1}. [${slot.startTime} - ${slot.endTime}] ${slot.course.code}: ${slot.course.title}`
      );
      console.log(`   Section: ${slot.section.name} | Room: ${slot.room.roomNumber} | Teacher: ${slot.teacher.fullName}`);
      console.log(`   Status:  [${evalStatus.status}] | Can Mark: ${evalStatus.canMark}`);
      if (evalStatus.lockReason) {
        console.log(`   Reason:  ${evalStatus.lockReason}`);
      }
      if (evalStatus.windowNotice) {
        console.log(`   Notice:  ${evalStatus.windowNotice}`);
      }
      console.log('');
    });
  } else {
    console.log(`No official classes are scheduled on ${today} in the timetable.`);
  }

  console.log('===============================================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
