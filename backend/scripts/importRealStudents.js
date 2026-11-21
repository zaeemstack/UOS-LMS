import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';

// =========================================================================
// Mid-Term Attendance Sheet 1: BS PHYSICS (MORNING) 3rd Semester Session 2025-29
// Section: BS.PHY3-A (Semester 3) - 40 Students
// =========================================================================
export const sem3Students = [
  { roll: 'BSPHY-M-25-01', name: 'Abdul Rafay' },
  { roll: 'BSPHY-M-25-02', name: 'Abu Zar' },
  { roll: 'BSPHY-M-25-03', name: 'Amna Amjad' },
  { roll: 'BSPHY-M-25-04', name: 'Areesh Fatima' },
  { roll: 'BSPHY-M-25-05', name: 'Aveeza Amjad' },
  { roll: 'BSPHY-M-25-06', name: 'Ayesha Komal' },
  { roll: 'BSPHY-M-25-07', name: 'Bashair Aslam' },
  { roll: 'BSPHY-M-25-08', name: 'Eishal Mumtaz' },
  { roll: 'BSPHY-M-25-09', name: 'Eman Liaqat' },
  { roll: 'BSPHY-M-25-10', name: 'Faiqa Anwar' },
  { roll: 'BSPHY-M-25-11', name: 'Fiza Iftikhar' },
  { roll: 'BSPHY-M-25-12', name: 'Fizza Saeed' },
  { roll: 'BSPHY-M-25-13', name: 'Hafiza Fazilat Mehmood' },
  { roll: 'BSPHY-M-25-14', name: 'Hamda Asghar' },
  { roll: 'BSPHY-M-25-15', name: 'Harram Farooq' },
  { roll: 'BSPHY-M-25-16', name: 'Haseeba Rehman' },
  { roll: 'BSPHY-M-25-17', name: 'Iqra Zaigham' },
  { roll: 'BSPHY-M-25-18', name: 'Javeria Zahid' },
  { roll: 'BSPHY-M-25-19', name: 'Khadija Ahmed' },
  { roll: 'BSPHY-M-25-20', name: 'M Aftab Akhtar' },
  { roll: 'BSPHY-M-25-21', name: 'M Mohsin Azhar' },
  { roll: 'BSPHY-M-25-22', name: 'M Raza Khan' },
  { roll: 'BSPHY-M-25-23', name: 'M Zohaib' },
  { roll: 'BSPHY-M-25-24', name: 'Manahil Zainab' },
  { roll: 'BSPHY-M-25-25', name: 'Maryam Amjad' },
  { roll: 'BSPHY-M-25-26', name: 'Maryam Fayyaz' },
  { roll: 'BSPHY-M-25-27', name: 'Maryam Shahid' },
  { roll: 'BSPHY-M-25-28', name: 'Mashal Fatima' },
  { roll: 'BSPHY-M-25-29', name: 'Mubara Javed' },
  { roll: 'BSPHY-M-25-30', name: 'Mubashra Farooq' },
  { roll: 'BSPHY-M-25-31', name: 'Muqaddas Farooq' },
  { roll: 'BSPHY-M-25-32', name: 'Nimra Fayyaz' },
  { roll: 'BSPHY-M-25-33', name: 'Qaisar Naveed' },
  { roll: 'BSPHY-M-25-34', name: 'Rabia Khizar Hayaat' },
  { roll: 'BSPHY-M-25-35', name: 'Rimsha BiBi' },
  { roll: 'BSPHY-M-25-36', name: 'Shumaila Ismail' },
  { roll: 'BSPHY-M-25-37', name: 'Urooj' },
  { roll: 'BSPHY-M-25-38', name: 'Zainab Shahid' },
  { roll: 'BSPHY-M-25-39', name: 'Zikra Mubeen' },
  { roll: 'BSPHY-M-25-40', name: 'Zunaira Khalid' },
];

// =========================================================================
// Mid-Term Attendance Sheet 3: BS PHYSICS (Morning) 5th Semester Session 2024-28
// Section: BS.PHY5-A (Semester 5) - 47 Students
// =========================================================================
export const sem5Students = [
  { roll: 'BSPHY-M-24-01', name: 'Ali Ahmad' },
  { roll: 'BSPHY-M-24-02', name: 'Alina Akhtar' },
  { roll: 'BSPHY-M-24-03', name: 'Muhmmad Umar' },
  { roll: 'BSPHY-M-24-04', name: 'Aiza Ali' },
  { roll: 'BSPHY-M-24-05', name: 'Paryanka Naseem' },
  { roll: 'BSPHY-M-24-06', name: 'Ahmed Bilal' },
  { roll: 'BSPHY-M-24-07', name: 'Fatima Tul Zahra' },
  { roll: 'BSPHY-M-24-08', name: 'Salaha Irshad' },
  { roll: 'BSPHY-M-24-09', name: 'Muskan Mehmood' },
  { roll: 'BSPHY-M-24-10', name: 'Mariam Qamar' },
  { roll: 'BSPHY-M-24-11', name: 'Nosheen Maryam' },
  { roll: 'BSPHY-M-24-12', name: 'Laiba Mishal' },
  { roll: 'BSPHY-M-24-13', name: 'Maham Murtaza' },
  { roll: 'BSPHY-M-24-14', name: 'Areesh Fatima' },
  { roll: 'BSPHY-M-24-15', name: 'Sadia Afzal' },
  { roll: 'BSPHY-M-24-16', name: 'Noor Fatima' },
  { roll: 'BSPHY-M-24-17', name: 'Saira Ashraf' },
  { roll: 'BSPHY-M-24-18', name: 'Ahsan Raza' },
  { roll: 'BSPHY-M-24-19', name: 'Muhammad Taha Rafique' },
  { roll: 'BSPHY-M-24-20', name: 'Sabeeha Noreen' },
  { roll: 'BSPHY-M-24-21', name: 'Ifrah Fatima' },
  { roll: 'BSPHY-M-24-22', name: 'Iram Altaf' },
  { roll: 'BSPHY-M-24-23', name: 'Qasir Naadeem' },
  { roll: 'BSPHY-M-24-24', name: 'Arisha Zahid' },
  { roll: 'BSPHY-M-24-25', name: 'Romaan Raiz' },
  { roll: 'BSPHY-M-24-26', name: 'Fatima Murtaza' },
  { roll: 'BSPHY-M-24-27', name: 'Zainab Fatima' },
  { roll: 'BSPHY-M-24-28', name: 'Maryum Iftikhar' },
  { roll: 'BSPHY-M-24-29', name: 'Shama Yaseen' },
  { roll: 'BSPHY-M-24-30', name: 'Muhmmad Adeel' },
  { roll: 'BSPHY-M-24-31', name: 'Muhammad Sohaib Asghar' },
  { roll: 'BSPHY-M-24-32', name: 'Sidra Bashir' },
  { roll: 'BSPHY-M-24-33', name: 'Hafiza Shumaila Kanwal' },
  { roll: 'BSPHY-M-24-34', name: 'Sana Noor' },
  { roll: 'BSPHY-M-24-35', name: 'Muhammad Bilal' },
  { roll: 'BSPHY-M-24-36', name: 'Javaria Zahid' },
  { roll: 'BSPHY-M-24-37', name: 'Khadija' },
  { roll: 'BSPHY-M-24-38', name: 'Muzmal Latif' },
  { roll: 'BSPHY-M-24-39', name: 'Amina' },
  { roll: 'BSPHY-M-24-40', name: 'Ayesha Farooq' },
  { roll: 'BSPHY-M-24-41', name: 'Ayesha Zarnab' },
  { roll: 'BSPHY-M-24-42', name: 'Ali Saqlain' },
  { roll: 'BSPHY-M-24-43', name: 'Aliyan Ahmad' },
  { roll: 'BSPHY-M-24-44', name: 'Anila Mumtaz' },
  { roll: 'BSPHY-M-24-45', name: 'Malika Amjad' },
  { roll: 'BSPHY-M-24-46', name: 'Aqsa' },
  { roll: 'BSPHY-M-24-47', name: 'Umm e Aimen Kkalid' },
];

// =========================================================================
// Mid-Term Attendance Sheet 2: BS PHYSICS (Morning) 7th Semester Session 2023-27
// Section: BS.PHY7-A (Semester 7) - 60 Students
// =========================================================================
export const sem7Students = [
  { roll: 'BSPHY-M-23-01', name: 'Areeba Ghafoor' },
  { roll: 'BSPHY-M-23-02', name: 'Salman Ali' },
  { roll: 'BSPHY-M-23-03', name: 'Tayyaba Fatima' },
  { roll: 'BSPHY-M-23-04', name: 'Maham Arif' },
  { roll: 'BSPHY-M-23-05', name: 'Khizra Iqbal' },
  { roll: 'BSPHY-M-23-06', name: 'Hina Sajjad' },
  { roll: 'BSPHY-M-23-07', name: 'Iqra Ghaffar' },
  { roll: 'BSPHY-M-23-08', name: 'Muhammad Hamza Ayub' },
  { roll: 'BSPHY-M-23-09', name: 'Sieda Sania Zahira Naqvi' },
  { roll: 'BSPHY-M-23-10', name: 'Muhammd Ahmad' },
  { roll: 'BSPHY-M-23-11', name: 'Usama Ehsan' },
  { roll: 'BSPHY-M-23-12', name: 'Iqra Tabassum' },
  { roll: 'BSPHY-M-23-14', name: 'Misbah Kanwal' },
  { roll: 'BSPHY-M-23-15', name: 'Noor Ul Ainn' },
  { roll: 'BSPHY-M-23-16', name: 'Minahil Nazir' },
  { roll: 'BSPHY-M-23-17', name: 'Rimsha Ghafoor' },
  { roll: 'BSPHY-M-23-18', name: 'Aurangzaib Babar' },
  { roll: 'BSPHY-M-23-19', name: 'Muskan Fatima' },
  { roll: 'BSPHY-M-23-20', name: 'Aqsa Batool' },
  { roll: 'BSPHY-M-23-21', name: 'Muhammad Ahmad Hussain' },
  { roll: 'BSPHY-M-23-22', name: 'Rizwan Hassan' },
  { roll: 'BSPHY-M-23-23', name: 'Ahmad Hassan' },
  { roll: 'BSPHY-M-23-24', name: 'Amina Kaleem' },
  { roll: 'BSPHY-M-23-25', name: 'Esha Tariq' },
  { roll: 'BSPHY-M-23-27', name: 'Tayyaba Maryam Khan' },
  { roll: 'BSPHY-M-23-28', name: 'Iqra' },
  { roll: 'BSPHY-M-23-29', name: 'Taskeen Zainab' },
  { roll: 'BSPHY-M-23-30', name: 'Rimsha Mustafa' },
  { roll: 'BSPHY-M-23-31', name: 'Ghulam Zahra' },
  { roll: 'BSPHY-M-23-32', name: 'Bilal Ahmed' },
  { roll: 'BSPHY-M-23-33', name: 'Areej Fatima' },
  { roll: 'BSPHY-M-23-34', name: 'Dua Fatima' },
  { roll: 'BSPHY-M-23-35', name: 'M. Azeem Ramzan' },
  { roll: 'BSPHY-M-23-37', name: 'Noor Fatima' },
  { roll: 'BSPHY-M-23-38', name: 'Sidra Manzoor' },
  { roll: 'BSPHY-M-23-39', name: 'Iftikhar Hussain' },
  { roll: 'BSPHY-M-23-40', name: 'Ali Mujahid' },
  { roll: 'BSPHY-M-23-41', name: 'Adeel Qamar' },
  { roll: 'BSPHY-M-23-42', name: 'Ulfat Abbas' },
  { roll: 'BSPHY-M-23-43', name: 'Arslan Anwar' },
  { roll: 'BSPHY-M-23-44', name: 'Talha Rauf' },
  { roll: 'BSPHY-M-23-45', name: 'Ayesha Bibi' },
  { roll: 'BSPHY-M-23-46', name: 'Mubashar Irshad' },
  { roll: 'BSPHY-M-23-47', name: 'Nayab Zafar' },
  { roll: 'BSPHY-M-23-48', name: 'Fatima Khalid' },
  { roll: 'BSPHY-M-23-49', name: 'Tayyaba Bibi' },
  { roll: 'BSPHY-M-23-50', name: 'Muniba Noor' },
  { roll: 'BSPHY-M-23-51', name: 'Intqash Asif' },
  { roll: 'BSPHY-M-23-52', name: 'Mehak Ali' },
  { roll: 'BSPHY-M-23-53', name: 'Fatima' },
  { roll: 'BSPHY-M-23-54', name: 'Faisal Iqbal' },
  { roll: 'BSPHY-M-23-55', name: 'Asad Abbas' },
  { roll: 'BSPHY-M-23-56', name: 'Muhammad Yasir Abbas' },
  { roll: 'BSPHY-M-23-57', name: 'Shahzad Ahmad' },
  { roll: 'BSPHY-M-23-58', name: 'Muddasar Yasin' },
  { roll: 'BSPHY-M-23-59', name: 'Kiran Shehzadi' },
  { roll: 'BSPHY-M-23-60', name: 'Muhammad Awais Shakir' },
  { roll: 'BSPHY-M-23-61', name: 'Bushra Rafi' },
  { roll: 'BSPHY-M-23-62', name: 'Aveeza Amjad' },
  { roll: 'BSPHY-M-23-63', name: 'Iram Fatima' },
];

async function importSectionStudents(sectionName, studentList, deptId, passwordHash, additionalSectionName = null) {
  const section = await prisma.section.findFirst({
    where: { name: sectionName },
    include: { students: true }
  });

  if (!section) {
    console.error(`Section ${sectionName} not found!`);
    return;
  }

  let additionalSection = null;
  if (additionalSectionName) {
    additionalSection = await prisma.section.findFirst({
      where: { name: additionalSectionName }
    });
  }

  console.log(`\n========================================`);
  console.log(`Processing Section: ${sectionName} (${section.id})`);
  console.log(`Importing ${studentList.length} real students...`);

  // Insert real students
  let addedCount = 0;
  for (const item of studentList) {
    const email = `${item.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;

    const user = await prisma.user.upsert({
      where: { employeeOrRollId: item.roll },
      update: {
        fullName: item.name,
        role: 'STUDENT',
        departmentId: deptId,
      },
      create: {
        email,
        passwordHash,
        fullName: item.name,
        employeeOrRollId: item.roll,
        role: 'STUDENT',
        departmentId: deptId,
      }
    });

    await prisma.studentSection.upsert({
      where: {
        studentId_sectionId: {
          studentId: user.id,
          sectionId: section.id,
        }
      },
      update: {},
      create: {
        studentId: user.id,
        sectionId: section.id,
      }
    });

    if (additionalSection) {
      await prisma.studentSection.upsert({
        where: {
          studentId_sectionId: {
            studentId: user.id,
            sectionId: additionalSection.id,
          }
        },
        update: {},
        create: {
          studentId: user.id,
          sectionId: additionalSection.id,
        }
      });
    }

    addedCount++;
  }

  console.log(`Successfully enrolled ${addedCount} real students into ${sectionName}!`);
}

async function main() {
  const dept = await prisma.department.findUnique({
    where: { code: 'PHY' }
  });

  if (!dept) {
    throw new Error('Physics department (PHY) not found!');
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. BS Physics 3rd Semester Session 2025-29 (40 students -> BS.PHY3-A)
  await importSectionStudents('BS.PHY3-A', sem3Students, dept.id, passwordHash);

  // 2. BS Physics 5th Semester Session 2024-28 (47 students -> BS.PHY5-A)
  await importSectionStudents('BS.PHY5-A', sem5Students, dept.id, passwordHash);

  // 3. BS Physics 7th Semester Session 2023-27 (60 students -> BS.PHY7-A & Electives)
  await importSectionStudents('BS.PHY7-A', sem7Students.slice(0, 30), dept.id, passwordHash, 'BS.PHY7-A (Special SSP-I)');
  await importSectionStudents('BS.PHY7-A', sem7Students.slice(30), dept.id, passwordHash, 'BS.PHY7-A (Lasers Physics-I)');

  console.log('\n========================================');
  console.log('All real students imported successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
