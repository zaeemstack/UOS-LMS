import prisma from '../src/config/db.js';

// Official Data from Attendance Sheets:
// 1. Attendance Sheet (Digital Electronics-1) - BS PHYSICS (Morning) 7th Semester Session 2023-27 - Course Name: DLD
export const dldStudents = [
  { roll: 'BSPHY-M-23-02', name: 'Salman Ali' },
  { roll: 'BSPHY-M-23-58', name: 'Muddassar Yasin' },
  { roll: 'BSPHY-M-23-17', name: 'Rimsha Ghafoor' },
  { roll: 'BSPHY-M-23-45', name: 'Ayesha Bibi' },
  { roll: 'BSPHY-M-23-35', name: 'M. Azeem Ramzan' },
  { roll: 'BSPHY-M-23-09', name: 'Syeda Sania Zahra' },
  { roll: 'BSPHY-M-23-18', name: 'Aurangzaib Babar' },
  { roll: 'BSPHY-M-23-28', name: 'Iqra' },
  { roll: 'BSPHY-M-23-15', name: 'Noor-ul-Ain' },
  { roll: 'BSPHY-M-23-11', name: 'Usama Ehsan' },
  { roll: 'BSPHY-M-23-19', name: 'Muskan Fatima' },
  { roll: 'BSPHY-M-23-10', name: 'M. Ahmad' },
  { roll: 'BSPHY-M-23-34', name: 'Dua Fatima' },
  { roll: 'BSPHY-M-23-46', name: 'Mubashir Irshad' },
  { roll: 'BSPHY-M-23-08', name: 'M. Hamza Ayyub' },
  { roll: 'BSPHY-M-23-44', name: 'Talha Rauf' },
];

// 2. Attendance Sheet (laser group) - BS PHYSICS (Morning) 7th Semester Session 2023-27 - Course Name: Laser Physics
export const laserStudents = [
  { roll: 'BSPHY-M-23-01', name: 'Areeba Ghafoor' },
  { roll: 'BSPHY-M-23-12', name: 'Iqra Tabbassum' },
  { roll: 'BSPHY-M-23-07', name: 'Iqra Ghaffar' },
  { roll: 'BSPHY-M-23-05', name: 'Khizra Iqbal' },
  { roll: 'BSPHY-M-23-06', name: 'Hina Sajjad' },
  { roll: 'BSPHY-M-23-14', name: 'Misbah Kanwal' },
  { roll: 'BSPHY-M-23-48', name: 'Fatima Khalid' },
  { roll: 'BSPHY-M-23-29', name: 'Taskeen Zanib' },
  { roll: 'BSPHY-M-23-03', name: 'Tayyaba Fatima' },
  { roll: 'BSPHY-M-23-31', name: 'Ghulam Zahra' },
  { roll: 'BSPHY-M-23-50', name: 'Muniba Noor' },
  { roll: 'BSPHY-M-23-49', name: 'Tayyaba Bibi' },
  { roll: 'BSPHY-M-23-20', name: 'Aqsa Batool' },
  { roll: 'BSPHY-M-23-25', name: 'Esha Tariq' },
  { roll: 'BSPHY-M-23-63', name: 'Iram Fatima' },
  { roll: 'BSPHY-M-23-33', name: 'Areej Fatima' },
  { roll: 'BSPHY-M-23-47', name: 'Nayab Zafar' },
];

// 3. Attendance Sheet (Special SSP-1) - BS PHYSICS (Morning) 7th Semester Session 2023-27 - Course Name: SSP
export const sspStudents = [
  { roll: 'BSPHY-M-23-51', name: 'Intiqash Asif' },
  { roll: 'BSPHY-M-23-04', name: 'Maham Arif' },
  { roll: 'BSPHY-M-23-24', name: 'Amina Kaleem' },
  { roll: 'BSPHY-M-23-38', name: 'Sidra Manzoor' },
  { roll: 'BSPHY-M-23-37', name: 'Noor Fatima' },
  { roll: 'BSPHY-M-23-27', name: 'Tayyaba Maryyam Khan' },
  { roll: 'BSPHY-M-23-30', name: 'Rimsha Mustafa' },
  { roll: 'BSPHY-M-23-32', name: 'Bilal Ahmad' },
  { roll: 'BSPHY-M-23-21', name: 'Ahmad Hussain' },
  { roll: 'BSPHY-M-23-43', name: 'Arslan Anwar' },
  { roll: 'BSPHY-M-23-54', name: 'Faisal Iqbal' },
  { roll: 'BSPHY-M-23-60', name: 'M. Awais Shakir' },
  { roll: 'BSPHY-M-23-61', name: 'Bushra Rafi' },
  { roll: 'BSPHY-M-23-56', name: 'Yasir Abbas' },
  { roll: 'BSPHY-M-23-23', name: 'Ahmad Hassan' },
  { roll: 'BSPHY-M-23-40', name: 'Ali Mujahid' },
];

async function main() {
  console.log('=== SYNCING 7TH SEMESTER SPECIALIZED CLASSES & OFFICIAL ROSTERS ===\n');

  const dept = await prisma.department.findUnique({ where: { code: 'PHY' } });
  if (!dept) throw new Error('Physics department not found.');

  // 1. Ensure all 3 Specialized Sections exist
  const mainSec7 = await prisma.section.findFirst({ where: { name: 'BS.PHY7-A' } });
  if (!mainSec7) throw new Error('Main section BS.PHY7-A not found.');

  const secSSP = await prisma.section.upsert({
    where: { name_academicYear: { name: 'BS.PHY7-A (Special SSP-I)', academicYear: '2026-2027' } },
    update: { semester: 7, departmentId: dept.id },
    create: { name: 'BS.PHY7-A (Special SSP-I)', semester: 7, academicYear: '2026-2027', departmentId: dept.id },
  });

  const secLaser = await prisma.section.upsert({
    where: { name_academicYear: { name: 'BS.PHY7-A (Lasers Physics-I)', academicYear: '2026-2027' } },
    update: { semester: 7, departmentId: dept.id },
    create: { name: 'BS.PHY7-A (Lasers Physics-I)', semester: 7, academicYear: '2026-2027', departmentId: dept.id },
  });

  const secDLD = await prisma.section.upsert({
    where: { name_academicYear: { name: 'BS.PHY7-A (Digital Electronics-I)', academicYear: '2026-2027' } },
    update: { semester: 7, departmentId: dept.id },
    create: { name: 'BS.PHY7-A (Digital Electronics-I)', semester: 7, academicYear: '2026-2027', departmentId: dept.id },
  });

  console.log(`✓ Sections Ready:`);
  console.log(`  - ${mainSec7.name} (ID: ${mainSec7.id})`);
  console.log(`  - ${secSSP.name} (ID: ${secSSP.id})`);
  console.log(`  - ${secLaser.name} (ID: ${secLaser.id})`);
  console.log(`  - ${secDLD.name} (ID: ${secDLD.id})\n`);

  // 2. Remove old enrollments from specialized elective sections only
  const deletedOld = await prisma.studentSection.deleteMany({
    where: {
      sectionId: { in: [secSSP.id, secLaser.id, secDLD.id] },
    },
  });
  console.log(`✓ Cleared ${deletedOld.count} outdated specialized section enrollments.\n`);

  // Helper to sync group
  async function enrollGroup(groupName, studentsList, sectionId) {
    console.log(`--- Enrolling ${groupName} (${studentsList.length} students) ---`);
    for (const item of studentsList) {
      // Find or update user name
      let user = await prisma.user.findUnique({ where: { employeeOrRollId: item.roll } });
      if (user) {
        if (user.fullName !== item.name) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { fullName: item.name },
          });
          console.log(`  [Updated Name] ${item.roll} -> ${item.name}`);
        }
      } else {
        const email = `${item.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;
        user = await prisma.user.create({
          data: {
            email,
            passwordHash: '$2a$10$wO3t6eQhA5LqF2J1Y6y6uuuR1iK6YmQ6jP0p2uF4p9o7Z2X6y6uuu', // password123 default
            fullName: item.name,
            employeeOrRollId: item.roll,
            role: 'STUDENT',
            departmentId: dept.id,
          },
        });
        console.log(`  [Created Account] ${item.roll} -> ${item.name}`);
      }

      // Ensure enrolled in Main BS.PHY7-A
      await prisma.studentSection.upsert({
        where: { studentId_sectionId: { studentId: user.id, sectionId: mainSec7.id } },
        update: {},
        create: { studentId: user.id, sectionId: mainSec7.id },
      });

      // Enroll in specialized class section
      await prisma.studentSection.upsert({
        where: { studentId_sectionId: { studentId: user.id, sectionId: sectionId } },
        update: {},
        create: { studentId: user.id, sectionId: sectionId },
      });

      console.log(`  ✓ ${item.roll} | ${item.name}`);
    }
    console.log(`Completed ${groupName}.\n`);
  }

  // Enroll in DLD
  await enrollGroup('Digital Electronics-1 (DLD)', dldStudents, secDLD.id);

  // Enroll in Laser Physics
  await enrollGroup('Laser Physics (laser group)', laserStudents, secLaser.id);

  // Enroll in Special SSP-1
  await enrollGroup('Special SSP-1 (SSP)', sspStudents, secSSP.id);

  // 3. Update Timetable Slots to route to the correct specialized sections
  console.log('--- Updating Timetable Slots to Specialized Sections ---');

  // PHY-403 (Digital Electronics-I theory) & PHY-403L (lab) -> secDLD.id
  const updatedDLD = await prisma.timetableSlot.updateMany({
    where: {
      course: { code: { in: ['PHY-403', 'PHY-403L'] } },
    },
    data: {
      sectionId: secDLD.id,
    },
  });
  console.log(`✓ Re-routed ${updatedDLD.count} Digital Electronics (PHY-403, PHY-403L) slots to ${secDLD.name}`);

  // PHY-405L (Lasers Laboratory) -> secLaser.id
  const updatedLaserLab = await prisma.timetableSlot.updateMany({
    where: {
      course: { code: 'PHY-405L' },
    },
    data: {
      sectionId: secLaser.id,
    },
  });
  console.log(`✓ Re-routed ${updatedLaserLab.count} Lasers Laboratory (PHY-405L) slots to ${secLaser.name}`);

  // PHY-413-E2 (Lasers Physics-I) -> secLaser.id
  const updatedLaserTheory = await prisma.timetableSlot.updateMany({
    where: {
      course: { code: 'PHY-413-E2' },
    },
    data: {
      sectionId: secLaser.id,
    },
  });
  console.log(`✓ Verified ${updatedLaserTheory.count} Lasers Physics-I (PHY-413-E2) slots in ${secLaser.name}`);

  // PHY-411-E1 (Special SSP-I) -> secSSP.id
  const updatedSSP = await prisma.timetableSlot.updateMany({
    where: {
      course: { code: 'PHY-411-E1' },
    },
    data: {
      sectionId: secSSP.id,
    },
  });
  console.log(`✓ Verified ${updatedSSP.count} Special SSP-I (PHY-411-E1) slots in ${secSSP.name}\n`);

  // 4. Verification Counts
  const dldCount = await prisma.studentSection.count({ where: { sectionId: secDLD.id } });
  const laserCount = await prisma.studentSection.count({ where: { sectionId: secLaser.id } });
  const sspCount = await prisma.studentSection.count({ where: { sectionId: secSSP.id } });
  const mainCount = await prisma.studentSection.count({ where: { sectionId: mainSec7.id } });

  console.log('===================================================================');
  console.log(' VERIFICATION SUMMARY:');
  console.log(` - Main BS.PHY7-A Core Cohort:          ${mainCount} students`);
  console.log(` - BS.PHY7-A (Digital Electronics-I):   ${dldCount} students (Expected: 16)`);
  console.log(` - BS.PHY7-A (Lasers Physics-I):        ${laserCount} students (Expected: 17)`);
  console.log(` - BS.PHY7-A (Special SSP-I):           ${sspCount} students (Expected: 16)`);
  console.log('===================================================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
