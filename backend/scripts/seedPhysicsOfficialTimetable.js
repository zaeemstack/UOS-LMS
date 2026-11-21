import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import {
  sem1Students,
  sem3Students,
  sem5Students,
  sem7Students,
  sem7SpecializedDLD,
  sem7SpecializedLaser,
  sem7SpecializedSSP,
  mphilAllStudents,
  mphilGroupA,
  mphilGroupB,
} from './resetAndImportStudents.js';

async function main() {
  console.log('=== Ingesting Official University of Sahiwal Physics Department Timetable ===');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Ensure Department of Physics exists
  const phyDept = await prisma.department.upsert({
    where: { code: 'PHY' },
    update: { name: 'Department of Physics' },
    create: { name: 'Department of Physics', code: 'PHY' },
  });
  console.log(`✓ Physics Department: ${phyDept.name} (ID: ${phyDept.id})`);

  // 2. Classrooms & Pilot Routers
  const roomsData = [
    {
      roomNumber: '4.1.4',
      building: 'Academic Block (Physics)',
      floor: 1,
      routerName: 'Router 56 (Physics AP - 4.1.4)',
      routerIp: '172.200.37.26',
      routerMac: '18:E8:29:08:6D:5F',
      assignedSubnet: '172.200.37.0/24',
      routerSsid: 'UOS-Physics-56',
    },
    {
      roomNumber: '4.1.20',
      building: 'Academic Block (Physics)',
      floor: 1,
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerIp: '172.200.47.193',
      routerMac: '18:E8:29:08:6D:65',
      assignedSubnet: '172.200.47.0/24',
      routerSsid: 'UOS-Physics-52',
    },
    {
      roomNumber: '4.1.21',
      building: 'Academic Block (Physics)',
      floor: 1,
      routerName: 'Router 52 (Physics AP - 4.1.20 / 4.1.21)',
      routerIp: '172.200.47.193',
      routerMac: '18:E8:29:08:6D:65',
      assignedSubnet: '172.200.47.0/24',
      routerSsid: 'UOS-Physics-52',
    },
    {
      roomNumber: '1.1.17',
      building: 'Physics Block (Ground)',
      floor: 1,
      routerName: 'Physics Lab AP (1.1.17)',
      routerIp: '172.200.47.1',
      assignedSubnet: '172.200.47.0/24',
    },
    {
      roomNumber: '4.1.17',
      building: 'Academic Block (Physics Lab-A)',
      floor: 1,
      routerName: 'Physics Lab-A Router',
      routerIp: '172.200.47.1',
      assignedSubnet: '172.200.47.0/24',
    },
    {
      roomNumber: '4.G.6-A',
      building: 'Academic Block (Ground)',
      floor: 0,
      routerName: 'Ground Floor AP (4.G.6-A)',
      routerIp: '172.200.37.1',
      assignedSubnet: '172.200.37.0/24',
    },
  ];

  const roomMap = new Map();
  for (const r of roomsData) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: r,
      create: r,
    });
    roomMap.set(r.roomNumber, room);
  }
  console.log(`✓ Configured ${roomMap.size} Classrooms & Lab Rooms`);

  // 3. Teachers / Faculty from Timetable
  const teachersData = [
    { name: 'Dr. Tariq', email: 'dr.tariq@uosahiwal.edu.pk', id: 'FAC-PHY-101' },
    { name: 'Dr. Farooq Aziz', email: 'dr.farooq@uosahiwal.edu.pk', id: 'FAC-PHY-102' },
    { name: 'Dr. Muhammad Farhan Taseer', email: 'dr.farhan@uosahiwal.edu.pk', id: 'FAC-PHY-103' },
    { name: 'Dr. M. Asim', email: 'dr.asim@uosahiwal.edu.pk', id: 'FAC-PHY-104' },
    { name: 'Ms. Aatika', email: 'ms.aatika@uosahiwal.edu.pk', id: 'FAC-PHY-105' },
    { name: 'Ms Misbah', email: 'ms.misbah@uosahiwal.edu.pk', id: 'FAC-PHY-106' },
    { name: 'Ms Shumaila Fatima', email: 'ms.shumaila@uosahiwal.edu.pk', id: 'FAC-PHY-107' },
    { name: 'Mr Ahmad Arslan Taha', email: 'mr.arslan@uosahiwal.edu.pk', id: 'FAC-PHY-108' },
    { name: 'Mr Kashif Ali', email: 'mr.kashif@uosahiwal.edu.pk', id: 'FAC-PHY-109' },
    { name: 'Ms Ayesha', email: 'ms.ayesha@uosahiwal.edu.pk', id: 'FAC-PHY-110' },
    { name: 'Ms Yousra Umbreen', email: 'ms.yousra@uosahiwal.edu.pk', id: 'FAC-PHY-111' },
    { name: 'Mr Rana Shahzad Haider Anjum', email: 'mr.shahzad@uosahiwal.edu.pk', id: 'FAC-PHY-112' },
    { name: 'Ms Amina Qaisar', email: 'ms.amina@uosahiwal.edu.pk', id: 'FAC-PHY-113' },
    { name: 'Dr. Muhammad Asghar Javed', email: 'dr.asghar@uosahiwal.edu.pk', id: 'FAC-PHY-114' },
    { name: 'Mr Hafiz Ghulam Muhammad', email: 'mr.ghulam@uosahiwal.edu.pk', id: 'FAC-PHY-115' },
    { name: 'Dr. M. Asif Nawaz', email: 'dr.asif@uosahiwal.edu.pk', id: 'FAC-PHY-116' },
    { name: 'Dr. M. Rafique', email: 'dr.rafique@uosahiwal.edu.pk', id: 'FAC-PHY-117' },
    { name: 'Dr. Muhammad Shabbir', email: 'dr.shabbir@uosahiwal.edu.pk', id: 'FAC-PHY-118' },
    { name: 'Ms Zainab Shahid', email: 'ms.zainab@uosahiwal.edu.pk', id: 'FAC-PHY-119' },
  ];

  const teacherMap = new Map();
  for (const t of teachersData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { fullName: t.name, departmentId: phyDept.id, role: 'TEACHER' },
      create: {
        email: t.email,
        passwordHash: defaultPassword,
        fullName: t.name,
        employeeOrRollId: t.id,
        role: 'TEACHER',
        departmentId: phyDept.id,
      },
    });
    teacherMap.set(t.name, user);
  }
  console.log(`✓ Registered ${teacherMap.size} Physics Faculty Teachers`);

  // Also ensure HOD of Physics exists
  const hodUser = await prisma.user.upsert({
    where: { email: 'hod.phy@uosahiwal.edu.pk' },
    update: { role: 'HOD', departmentId: phyDept.id },
    create: {
      email: 'hod.phy@uosahiwal.edu.pk',
      passwordHash: defaultPassword,
      fullName: 'Dr. Noman Ahmed (HOD Physics)',
      employeeOrRollId: 'EMP-HOD-PHY',
      role: 'HOD',
      departmentId: phyDept.id,
    },
  });
  console.log(`✓ Physics HOD Account: ${hodUser.email} (Password: password123)`);

  // 4. Sections (Cohorts + Specialized Elective Streams)
  const sectionsData = [
    { name: 'BS.PHY1-A', semester: 1, academicYear: '2026-2027' },
    { name: 'BS.PHY3-A', semester: 3, academicYear: '2026-2027' },
    { name: 'BS.PHY5-A', semester: 5, academicYear: '2026-2027' },
    { name: 'BS.PHY7-A', semester: 7, academicYear: '2026-2027' },
    // BS-7 Specialized Electives
    { name: 'BS.PHY7-A (Special SSP-I)', semester: 7, academicYear: '2026-2027' },
    { name: 'BS.PHY7-A (Lasers Physics-I)', semester: 7, academicYear: '2026-2027' },
    { name: 'BS.PHY7-A (Digital Electronics-I)', semester: 7, academicYear: '2026-2027' },
    // MPhil & Electives
    { name: 'MPHIL.PHY1-SS', semester: 1, academicYear: '2026-2027' },
    { name: 'MPHIL.PHY1-SS (Group A)', semester: 1, academicYear: '2026-2027' },
    { name: 'MPHIL.PHY1-SS (Group B)', semester: 1, academicYear: '2026-2027' },
    // PhD
    { name: 'PhD.PHY1-SS', semester: 1, academicYear: '2026-2027' },
  ];

  const sectionMap = new Map();
  for (const s of sectionsData) {
    const sec = await prisma.section.upsert({
      where: { name_academicYear: { name: s.name, academicYear: s.academicYear } },
      update: { semester: s.semester, departmentId: phyDept.id },
      create: { name: s.name, semester: s.semester, academicYear: s.academicYear, departmentId: phyDept.id },
    });
    sectionMap.set(s.name, sec);
  }
  console.log(`✓ Created ${sectionMap.size} Sections & Elective Cohorts`);

  // 5. Courses (All subjects from the timetable)
  const coursesData = [
    // BS-1
    { code: 'PHY-101', title: 'Introductory Mechanics', creditHours: 3 },
    { code: 'MTH-101', title: 'Calculus-I', creditHours: 3 },
    { code: 'ENG-101', title: 'Functional English', creditHours: 3 },
    { code: 'QR-101', title: 'Quantitative Reasoning - 1', creditHours: 3 },
    { code: 'NS-101', title: 'Natural Sciences', creditHours: 3 },
    { code: 'MTH-099', title: 'Zero-Math', creditHours: 3 },
    { code: 'ICT-101', title: 'Applications of ICT', creditHours: 3 },
    { code: 'PHY-101L', title: 'Introductory Mechanics - LAB', creditHours: 1 },
    { code: 'ICT-101L', title: 'ICT - LAB', creditHours: 1 },
    { code: 'NS-101L', title: 'Natural Sciences - LAB', creditHours: 1 },

    // BS-3
    { code: 'MGT-201', title: 'Entrepreneurship', creditHours: 3 },
    { code: 'PHY-201', title: 'Waves & Oscillations', creditHours: 3 },
    { code: 'QR-201', title: 'Quantitative Reasoning-I', creditHours: 3 },
    { code: 'MTH-201', title: 'Linear Algebra', creditHours: 3 },
    { code: 'PHY-203', title: 'Modern Physics', creditHours: 3 },
    { code: 'ISL-201', title: 'Translation of Holy Quran-II', creditHours: 1 },
    { code: 'PHY-201L', title: 'LAB-III (Waves & Modern)', creditHours: 2 },

    // BS-5
    { code: 'PHY-301', title: 'Electrodynamics-I', creditHours: 3 },
    { code: 'PHY-303', title: 'Computational Physics', creditHours: 3 },
    { code: 'ISL-301', title: 'Translation of Holy Quran-III', creditHours: 1 },
    { code: 'PHY-305', title: 'Mathematical Methods of Physics-I', creditHours: 3 },
    { code: 'PHY-307', title: 'Classical Mechanics', creditHours: 3 },
    { code: 'PHY-309', title: 'Electronics-I', creditHours: 3 },
    { code: 'PHY-301L', title: 'LAB-V (Electronics & Computing)', creditHours: 2 },

    // BS-7 (Core + Specialized Electives)
    { code: 'PHY-401L', title: 'Solid State Physics Laboratory', creditHours: 2 },
    { code: 'PHY-403L', title: 'Digital Electronics Laboratory', creditHours: 2 },
    { code: 'PHY-405L', title: 'Lasers Laboratory', creditHours: 2 },
    { code: 'PHY-401', title: 'Solid State Physics-II', creditHours: 3 },
    { code: 'PHY-403', title: 'Digital Electronics-I', creditHours: 3 },
    { code: 'PHY-405', title: 'Nuclear Physics', creditHours: 3 },
    { code: 'PHY-407', title: 'Atomic & Molecular Physics', creditHours: 3 },
    { code: 'PHY-409', title: 'Quantum Mechanics-II', creditHours: 3 },
    { code: 'PHY-411-E1', title: 'Special SSP-I (Elective)', creditHours: 3 },
    { code: 'PHY-413-E2', title: 'Lasers Physics-I (Elective)', creditHours: 3 },
    { code: 'ISL-401', title: 'Translation of Holy Quran-IV', creditHours: 1 },

    // MPhil Courses
    { code: 'MPHIL-701', title: 'Advanced Mathematical Physics', creditHours: 3 },
    { code: 'MPHIL-703', title: 'Advanced Quantum Mechanics', creditHours: 3 },
    { code: 'MPHIL-705A', title: 'Material Science (A)', creditHours: 3 },
    { code: 'MPHIL-705B', title: 'Nanomaterials (B)', creditHours: 3 },
    { code: 'MPHIL-707A', title: 'Catalysis Science and Technology (A)', creditHours: 3 },
    { code: 'MPHIL-707B', title: 'Electronic Structure Methods (B)', creditHours: 3 },
    { code: 'MPHIL-709', title: 'Introduction to Artificial Intelligence', creditHours: 3 },
    { code: 'ISL-701', title: 'Understanding of Holy Quran – I', creditHours: 1 },

    // PhD Courses
    { code: 'PHD-801', title: 'Microscopy and Spectroscopy Techniques', creditHours: 3 },
    { code: 'PHD-803', title: 'Catalysis and Catalytic Materials', creditHours: 3 },
    { code: 'PHD-805', title: 'Material Physics', creditHours: 3 },
    { code: 'PHD-807', title: 'Introduction to Artificial Intelligence (PhD)', creditHours: 3 },
  ];

  const courseMap = new Map();
  for (const c of coursesData) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: { title: c.title, creditHours: c.creditHours, departmentId: phyDept.id },
      create: { code: c.code, title: c.title, creditHours: c.creditHours, departmentId: phyDept.id },
    });
    courseMap.set(c.code, course);
  }
  console.log(`✓ Created ${courseMap.size} Academic Courses`);

  // 6. Seed Students into Each Section & Elective Group
  console.log('Seeding student rosters for BS, MPhil, and PhD...');
  
  async function createStudent(rollId, name, email, sectionNames) {
    const st = await prisma.user.upsert({
      where: { email },
      update: { fullName: name, employeeOrRollId: rollId, role: 'STUDENT', departmentId: phyDept.id },
      create: {
        email,
        passwordHash: defaultPassword,
        fullName: name,
        employeeOrRollId: rollId,
        role: 'STUDENT',
        departmentId: phyDept.id,
      },
    });

    for (const sName of sectionNames) {
      const sec = sectionMap.get(sName);
      if (sec) {
        await prisma.studentSection.upsert({
          where: { studentId_sectionId: { studentId: st.id, sectionId: sec.id } },
          update: {},
          create: { studentId: st.id, sectionId: sec.id },
        });
      }
    }
  }

  // BS-1 Students (29 real students from Session 2026-30)
  for (const st of sem1Students) {
    const email = `${st.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;
    await createStudent(st.roll, st.name, email, ['BS.PHY1-A']);
  }

  // BS-3 Students (40 real students from Session 2025-29)
  for (const st of sem3Students) {
    const email = `${st.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;
    await createStudent(st.roll, st.name, email, ['BS.PHY3-A']);
  }

  // BS-5 Students (47 real students from Session 2024-28)
  for (const st of sem5Students) {
    const email = `${st.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;
    await createStudent(st.roll, st.name, email, ['BS.PHY5-A']);
  }

  // BS-7 Students (60 real students from Session 2023-27: Specialized into DLD, Lasers, and SSP)
  const dldSet = new Set(sem7SpecializedDLD.map((s) => s.roll));
  const laserSet = new Set(sem7SpecializedLaser.map((s) => s.roll));
  const sspSet = new Set(sem7SpecializedSSP.map((s) => s.roll));

  for (const st of sem7Students) {
    const email = `${st.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;
    const targetSections = ['BS.PHY7-A'];
    if (dldSet.has(st.roll)) targetSections.push('BS.PHY7-A (Digital Electronics-I)');
    else if (laserSet.has(st.roll)) targetSections.push('BS.PHY7-A (Lasers Physics-I)');
    else if (sspSet.has(st.roll)) targetSections.push('BS.PHY7-A (Special SSP-I)');

    await createStudent(st.roll, st.name, email, targetSections);
  }

  // MPhil Students (30 official scholars: Main Core + Group A & Group B Electives)
  const mphilGroupASet = new Set(mphilGroupA.map((s) => s.roll));
  const mphilGroupBSet = new Set(mphilGroupB.map((s) => s.roll));

  for (const st of mphilAllStudents) {
    const email = `${st.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;
    const targetSections = ['MPHIL.PHY1-SS'];
    if (mphilGroupASet.has(st.roll)) targetSections.push('MPHIL.PHY1-SS (Group A)');
    else if (mphilGroupBSet.has(st.roll)) targetSections.push('MPHIL.PHY1-SS (Group B)');

    await createStudent(st.roll, st.name, email, targetSections);
  }

  // PhD Students
  for (let i = 1; i <= 8; i++) {
    const pad = String(i).padStart(2, '0');
    await createStudent(
      `25-PPHY-${pad}`,
      `PhD Fellow ${pad}`,
      `phd.${pad}@uosahiwal.edu.pk`,
      ['PhD.PHY1-SS']
    );
  }
  console.log('✓ Student Rosters & Elective Enrollments Successfully Linked!');

  // 7. Clear old timetable slots to load 100% clean schedule
  await prisma.attendanceSession.deleteMany({
    where: { timetableSlot: { course: { departmentId: phyDept.id } } },
  });
  await prisma.overrideRequest.deleteMany({
    where: { departmentId: phyDept.id },
  });
  await prisma.timetableSlot.deleteMany({
    where: { course: { departmentId: phyDept.id } },
  });

  // 8. Timetable Slots Raw Definition
  const rawSlots = [
    // -------------------------------------------------------------
    // PAGE 1: PHY-BS.PHY1 A M (Room 4.1.4 on Router 56)
    // -------------------------------------------------------------
    // Monday
    { day: 'MONDAY', start: '08:00', end: '09:00', course: 'PHY-101', sec: 'BS.PHY1-A', teacher: 'Ms Misbah', room: '4.1.4' },
    { day: 'MONDAY', start: '09:00', end: '10:00', course: 'MTH-101', sec: 'BS.PHY1-A', teacher: 'Ms Shumaila Fatima', room: '4.1.4' },
    { day: 'MONDAY', start: '10:00', end: '11:00', course: 'ENG-101', sec: 'BS.PHY1-A', teacher: 'Mr Ahmad Arslan Taha', room: '4.1.4' },
    { day: 'MONDAY', start: '11:00', end: '12:00', course: 'QR-101', sec: 'BS.PHY1-A', teacher: 'Mr Kashif Ali', room: '4.1.4' },
    { day: 'MONDAY', start: '12:00', end: '13:00', course: 'NS-101', sec: 'BS.PHY1-A', teacher: 'Ms Ayesha', room: '4.1.4' },
    { day: 'MONDAY', start: '13:00', end: '14:00', course: 'MTH-099', sec: 'BS.PHY1-A', teacher: 'Ms Yousra Umbreen', room: '4.1.4' },

    // Tuesday
    { day: 'TUESDAY', start: '08:00', end: '09:00', course: 'MTH-101', sec: 'BS.PHY1-A', teacher: 'Ms Shumaila Fatima', room: '4.1.4' },
    { day: 'TUESDAY', start: '09:00', end: '10:00', course: 'PHY-101', sec: 'BS.PHY1-A', teacher: 'Ms Misbah', room: '4.1.4' },
    { day: 'TUESDAY', start: '10:00', end: '11:00', course: 'ENG-101', sec: 'BS.PHY1-A', teacher: 'Mr Ahmad Arslan Taha', room: '4.1.4' },
    { day: 'TUESDAY', start: '11:00', end: '12:00', course: 'QR-101', sec: 'BS.PHY1-A', teacher: 'Mr Kashif Ali', room: '4.1.4' },
    { day: 'TUESDAY', start: '12:00', end: '13:00', course: 'ICT-101', sec: 'BS.PHY1-A', teacher: 'Mr Rana Shahzad Haider Anjum', room: '4.1.4' },
    { day: 'TUESDAY', start: '13:00', end: '14:00', course: 'MTH-099', sec: 'BS.PHY1-A', teacher: 'Ms Yousra Umbreen', room: '4.1.4' },

    // Wednesday
    { day: 'WEDNESDAY', start: '08:00', end: '09:00', course: 'MTH-101', sec: 'BS.PHY1-A', teacher: 'Ms Shumaila Fatima', room: '4.1.4' },
    { day: 'WEDNESDAY', start: '09:00', end: '10:00', course: 'ENG-101', sec: 'BS.PHY1-A', teacher: 'Mr Ahmad Arslan Taha', room: '4.1.4' },
    { day: 'WEDNESDAY', start: '10:00', end: '11:00', course: 'QR-101', sec: 'BS.PHY1-A', teacher: 'Mr Kashif Ali', room: '4.1.4' },
    { day: 'WEDNESDAY', start: '11:00', end: '12:00', course: 'MTH-099', sec: 'BS.PHY1-A', teacher: 'Ms Yousra Umbreen', room: '4.1.4' },
    { day: 'WEDNESDAY', start: '12:00', end: '13:00', course: 'NS-101', sec: 'BS.PHY1-A', teacher: 'Ms Ayesha', room: '4.1.4' },
    { day: 'WEDNESDAY', start: '13:00', end: '14:00', course: 'ICT-101', sec: 'BS.PHY1-A', teacher: 'Mr Rana Shahzad Haider Anjum', room: '4.1.4' },

    // Thursday Labs
    { day: 'THURSDAY', start: '08:00', end: '11:00', course: 'PHY-101L', sec: 'BS.PHY1-A', teacher: 'Ms Misbah', room: '1.1.17' },
    { day: 'THURSDAY', start: '11:00', end: '14:00', course: 'ICT-101L', sec: 'BS.PHY1-A', teacher: 'Mr Rana Shahzad Haider Anjum', room: '1.1.17' },
    { day: 'THURSDAY', start: '14:00', end: '17:00', course: 'NS-101L', sec: 'BS.PHY1-A', teacher: 'Ms Ayesha', room: '1.1.17' },

    // -------------------------------------------------------------
    // PAGE 2: PHY-BS.PHY3 A M (Room 4.1.21 on Router 52)
    // -------------------------------------------------------------
    // Monday
    { day: 'MONDAY', start: '09:00', end: '10:00', course: 'MGT-201', sec: 'BS.PHY3-A', teacher: 'Ms Amina Qaisar', room: '4.1.21' },
    { day: 'MONDAY', start: '10:00', end: '11:00', course: 'PHY-201', sec: 'BS.PHY3-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.21' },
    { day: 'MONDAY', start: '11:00', end: '12:00', course: 'QR-201', sec: 'BS.PHY3-A', teacher: 'Ms Yousra Umbreen', room: '4.1.21' },
    { day: 'MONDAY', start: '12:00', end: '13:00', course: 'MTH-201', sec: 'BS.PHY3-A', teacher: 'Ms Yousra Umbreen', room: '4.1.21' },

    // Tuesday
    { day: 'TUESDAY', start: '08:00', end: '09:00', course: 'PHY-203', sec: 'BS.PHY3-A', teacher: 'Dr. Farooq Aziz', room: '4.1.21' },
    { day: 'TUESDAY', start: '09:00', end: '10:00', course: 'MGT-201', sec: 'BS.PHY3-A', teacher: 'Ms Amina Qaisar', room: '4.1.21' },
    { day: 'TUESDAY', start: '10:00', end: '11:00', course: 'PHY-201', sec: 'BS.PHY3-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.21' },
    { day: 'TUESDAY', start: '11:00', end: '12:00', course: 'QR-201', sec: 'BS.PHY3-A', teacher: 'Ms Yousra Umbreen', room: '4.1.21' },
    { day: 'TUESDAY', start: '12:00', end: '13:00', course: 'MTH-201', sec: 'BS.PHY3-A', teacher: 'Ms Yousra Umbreen', room: '4.1.21' },
    { day: 'TUESDAY', start: '13:00', end: '14:00', course: 'PHY-203', sec: 'BS.PHY3-A', teacher: 'Dr. Farooq Aziz', room: '4.1.21' },

    // Wednesday
    { day: 'WEDNESDAY', start: '08:00', end: '09:00', course: 'PHY-203', sec: 'BS.PHY3-A', teacher: 'Dr. Farooq Aziz', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '09:00', end: '10:00', course: 'MGT-201', sec: 'BS.PHY3-A', teacher: 'Ms Amina Qaisar', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '10:00', end: '11:00', course: 'MTH-201', sec: 'BS.PHY3-A', teacher: 'Ms Yousra Umbreen', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '11:00', end: '12:00', course: 'QR-201', sec: 'BS.PHY3-A', teacher: 'Ms Yousra Umbreen', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '12:00', end: '13:00', course: 'PHY-201', sec: 'BS.PHY3-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '13:00', end: '14:00', course: 'ISL-201', sec: 'BS.PHY3-A', teacher: 'Dr. Muhammad Asghar Javed', room: '4.1.21' },

    // Friday Lab
    { day: 'FRIDAY', start: '11:00', end: '14:00', course: 'PHY-201L', sec: 'BS.PHY3-A', teacher: 'Dr. M. Rafique', room: '1.1.17' },

    // -------------------------------------------------------------
    // PAGE 3: PHY-BS.PHY5 A M (Room 4.1.20 on Router 52)
    // -------------------------------------------------------------
    // Monday
    { day: 'MONDAY', start: '08:00', end: '09:00', course: 'PHY-301', sec: 'BS.PHY5-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.20' },
    { day: 'MONDAY', start: '09:00', end: '10:00', course: 'PHY-303', sec: 'BS.PHY5-A', teacher: 'Ms Misbah', room: '4.1.20' },
    { day: 'MONDAY', start: '10:00', end: '11:00', course: 'ISL-301', sec: 'BS.PHY5-A', teacher: 'Mr Hafiz Ghulam Muhammad', room: '4.1.20' },
    { day: 'MONDAY', start: '11:00', end: '12:00', course: 'PHY-301', sec: 'BS.PHY5-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.20' },
    { day: 'MONDAY', start: '12:00', end: '13:00', course: 'PHY-305', sec: 'BS.PHY5-A', teacher: 'Dr. Farooq Aziz', room: '4.1.20' },

    // Tuesday
    { day: 'TUESDAY', start: '08:00', end: '09:00', course: 'PHY-303', sec: 'BS.PHY5-A', teacher: 'Ms Misbah', room: '4.1.20' },
    { day: 'TUESDAY', start: '09:00', end: '10:00', course: 'PHY-305', sec: 'BS.PHY5-A', teacher: 'Dr. Farooq Aziz', room: '4.1.20' },
    { day: 'TUESDAY', start: '10:00', end: '11:00', course: 'PHY-307', sec: 'BS.PHY5-A', teacher: 'Ms. Aatika', room: '4.1.20' },
    { day: 'TUESDAY', start: '11:00', end: '12:00', course: 'PHY-309', sec: 'BS.PHY5-A', teacher: 'Dr. M. Asim', room: '4.1.20' },
    { day: 'TUESDAY', start: '12:00', end: '13:00', course: 'PHY-307', sec: 'BS.PHY5-A', teacher: 'Ms. Aatika', room: '4.1.20' },
    { day: 'TUESDAY', start: '13:00', end: '14:00', course: 'PHY-309', sec: 'BS.PHY5-A', teacher: 'Dr. M. Asim', room: '4.1.20' },

    // Wednesday Lab
    { day: 'WEDNESDAY', start: '11:00', end: '14:00', course: 'PHY-301L', sec: 'BS.PHY5-A', teacher: 'Dr. M. Asif Nawaz', room: '1.1.17' },

    // Thursday
    { day: 'THURSDAY', start: '08:00', end: '09:00', course: 'PHY-309', sec: 'BS.PHY5-A', teacher: 'Dr. M. Asim', room: '4.1.20' },
    { day: 'THURSDAY', start: '09:00', end: '10:00', course: 'PHY-301', sec: 'BS.PHY5-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.20' },
    { day: 'THURSDAY', start: '10:00', end: '11:00', course: 'PHY-305', sec: 'BS.PHY5-A', teacher: 'Dr. Farooq Aziz', room: '4.1.20' },
    { day: 'THURSDAY', start: '11:00', end: '12:00', course: 'PHY-303', sec: 'BS.PHY5-A', teacher: 'Ms Misbah', room: '4.1.20' },
    { day: 'THURSDAY', start: '13:00', end: '14:00', course: 'PHY-307', sec: 'BS.PHY5-A', teacher: 'Ms. Aatika', room: '4.1.20' },

    // -------------------------------------------------------------
    // PAGE 4: PHY-BS.PHY7 A M (With Simultaneous Electives!)
    // -------------------------------------------------------------
    // Labs
    { day: 'MONDAY', start: '09:00', end: '14:00', course: 'PHY-401L', sec: 'BS.PHY7-A', teacher: 'Dr. Tariq', room: '1.1.17' },
    { day: 'TUESDAY', start: '09:00', end: '12:00', course: 'PHY-403L', sec: 'BS.PHY7-A (Digital Electronics-I)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.17' },
    { day: 'TUESDAY', start: '10:00', end: '14:00', course: 'PHY-405L', sec: 'BS.PHY7-A (Lasers Physics-I)', teacher: 'Dr. M. Rafique', room: '1.1.17' },

    // Wednesday
    { day: 'WEDNESDAY', start: '08:00', end: '09:00', course: 'PHY-403', sec: 'BS.PHY7-A (Digital Electronics-I)', teacher: 'Dr. M. Asim', room: '4.1.20' },
    { day: 'WEDNESDAY', start: '09:00', end: '10:00', course: 'PHY-401', sec: 'BS.PHY7-A', teacher: 'Dr. Tariq', room: '4.1.20' },
    { day: 'WEDNESDAY', start: '10:00', end: '11:00', course: 'PHY-407', sec: 'BS.PHY7-A', teacher: 'Dr. Farooq Aziz', room: '4.1.20' },
    { day: 'WEDNESDAY', start: '11:00', end: '12:00', course: 'PHY-405', sec: 'BS.PHY7-A', teacher: 'Ms. Aatika', room: '4.1.20' },
    { day: 'WEDNESDAY', start: '12:00', end: '13:00', course: 'PHY-405', sec: 'BS.PHY7-A', teacher: 'Ms. Aatika', room: '4.1.20' },
    { day: 'WEDNESDAY', start: '13:00', end: '14:00', course: 'PHY-403', sec: 'BS.PHY7-A (Digital Electronics-I)', teacher: 'Dr. M. Asim', room: '4.1.20' },
    { day: 'WEDNESDAY', start: '14:00', end: '15:00', course: 'PHY-409', sec: 'BS.PHY7-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.20' },

    // Thursday (Simultaneous Electives in 4.1.21 & 4.1.4!)
    { day: 'THURSDAY', start: '08:00', end: '09:00', course: 'PHY-407', sec: 'BS.PHY7-A', teacher: 'Dr. Farooq Aziz', room: '4.1.21' },
    { day: 'THURSDAY', start: '09:00', end: '10:00', course: 'PHY-401', sec: 'BS.PHY7-A', teacher: 'Dr. Tariq', room: '4.1.21' },
    { day: 'THURSDAY', start: '10:00', end: '11:00', course: 'PHY-403', sec: 'BS.PHY7-A (Digital Electronics-I)', teacher: 'Dr. M. Asim', room: '4.1.21' },
    // 11:00-12:00 SIMULTANEOUS ELECTIVES
    { day: 'THURSDAY', start: '11:00', end: '12:00', course: 'PHY-411-E1', sec: 'BS.PHY7-A (Special SSP-I)', teacher: 'Dr. M. Asim', room: '4.1.21' },
    { day: 'THURSDAY', start: '11:00', end: '12:00', course: 'PHY-413-E2', sec: 'BS.PHY7-A (Lasers Physics-I)', teacher: 'Ms. Aatika', room: '4.1.4' },
    // 12:00-13:00 SIMULTANEOUS ELECTIVES
    { day: 'THURSDAY', start: '12:00', end: '13:00', course: 'PHY-411-E1', sec: 'BS.PHY7-A (Special SSP-I)', teacher: 'Dr. M. Asim', room: '4.1.21' },
    { day: 'THURSDAY', start: '12:00', end: '13:00', course: 'PHY-413-E2', sec: 'BS.PHY7-A (Lasers Physics-I)', teacher: 'Ms. Aatika', room: '4.1.4' },
    { day: 'THURSDAY', start: '13:00', end: '14:00', course: 'PHY-407', sec: 'BS.PHY7-A', teacher: 'Dr. Farooq Aziz', room: '4.1.21' },

    // Friday
    { day: 'FRIDAY', start: '08:00', end: '09:00', course: 'PHY-409', sec: 'BS.PHY7-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.21' },
    { day: 'FRIDAY', start: '09:00', end: '10:00', course: 'PHY-401', sec: 'BS.PHY7-A', teacher: 'Dr. Tariq', room: '4.1.20' },
    // 10:00-11:00 SIMULTANEOUS ELECTIVES
    { day: 'FRIDAY', start: '10:00', end: '11:00', course: 'PHY-411-E1', sec: 'BS.PHY7-A (Special SSP-I)', teacher: 'Dr. M. Asim', room: '4.1.21' },
    { day: 'FRIDAY', start: '10:00', end: '11:00', course: 'PHY-413-E2', sec: 'BS.PHY7-A (Lasers Physics-I)', teacher: 'Ms. Aatika', room: '4.1.4' },
    { day: 'FRIDAY', start: '11:00', end: '12:00', course: 'PHY-409', sec: 'BS.PHY7-A', teacher: 'Dr. Muhammad Farhan Taseer', room: '4.1.21' },
    { day: 'FRIDAY', start: '12:00', end: '13:00', course: 'PHY-405', sec: 'BS.PHY7-A', teacher: 'Ms. Aatika', room: '4.1.20' },
    { day: 'FRIDAY', start: '14:00', end: '15:00', course: 'ISL-401', sec: 'BS.PHY7-A', teacher: 'Dr. Muhammad Asghar Javed', room: '4.1.4' },

    // -------------------------------------------------------------
    // PAGE 5: PHY-MPHIL.PHY1 SS (MPhil Self Support)
    // -------------------------------------------------------------
    // Monday
    { day: 'MONDAY', start: '15:00', end: '16:00', course: 'MPHIL-701', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },
    // 16:00-17:00 Simultaneous Electives
    { day: 'MONDAY', start: '16:00', end: '17:00', course: 'MPHIL-705A', sec: 'MPHIL.PHY1-SS (Group A)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'MONDAY', start: '16:00', end: '17:00', course: 'MPHIL-705B', sec: 'MPHIL.PHY1-SS (Group B)', teacher: 'Dr. M. Rafique', room: '4.G.6-A' },
    // 17:00-18:00 Simultaneous Electives
    { day: 'MONDAY', start: '17:00', end: '18:00', course: 'MPHIL-707A', sec: 'MPHIL.PHY1-SS (Group A)', teacher: 'Dr. M. Rafique', room: '4.G.6-A' },
    { day: 'MONDAY', start: '17:00', end: '18:00', course: 'MPHIL-707B', sec: 'MPHIL.PHY1-SS (Group B)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'MONDAY', start: '18:00', end: '19:00', course: 'MPHIL-701', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },

    // Tuesday
    { day: 'TUESDAY', start: '14:00', end: '15:00', course: 'MPHIL-703', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },
    { day: 'TUESDAY', start: '15:00', end: '16:00', course: 'MPHIL-703', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },
    { day: 'TUESDAY', start: '16:00', end: '17:00', course: 'MPHIL-701', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },
    // 17:00-18:00 Simultaneous Electives
    { day: 'TUESDAY', start: '17:00', end: '18:00', course: 'MPHIL-705A', sec: 'MPHIL.PHY1-SS (Group A)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'TUESDAY', start: '17:00', end: '18:00', course: 'MPHIL-705B', sec: 'MPHIL.PHY1-SS (Group B)', teacher: 'Dr. M. Rafique', room: '4.G.6-A' },
    // 18:00-19:00 Simultaneous Electives
    { day: 'TUESDAY', start: '18:00', end: '19:00', course: 'MPHIL-707A', sec: 'MPHIL.PHY1-SS (Group A)', teacher: 'Dr. M. Rafique', room: '4.G.6-A' },
    { day: 'TUESDAY', start: '18:00', end: '19:00', course: 'MPHIL-707B', sec: 'MPHIL.PHY1-SS (Group B)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'TUESDAY', start: '19:00', end: '20:00', course: 'MPHIL-703', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },

    // Wednesday
    { day: 'WEDNESDAY', start: '14:00', end: '15:00', course: 'MPHIL-709', sec: 'MPHIL.PHY1-SS', teacher: 'Ms Zainab Shahid', room: '4.G.6-A' },
    { day: 'WEDNESDAY', start: '15:00', end: '16:00', course: 'MPHIL-709', sec: 'MPHIL.PHY1-SS', teacher: 'Ms Zainab Shahid', room: '4.G.6-A' },
    { day: 'WEDNESDAY', start: '16:00', end: '17:00', course: 'ISL-701', sec: 'MPHIL.PHY1-SS', teacher: 'Dr. Muhammad Shabbir', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '17:00', end: '18:00', course: 'MPHIL-709', sec: 'MPHIL.PHY1-SS', teacher: 'Ms Zainab Shahid', room: '4.G.6-A' },
    // 18:00-19:00 Simultaneous Electives
    { day: 'WEDNESDAY', start: '18:00', end: '19:00', course: 'MPHIL-707A', sec: 'MPHIL.PHY1-SS (Group A)', teacher: 'Dr. M. Rafique', room: '4.G.6-A' },
    { day: 'WEDNESDAY', start: '18:00', end: '19:00', course: 'MPHIL-707B', sec: 'MPHIL.PHY1-SS (Group B)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    // 19:00-20:00 Simultaneous Electives
    { day: 'WEDNESDAY', start: '19:00', end: '20:00', course: 'MPHIL-705A', sec: 'MPHIL.PHY1-SS (Group A)', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '19:00', end: '20:00', course: 'MPHIL-705B', sec: 'MPHIL.PHY1-SS (Group B)', teacher: 'Dr. M. Rafique', room: '4.G.6-A' },

    // -------------------------------------------------------------
    // PAGE 6: PHY-PhD.PHY1 SS (PhD Physics Self Support)
    // -------------------------------------------------------------
    // Wednesday
    { day: 'WEDNESDAY', start: '14:00', end: '15:00', course: 'PHD-807', sec: 'PhD.PHY1-SS', teacher: 'Ms Zainab Shahid', room: '4.G.6-A' },
    { day: 'WEDNESDAY', start: '15:00', end: '16:00', course: 'PHD-807', sec: 'PhD.PHY1-SS', teacher: 'Ms Zainab Shahid', room: '4.G.6-A' },
    { day: 'WEDNESDAY', start: '16:00', end: '17:00', course: 'ISL-701', sec: 'PhD.PHY1-SS', teacher: 'Dr. Muhammad Shabbir', room: '4.1.21' },
    { day: 'WEDNESDAY', start: '17:00', end: '18:00', course: 'PHD-807', sec: 'PhD.PHY1-SS', teacher: 'Ms Zainab Shahid', room: '4.G.6-A' },

    // Thursday (Room 4.1.21)
    { day: 'THURSDAY', start: '14:00', end: '15:00', course: 'PHD-801', sec: 'PhD.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },
    { day: 'THURSDAY', start: '15:00', end: '16:00', course: 'PHD-803', sec: 'PhD.PHY1-SS', teacher: 'Dr. M. Rafique', room: '4.1.21' },
    { day: 'THURSDAY', start: '16:00', end: '17:00', course: 'PHD-805', sec: 'PhD.PHY1-SS', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'THURSDAY', start: '17:00', end: '18:00', course: 'PHD-803', sec: 'PhD.PHY1-SS', teacher: 'Dr. M. Rafique', room: '4.1.21' },
    { day: 'THURSDAY', start: '18:00', end: '19:00', course: 'PHD-801', sec: 'PhD.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },

    // Friday (Room 4.1.21)
    { day: 'FRIDAY', start: '15:00', end: '16:00', course: 'PHD-801', sec: 'PhD.PHY1-SS', teacher: 'Dr. Tariq', room: '4.1.21' },
    { day: 'FRIDAY', start: '16:00', end: '17:00', course: 'PHD-805', sec: 'PhD.PHY1-SS', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'FRIDAY', start: '17:00', end: '18:00', course: 'PHD-805', sec: 'PhD.PHY1-SS', teacher: 'Dr. M. Asif Nawaz', room: '4.1.21' },
    { day: 'FRIDAY', start: '18:00', end: '19:00', course: 'PHD-803', sec: 'PhD.PHY1-SS', teacher: 'Dr. M. Rafique', room: '4.1.21' },
  ];

  let slotsCount = 0;
  for (const s of rawSlots) {
    const course = courseMap.get(s.course);
    const sec = sectionMap.get(s.sec);
    const teacher = teacherMap.get(s.teacher);
    const room = roomMap.get(s.room);

    if (!course || !sec || !teacher || !room) {
      console.warn('Skipping unmatched slot:', s);
      continue;
    }

    await prisma.timetableSlot.create({
      data: {
        dayOfWeek: s.day,
        startTime: s.start,
        endTime: s.end,
        courseId: course.id,
        sectionId: sec.id,
        teacherId: teacher.id,
        roomId: room.id,
      },
    });
    slotsCount++;
  }

  console.log(`\n=======================================================`);
  console.log(`✓ ALL DONE! Ingested ${slotsCount} Official Timetable Slots!`);
  console.log(`- Programs: BS Physics (1, 3, 5, 7), MPhil Physics, PhD Physics`);
  console.log(`- Rooms: 4.1.20 (Router 52), 4.1.21 (Router 52), 4.1.4 (Router 56)`);
  console.log(`- Teachers Default Password: password123`);
  console.log(`=======================================================`);
}

main()
  .catch((err) => {
    console.error('Fatal Error seeding timetable:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
