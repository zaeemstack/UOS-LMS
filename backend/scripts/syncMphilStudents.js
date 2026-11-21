import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';

// =========================================================================
// MPhil-Physics 1st Semester (Session Fall 2026-28)
// 1. All 30 Students (Simple / Main Section: MPHIL.PHY1-SS)
// =========================================================================
export const mphilAllStudents = [
  { roll: '26010301-001', name: 'Rabbia Waheed' },
  { roll: '26010301-002', name: 'Ramsha Saeed' },
  { roll: '26010301-003', name: 'Muhammad Hamza' },
  { roll: '26010301-004', name: 'Eisha Amin' },
  { roll: '26010301-005', name: 'Asma Shafique' },
  { roll: '26010301-006', name: 'Areeba Zahid' },
  { roll: '26010301-007', name: 'Ayesha Siddique' },
  { roll: '26010301-008', name: 'Zahra Rubab' },
  { roll: '26010301-009', name: 'Ayesha Bibi' },
  { roll: '26010301-010', name: 'Kiran Shehzadi' },
  { roll: '26010301-011', name: 'Syeda Gul e Zainab' },
  { roll: '26010301-012', name: 'Moaz Ahmad' },
  { roll: '26010301-013', name: 'Bushra Umar' },
  { roll: '26010301-014', name: 'Nimra Iqbal' },
  { roll: '26010301-015', name: 'Esha Sadiq' },
  { roll: '26010301-016', name: 'Laiba Habib' },
  { roll: '26010301-017', name: 'Salma Bibi' },
  { roll: '26010301-018', name: 'Ashmal Mubeen' },
  { roll: '26010301-019', name: 'Aqsa Alllah Ditta' },
  { roll: '26010301-020', name: 'Nimra Sehrish' },
  { roll: '26010301-021', name: 'Iqra Saleem' },
  { roll: '26010301-022', name: 'Azka Gull' },
  { roll: '26010301-023', name: 'Eisha Tur Razia' },
  { roll: '26010301-024', name: 'Saim Akhtar' },
  { roll: '26010301-025', name: 'Khadija Ghaffar' },
  { roll: '26010301-026', name: 'Amna Baqar Ali' },
  { roll: '26010301-027', name: 'Areeba Murtaza' },
  { roll: '26010301-028', name: 'Sidra Batool' },
  { roll: '26010301-029', name: 'Basit Ali' },
  { roll: '26010301-030', name: 'Nasmah Jamil' },
];

// =========================================================================
// 2. Group A (Material science & catalysis science and technology) - 15 Students
// Section: MPHIL.PHY1-SS (Group A)
// =========================================================================
export const mphilGroupA = [
  { roll: '26010301-006', name: 'Areeba Zahid' },
  { roll: '26010301-007', name: 'Ayesha Siddique' },
  { roll: '26010301-010', name: 'Kiran Shehzadi' },
  { roll: '26010301-011', name: 'Syeda Gul e Zainab' },
  { roll: '26010301-014', name: 'Nimra Iqbal' },
  { roll: '26010301-017', name: 'Salma Bibi' },
  { roll: '26010301-018', name: 'Ashmal Mubeen' },
  { roll: '26010301-019', name: 'Aqsa Alllah Ditta' },
  { roll: '26010301-020', name: 'Nimra Sehrish' },
  { roll: '26010301-021', name: 'Iqra Saleem' },
  { roll: '26010301-022', name: 'Azka Gull' },
  { roll: '26010301-025', name: 'Khadija Ghaffar' },
  { roll: '26010301-026', name: 'Amna Baqar Ali' },
  { roll: '26010301-027', name: 'Areeba Murtaza' },
  { roll: '26010301-028', name: 'Sidra Batool' },
];

// =========================================================================
// 3. Group B (Nanomaterials & Electronics Structure Methods) - 15 Students
// Section: MPHIL.PHY1-SS (Group B)
// =========================================================================
export const mphilGroupB = [
  { roll: '26010301-001', name: 'Rabbia Waheed' },
  { roll: '26010301-002', name: 'Ramsha Saeed' },
  { roll: '26010301-003', name: 'Muhammad Hamza' },
  { roll: '26010301-004', name: 'Eisha Amin' },
  { roll: '26010301-005', name: 'Asma Shafique' },
  { roll: '26010301-008', name: 'Zahra Rubab' },
  { roll: '26010301-009', name: 'Ayesha Bibi' },
  { roll: '26010301-012', name: 'Moaz Ahmad' },
  { roll: '26010301-013', name: 'Bushra Umar' },
  { roll: '26010301-015', name: 'Esha Sadiq' },
  { roll: '26010301-016', name: 'Laiba Habib' },
  { roll: '26010301-023', name: 'Eisha Tur Razia' },
  { roll: '26010301-024', name: 'Saim Akhtar' },
  { roll: '26010301-029', name: 'Basit Ali' },
  { roll: '26010301-030', name: 'Nasmah Jamil' },
];

async function main() {
  console.log('=== SYNCING MPHIL PHYSICS 1ST SEMESTER STUDENTS (SIMPLE & GROUP-WISE) ===\n');

  const dept = await prisma.department.findUnique({ where: { code: 'PHY' } });
  if (!dept) throw new Error('Physics department not found.');

  // 1. Ensure Sections exist
  const mainSec = await prisma.section.upsert({
    where: { name_academicYear: { name: 'MPHIL.PHY1-SS', academicYear: '2026-2027' } },
    update: { semester: 1, departmentId: dept.id },
    create: { name: 'MPHIL.PHY1-SS', semester: 1, academicYear: '2026-2027', departmentId: dept.id },
  });

  const secA = await prisma.section.upsert({
    where: { name_academicYear: { name: 'MPHIL.PHY1-SS (Group A)', academicYear: '2026-2027' } },
    update: { semester: 1, departmentId: dept.id },
    create: { name: 'MPHIL.PHY1-SS (Group A)', semester: 1, academicYear: '2026-2027', departmentId: dept.id },
  });

  const secB = await prisma.section.upsert({
    where: { name_academicYear: { name: 'MPHIL.PHY1-SS (Group B)', academicYear: '2026-2027' } },
    update: { semester: 1, departmentId: dept.id },
    create: { name: 'MPHIL.PHY1-SS (Group B)', semester: 1, academicYear: '2026-2027', departmentId: dept.id },
  });

  console.log(`✓ Sections Verified:`);
  console.log(`  - Main (Simple): ${mainSec.name}`);
  console.log(`  - Group A:       ${secA.name}`);
  console.log(`  - Group B:       ${secB.name}\n`);

  // Clear previous dummy MPhil student sections if any
  await prisma.studentSection.deleteMany({
    where: {
      sectionId: { in: [mainSec.id, secA.id, secB.id] },
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const groupASet = new Set(mphilGroupA.map((s) => s.roll));
  const groupBSet = new Set(mphilGroupB.map((s) => s.roll));

  console.log(`--- Enrolling 30 Students into Main Section & Specific Groups ---`);
  for (const st of mphilAllStudents) {
    const email = `${st.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;

    const user = await prisma.user.upsert({
      where: { employeeOrRollId: st.roll },
      update: {
        fullName: st.name,
        departmentId: dept.id,
        role: 'STUDENT',
      },
      create: {
        email,
        passwordHash,
        fullName: st.name,
        employeeOrRollId: st.roll,
        role: 'STUDENT',
        departmentId: dept.id,
      },
    });

    // 1. Simple / Main Section Enrollment
    await prisma.studentSection.upsert({
      where: { studentId_sectionId: { studentId: user.id, sectionId: mainSec.id } },
      update: {},
      create: { studentId: user.id, sectionId: mainSec.id },
    });

    // 2. Group-wise Enrollment
    let assignedGroup = 'None';
    if (groupASet.has(st.roll)) {
      await prisma.studentSection.upsert({
        where: { studentId_sectionId: { studentId: user.id, sectionId: secA.id } },
        update: {},
        create: { studentId: user.id, sectionId: secA.id },
      });
      assignedGroup = 'Group A';
    } else if (groupBSet.has(st.roll)) {
      await prisma.studentSection.upsert({
        where: { studentId_sectionId: { studentId: user.id, sectionId: secB.id } },
        update: {},
        create: { studentId: user.id, sectionId: secB.id },
      });
      assignedGroup = 'Group B';
    }

    console.log(`✓ [${st.roll}] ${st.name} -> Main (MPHIL.PHY1-SS) + ${assignedGroup}`);
  }

  // Verification counts
  const mainCount = await prisma.studentSection.count({ where: { sectionId: mainSec.id } });
  const aCount = await prisma.studentSection.count({ where: { sectionId: secA.id } });
  const bCount = await prisma.studentSection.count({ where: { sectionId: secB.id } });

  console.log('\n===================================================================');
  console.log(' VERIFICATION SUMMARY:');
  console.log(` - MPHIL.PHY1-SS (Simple / Main):    ${mainCount} students (Expected: 30)`);
  console.log(` - MPHIL.PHY1-SS (Group A):          ${aCount} students (Expected: 15)`);
  console.log(` - MPHIL.PHY1-SS (Group B):          ${bCount} students (Expected: 15)`);
  console.log('===================================================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
