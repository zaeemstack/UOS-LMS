import prisma from '../src/config/db.js';
import { evaluateSlotStatus } from '../src/services/lockEngineService.js';

async function main() {
  const now = new Date();
  console.log('Current System Time:', now.toString(), '| Day Index:', now.getDay(), '| Hours:', now.getHours(), '| Mins:', now.getMinutes());

  const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = DAYS[now.getDay()];
  const slots = await prisma.timetableSlot.findMany({
    where: { dayOfWeek: dayName },
    include: { course: true, section: true, room: true, teacher: true }
  });
  console.log('Slots today (' + dayName + '):', slots.length);
  slots.slice(0, 10).forEach(s => {
    const evalResult = evaluateSlotStatus(s);
    console.log(s.teacher.fullName, '|', s.course.code, s.startTime, '-', s.endTime, '| Status:', evalResult.status, '| canMark:', evalResult.canMark, '| reason:', evalResult.lockReason || evalResult.windowNotice);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
