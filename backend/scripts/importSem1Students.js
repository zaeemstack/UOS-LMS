import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';

// BS PHYSICS (MORNING) 1st Semester Session 2026-30
export const sem1Students = [
  { roll: 'BSPHY-M-26-01', name: 'Arooj Fatima' },
  { roll: 'BSPHY-M-26-02', name: 'Aneela Saeed' },
  { roll: 'BSPHY-M-26-03', name: 'Ahmad Faraz' },
  { roll: 'BSPHY-M-26-04', name: 'Ayesha Rafiq' },
  { roll: 'BSPHY-M-26-05', name: 'Aleeha Gul' },
  { roll: 'BSPHY-M-26-06', name: 'Ambreen Arshad' },
  { roll: 'BSPHY-M-26-07', name: 'Anabia' },
  { roll: 'BSPHY-M-26-08', name: 'Namal Fatima' },
  { roll: 'BSPHY-M-26-09', name: 'Fatima Naz' },
  { roll: 'BSPHY-M-26-10', name: 'Maryam Tanveer' },
  { roll: 'BSPHY-M-26-11', name: 'Javeria' },
  { roll: 'BSPHY-M-26-12', name: 'Maleeha Khan' },
  { roll: 'BSPHY-M-26-13', name: 'Umair Chiragh' },
  { roll: 'BSPHY-M-26-14', name: 'Muhammad Usman' },
  { roll: 'BSPHY-M-26-15', name: 'Zain Ul Abdin' },
  { roll: 'BSPHY-M-26-16', name: 'M. Muzammal Shakoor' },
  { roll: 'BSPHY-M-26-17', name: 'Maryam Yousaf' },
  { roll: 'BSPHY-M-26-18', name: 'Priwish Hadia' },
  { roll: 'BSPHY-M-26-19', name: 'Sara Chaughdary' },
  { roll: 'BSPHY-M-26-20', name: 'Sania Zulfiqar' },
  { roll: 'BSPHY-M-26-21', name: 'Rizwan Ali' },
  { roll: 'BSPHY-M-26-22', name: 'Rabia Munir' },
  { roll: 'BSPHY-M-26-23', name: 'Rameen Nasir' },
  { roll: 'BSPHY-M-26-24', name: 'Yasmeen' },
  { roll: 'BSPHY-M-26-25', name: 'Ayesha Sajid' },
  { roll: 'BSPHY-M-26-26', name: 'Syed Salih' },
  { roll: 'BSPHY-M-26-27', name: 'Breeha Iman' },
  { roll: 'BSPHY-M-26-28', name: 'Arshiya' },
  { roll: 'BSPHY-M-26-29', name: 'Abu Zar' },
];

async function main() {
  console.log('=== IMPORTING BS PHYSICS 1ST SEMESTER (SESSION 2026-30) STUDENTS ===\n');

  const dept = await prisma.department.findUnique({ where: { code: 'PHY' } });
  if (!dept) throw new Error('Physics department not found.');

  const sec1 = await prisma.section.findFirst({ where: { name: 'BS.PHY1-A' } });
  if (!sec1) throw new Error('Section BS.PHY1-A not found.');

  console.log(`Target Section: ${sec1.name} (Semester ${sec1.semester}, Academic Year ${sec1.academicYear})`);
  console.log(`Target Department: ${dept.name} (${dept.code})\n`);

  const passwordHash = await bcrypt.hash('password123', 10);

  let createdCount = 0;
  let enrolledCount = 0;

  for (const st of sem1Students) {
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
    createdCount++;

    await prisma.studentSection.upsert({
      where: {
        studentId_sectionId: {
          studentId: user.id,
          sectionId: sec1.id,
        },
      },
      update: {},
      create: {
        studentId: user.id,
        sectionId: sec1.id,
      },
    });
    enrolledCount++;

    console.log(`✓ [${st.roll}] ${st.name} -> Enrolled into ${sec1.name}`);
  }

  const finalSectionCount = await prisma.studentSection.count({
    where: { sectionId: sec1.id },
  });

  console.log('\n===================================================================');
  console.log(' IMPORT COMPLETE:');
  console.log(` Total Students Processed: ${sem1Students.length}`);
  console.log(` Section BS.PHY1-A Total Enrolled Students: ${finalSectionCount}`);
  console.log('===================================================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
