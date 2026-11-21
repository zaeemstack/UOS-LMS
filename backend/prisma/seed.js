import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAYS_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

async function main() {
  console.log('Seeding initial academic data for multi-department UOS...');

  const defaultPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);
  const hodPassword = await bcrypt.hash('hod123', 10);

  // 1. Create 10 Departments
  const departmentsData = [
    { code: 'CS', name: 'Department of Computer Science & IT', hodName: 'Dr. Shahzad Sarwar', hodEmail: 'hod.cs@uos.edu.pk' },
    { code: 'SE', name: 'Department of Software Engineering', hodName: 'Dr. Usman Farooq', hodEmail: 'hod.se@uos.edu.pk' },
    { code: 'EE', name: 'Department of Electrical Engineering', hodName: 'Dr. Bilal Aslam', hodEmail: 'hod.ee@uos.edu.pk' },
    { code: 'ME', name: 'Department of Mechanical Engineering', hodName: 'Dr. Rashid Khan', hodEmail: 'hod.me@uos.edu.pk' },
    { code: 'CE', name: 'Department of Civil Engineering', hodName: 'Dr. Tariq Jamil', hodEmail: 'hod.ce@uos.edu.pk' },
    { code: 'BBA', name: 'Department of Business Administration', hodName: 'Dr. Ayesha Malik', hodEmail: 'hod.bba@uos.edu.pk' },
    { code: 'MATH', name: 'Department of Mathematics', hodName: 'Dr. Zulfiqar Ali', hodEmail: 'hod.math@uos.edu.pk' },
    { code: 'PHY', name: 'Department of Physics', hodName: 'Dr. Noman Ahmed', hodEmail: 'hod.phy@uos.edu.pk' },
    { code: 'CHEM', name: 'Department of Chemistry', hodName: 'Dr. Saira Bano', hodEmail: 'hod.chem@uos.edu.pk' },
    { code: 'BIO', name: 'Department of Biotechnology', hodName: 'Dr. Kamran Akram', hodEmail: 'hod.bio@uos.edu.pk' },
  ];

  const deptMap = new Map();

  for (const dept of departmentsData) {
    const d = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: { name: dept.name, code: dept.code },
    });
    deptMap.set(dept.code, d);

    // Create HOD for each department
    await prisma.user.upsert({
      where: { email: dept.hodEmail },
      update: { fullName: `${dept.hodName} (HOD ${dept.code})`, departmentId: d.id, role: 'HOD' },
      create: {
        email: dept.hodEmail,
        passwordHash: hodPassword,
        fullName: `${dept.hodName} (HOD ${dept.code})`,
        employeeOrRollId: `EMP-HOD-${dept.code}`,
        role: 'HOD',
        departmentId: d.id,
        mustChangePassword: true,
      },
    });
  }

  const csDept = deptMap.get('CS');

  // 2. Create System Admin (IT Director)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@uos.edu.pk' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@uos.edu.pk',
      passwordHash: adminPassword,
      fullName: 'Prof. Dr. Zahid Iqbal (Director IT)',
      employeeOrRollId: 'EMP-ADM-001',
      role: 'ADMIN',
      departmentId: csDept.id,
    },
  });

  // 3. Create Teachers for CS
  const teacher1 = await prisma.user.upsert({
    where: { email: 'dr.tariq@uos.edu.pk' },
    update: {},
    create: {
      email: 'dr.tariq@uos.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Dr. Tariq Mahmood',
      employeeOrRollId: 'EMP-FAC-101',
      role: 'TEACHER',
      departmentId: csDept.id,
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'prof.amina@uos.edu.pk' },
    update: {},
    create: {
      email: 'prof.amina@uos.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Prof. Amina Khalid',
      employeeOrRollId: 'EMP-FAC-102',
      role: 'TEACHER',
      departmentId: csDept.id,
    },
  });

  // 4. Create Courses
  const courseDsa = await prisma.course.upsert({
    where: { code: 'CS-301' },
    update: {},
    create: {
      code: 'CS-301',
      title: 'Data Structures & Algorithms',
      creditHours: 4,
      departmentId: csDept.id,
    },
  });

  const courseDb = await prisma.course.upsert({
    where: { code: 'CS-305' },
    update: {},
    create: {
      code: 'CS-305',
      title: 'Database Systems',
      creditHours: 3,
      departmentId: csDept.id,
    },
  });

  // 5. Create Sections for 8 Semesters
  const section6A = await prisma.section.upsert({
    where: {
      name_academicYear: {
        name: 'BSCS-6A',
        academicYear: '2025-2026',
      },
    },
    update: {},
    create: {
      name: 'BSCS-6A',
      semester: 6,
      academicYear: '2025-2026',
      departmentId: csDept.id,
    },
  });

  const section4B = await prisma.section.upsert({
    where: {
      name_academicYear: {
        name: 'BSCS-4B',
        academicYear: '2025-2026',
      },
    },
    update: {},
    create: {
      name: 'BSCS-4B',
      semester: 4,
      academicYear: '2025-2026',
      departmentId: csDept.id,
    },
  });

  // 6. Create Students for Section 6A
  const studentNames = [
    { name: 'Muhammad Ali', roll: 'SU-22-BSCS-001' },
    { name: 'Fatima Noor', roll: 'SU-22-BSCS-002' },
    { name: 'Hamza Naveed', roll: 'SU-22-BSCS-003' },
    { name: 'Ayesha Siddiqua', roll: 'SU-22-BSCS-004' },
    { name: 'Bilal Ahmed', roll: 'SU-22-BSCS-005' },
    { name: 'Zainab Bibi', roll: 'SU-22-BSCS-006' },
    { name: 'Usman Ghani', roll: 'SU-22-BSCS-007' },
    { name: 'Hassan Raza', roll: 'SU-22-BSCS-008' },
  ];

  for (const s of studentNames) {
    const email = `${s.roll.toLowerCase().replace(/-/g, '')}@student.uos.edu.pk`;
    const studentUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: defaultPassword,
        fullName: s.name,
        employeeOrRollId: s.roll,
        role: 'STUDENT',
        departmentId: csDept.id,
      },
    });

    await prisma.studentSection.upsert({
      where: {
        studentId_sectionId: {
          studentId: studentUser.id,
          sectionId: section6A.id,
        },
      },
      update: {},
      create: {
        studentId: studentUser.id,
        sectionId: section6A.id,
      },
    });
  }

  // 7. Create Rooms
  const roomLab = await prisma.room.upsert({
    where: { roomNumber: 'Lab-01' },
    update: {},
    create: {
      roomNumber: 'Lab-01',
      building: 'Academic Block A',
      floor: 1,
      assignedSubnet: '10.12.1.0/24',
    },
  });

  const roomLH = await prisma.room.upsert({
    where: { roomNumber: 'LH-03' },
    update: {},
    create: {
      roomNumber: 'LH-03',
      building: 'Academic Block B',
      floor: 2,
    },
  });

  // 8. Create Timetable Slots for TODAY so teacher can immediately test
  const now = new Date();
  const currentDay = DAYS_MAP[now.getDay()];

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const formatTime = (h, m) => {
    let totalMinutes = h * 60 + m;
    let normalizedHours = Math.floor(totalMinutes / 60) % 24;
    let normalizedMins = Math.floor((totalMinutes % 60) / 5) * 5;
    const hh = String(((normalizedHours % 24) + 24) % 24).padStart(2, '0');
    const mm = String(normalizedMins).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const activeStart = formatTime(currentHour, Math.max(0, currentMin - 5));
  const activeEnd = formatTime(currentHour + 1, currentMin + 25);

  const lateStart = formatTime(currentHour - 1, Math.max(0, currentMin - 15));
  const lateEnd = formatTime(currentHour, Math.max(0, currentMin - 10));

  const upcomingStart = formatTime(currentHour + 2, 0);
  const upcomingEnd = formatTime(currentHour + 3, 30);

  await prisma.overrideRequest.deleteMany({});
  await prisma.studentAttendance.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.timetableSlot.deleteMany({});

  await prisma.timetableSlot.create({
    data: {
      dayOfWeek: currentDay,
      startTime: activeStart,
      endTime: activeEnd,
      courseId: courseDsa.id,
      sectionId: section6A.id,
      teacherId: teacher1.id,
      roomId: roomLab.id,
    },
  });

  await prisma.timetableSlot.create({
    data: {
      dayOfWeek: currentDay,
      startTime: lateStart,
      endTime: lateEnd,
      courseId: courseDb.id,
      sectionId: section6A.id,
      teacherId: teacher1.id,
      roomId: roomLH.id,
    },
  });

  await prisma.timetableSlot.create({
    data: {
      dayOfWeek: currentDay,
      startTime: upcomingStart,
      endTime: upcomingEnd,
      courseId: courseDsa.id,
      sectionId: section6A.id,
      teacherId: teacher1.id,
      roomId: roomLab.id,
    },
  });

  console.log('Database seeded successfully with 10 departments!');
  console.log('Credentials:');
  console.log(' Admin (IT Director): admin@uos.edu.pk / admin123');
  console.log(' HOD CS:             hod.cs@uos.edu.pk / hod123');
  console.log(' HOD SE:             hod.se@uos.edu.pk / hod123');
  console.log(' Teacher:            dr.tariq@uos.edu.pk / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

