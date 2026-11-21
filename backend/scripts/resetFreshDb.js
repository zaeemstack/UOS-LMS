import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetFreshDb() {
  console.log('--- Wiping All Dummy Data & Resetting Database to Fresh State ---');

  // 1. Delete dependent transactional records
  await prisma.studentAttendance.deleteMany({});
  console.log('✓ Cleared StudentAttendance');

  await prisma.overrideRequest.deleteMany({});
  console.log('✓ Cleared OverrideRequests');

  await prisma.attendanceSession.deleteMany({});
  console.log('✓ Cleared AttendanceSessions');

  await prisma.studentSection.deleteMany({});
  console.log('✓ Cleared StudentSections');

  await prisma.timetableSlot.deleteMany({});
  console.log('✓ Cleared TimetableSlots');

  await prisma.networkAuditLog.deleteMany({});
  console.log('✓ Cleared NetworkAuditLogs');

  // 2. Clear old dummy users
  await prisma.user.deleteMany({});
  console.log('✓ Cleared all old dummy users');

  // 3. Clear sections and courses
  await prisma.section.deleteMany({});
  console.log('✓ Cleared Sections');

  await prisma.course.deleteMany({});
  console.log('✓ Cleared Courses');

  // 4. Reset rooms (keep only the 3 real pilot rooms for Physics)
  await prisma.room.deleteMany({});
  console.log('✓ Cleared old dummy rooms');

  // 5. Clean departments
  await prisma.department.deleteMany({});
  console.log('✓ Cleared old departments');

  // 6. Create clean University of Sahiwal Department(s)
  const physicsDept = await prisma.department.create({
    data: {
      name: 'Department of Physics',
      code: 'PHY',
    },
  });
  console.log(`✓ Created Department: ${physicsDept.name} (${physicsDept.code})`);

  // 7. Create Developer / Lead Administrator accounts for Muhammad Zaeem & Muhammad Saif Ullah
  const salt = await bcrypt.genSalt(10);
  const zaeemHash = await bcrypt.hash('zaeem123', salt);
  const saifHash = await bcrypt.hash('saif123', salt);

  const zaeemAdmin = await prisma.user.create({
    data: {
      email: 'zaeem@uosahiwal.edu.pk',
      fullName: 'Muhammad Zaeem',
      employeeOrRollId: 'zaeem',
      role: 'ADMIN',
      departmentId: physicsDept.id,
      passwordHash: zaeemHash,
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✓ Created Lead Developer Admin: ${zaeemAdmin.fullName} (${zaeemAdmin.email})`);

  const saifAdmin = await prisma.user.create({
    data: {
      email: 'saif@uosahiwal.edu.pk',
      fullName: 'Muhammad Saif Ullah',
      employeeOrRollId: 'saif',
      role: 'ADMIN',
      departmentId: physicsDept.id,
      passwordHash: saifHash,
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✓ Created Lead Developer Admin: ${saifAdmin.fullName} (${saifAdmin.email})`);

  // 8. Create the 3 Real Pilot Classrooms with Routers 52 & 56
  const pilotRooms = [
    {
      roomNumber: '4.1.20',
      building: 'Academic Block (Physics)',
      floor: 1,
      assignedSubnet: '192.168.52.0/24',
      routerIp: '192.168.52.1',
      routerMac: 'AA:BB:CC:52:00:01',
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerSsid: 'UOS-Physics-52',
    },
    {
      roomNumber: '4.1.21',
      building: 'Academic Block (Physics)',
      floor: 1,
      assignedSubnet: '192.168.52.0/24',
      routerIp: '192.168.52.1',
      routerMac: 'AA:BB:CC:52:00:01',
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerSsid: 'UOS-Physics-52',
    },
    {
      roomNumber: '4.1.4',
      building: 'Academic Block (Physics)',
      floor: 1,
      assignedSubnet: '192.168.56.0/24',
      routerIp: '192.168.56.1',
      routerMac: 'AA:BB:CC:56:00:01',
      routerName: 'Router 56 (Physics AP - 4.1.4)',
      routerSsid: 'UOS-Physics-56',
    },
  ];

  for (const r of pilotRooms) {
    const createdRoom = await prisma.room.create({ data: r });
    console.log(`✓ Created Pilot Room: ${createdRoom.roomNumber} -> ${createdRoom.routerName}`);
  }

  console.log('\n======================================================');
  console.log('Database successfully reset to pristine state!');
  console.log('User Account: zaeem@uosahiwal.edu.pk / ID: zaeem');
  console.log('Password:     zaeem123');
  console.log('Role:         ADMIN (Full System Developer & Controller)');
  console.log('Pilot Rooms:  4.1.20 & 4.1.21 on Router 52, 4.1.4 on Router 56');
  console.log('======================================================\n');
}

resetFreshDb()
  .catch((e) => {
    console.error('Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
