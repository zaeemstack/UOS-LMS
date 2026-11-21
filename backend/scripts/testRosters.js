import prisma from '../src/config/db.js';

async function main() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'zaeem@uosahiwal.edu.pk', password: 'zaeem123' })
  });
  const { token } = await loginRes.json();

  const sec1Slot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY1-A' } }, select: { id: true, course: true, section: true } });
  const sec3Slot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY3-A' } }, select: { id: true, course: true, section: true } });
  const sec5Slot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY5-A' } }, select: { id: true, course: true, section: true } });
  const sec7Slot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY7-A' } }, select: { id: true, course: true, section: true } });
  const sec7SSPSlot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY7-A (Special SSP-I)' } }, select: { id: true, course: true, section: true } });
  const sec7LaserSlot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY7-A (Lasers Physics-I)' } }, select: { id: true, course: true, section: true } });
  const sec7DLDSlot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'BS.PHY7-A (Digital Electronics-I)' } }, select: { id: true, course: true, section: true } });
  const mphilSlot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'MPHIL.PHY1-SS' } }, select: { id: true, course: true, section: true } });
  const mphilASlot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'MPHIL.PHY1-SS (Group A)' } }, select: { id: true, course: true, section: true } });
  const mphilBSlot = await prisma.timetableSlot.findFirst({ where: { section: { name: 'MPHIL.PHY1-SS (Group B)' } }, select: { id: true, course: true, section: true } });

  const slotsToTest = [sec1Slot, sec3Slot, sec5Slot, sec7Slot, sec7SSPSlot, sec7LaserSlot, sec7DLDSlot, mphilSlot, mphilASlot, mphilBSlot].filter(Boolean);

  for (const s of slotsToTest) {
    const res = await fetch('http://localhost:5000/api/timetable/slot/' + s.id + '/roster', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    console.log(`\nSection: ${s.section.name} | Course: ${s.course.code} - ${s.course.title}`);
    console.log(`Total Students in Roster: ${data.students?.length}`);
    if (data.students && data.students.length > 0) {
      console.log(`   First: [${data.students[0].rollNumber}] ${data.students[0].fullName}`);
      console.log(`   Last:  [${data.students[data.students.length - 1].rollNumber}] ${data.students[data.students.length - 1].fullName}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
