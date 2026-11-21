import prisma from '../src/config/db.js';
import bcrypt from 'bcryptjs';

// =========================================================================
// Mid-Term Attendance Sheet: BS PHYSICS (MORNING) 1st Semester Session 2026-30
// Section: BS.PHY1-A (Semester 1) - 29 Students
// =========================================================================
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
// Electives: Special SSP-I, Lasers Physics-I, Digital Electronics-I
// =========================================================================
export const sem7SpecializedDLD = [
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

export const sem7SpecializedLaser = [
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

export const sem7SpecializedSSP = [
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

export const sem7Students = [
  { roll: 'BSPHY-M-23-01', name: 'Areeba Ghafoor' },
  { roll: 'BSPHY-M-23-02', name: 'Salman Ali' },
  { roll: 'BSPHY-M-23-03', name: 'Tayyaba Fatima' },
  { roll: 'BSPHY-M-23-04', name: 'Maham Arif' },
  { roll: 'BSPHY-M-23-05', name: 'Khizra Iqbal' },
  { roll: 'BSPHY-M-23-06', name: 'Hina Sajjad' },
  { roll: 'BSPHY-M-23-07', name: 'Iqra Ghaffar' },
  { roll: 'BSPHY-M-23-08', name: 'M. Hamza Ayyub' },
  { roll: 'BSPHY-M-23-09', name: 'Syeda Sania Zahra' },
  { roll: 'BSPHY-M-23-10', name: 'M. Ahmad' },
  { roll: 'BSPHY-M-23-11', name: 'Usama Ehsan' },
  { roll: 'BSPHY-M-23-12', name: 'Iqra Tabbassum' },
  { roll: 'BSPHY-M-23-14', name: 'Misbah Kanwal' },
  { roll: 'BSPHY-M-23-15', name: 'Noor-ul-Ain' },
  { roll: 'BSPHY-M-23-16', name: 'Minahil Nazir' },
  { roll: 'BSPHY-M-23-17', name: 'Rimsha Ghafoor' },
  { roll: 'BSPHY-M-23-18', name: 'Aurangzaib Babar' },
  { roll: 'BSPHY-M-23-19', name: 'Muskan Fatima' },
  { roll: 'BSPHY-M-23-20', name: 'Aqsa Batool' },
  { roll: 'BSPHY-M-23-21', name: 'Ahmad Hussain' },
  { roll: 'BSPHY-M-23-22', name: 'Rizwan Hassan' },
  { roll: 'BSPHY-M-23-23', name: 'Ahmad Hassan' },
  { roll: 'BSPHY-M-23-24', name: 'Amina Kaleem' },
  { roll: 'BSPHY-M-23-25', name: 'Esha Tariq' },
  { roll: 'BSPHY-M-23-27', name: 'Tayyaba Maryyam Khan' },
  { roll: 'BSPHY-M-23-28', name: 'Iqra' },
  { roll: 'BSPHY-M-23-29', name: 'Taskeen Zanib' },
  { roll: 'BSPHY-M-23-30', name: 'Rimsha Mustafa' },
  { roll: 'BSPHY-M-23-31', name: 'Ghulam Zahra' },
  { roll: 'BSPHY-M-23-32', name: 'Bilal Ahmad' },
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
  { roll: 'BSPHY-M-23-46', name: 'Mubashir Irshad' },
  { roll: 'BSPHY-M-23-47', name: 'Nayab Zafar' },
  { roll: 'BSPHY-M-23-48', name: 'Fatima Khalid' },
  { roll: 'BSPHY-M-23-49', name: 'Tayyaba Bibi' },
  { roll: 'BSPHY-M-23-50', name: 'Muniba Noor' },
  { roll: 'BSPHY-M-23-51', name: 'Intiqash Asif' },
  { roll: 'BSPHY-M-23-52', name: 'Mehak Ali' },
  { roll: 'BSPHY-M-23-53', name: 'Fatima' },
  { roll: 'BSPHY-M-23-54', name: 'Faisal Iqbal' },
  { roll: 'BSPHY-M-23-55', name: 'Asad Abbas' },
  { roll: 'BSPHY-M-23-56', name: 'Yasir Abbas' },
  { roll: 'BSPHY-M-23-57', name: 'Shahzad Ahmad' },
  { roll: 'BSPHY-M-23-58', name: 'Muddassar Yasin' },
  { roll: 'BSPHY-M-23-59', name: 'Kiran Shehzadi' },
  { roll: 'BSPHY-M-23-60', name: 'M. Awais Shakir' },
  { roll: 'BSPHY-M-23-61', name: 'Bushra Rafi' },
  { roll: 'BSPHY-M-23-62', name: 'Aveeza Amjad' },
  { roll: 'BSPHY-M-23-63', name: 'Iram Fatima' },
];

// =========================================================================
// MPhil-Physics 1st Semester (Session Fall 2026-28) - 30 Students
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
  console.log('===================================================================');
  console.log(' UOS Project: Reset Students & Import Official Roster per Classes');
  console.log('===================================================================');

  const dept = await prisma.department.findUnique({
    where: { code: 'PHY' },
  });

  if (!dept) {
    throw new Error('Department of Physics (PHY) not found in database!');
  }

  // 1. Delete all existing student attendance records
  console.log('\n[1/4] Deleting old student attendance records...');
  const deletedAttendance = await prisma.studentAttendance.deleteMany({});
  console.log(` -> Deleted ${deletedAttendance.count} student attendance records.`);

  // 2. Delete all existing student section enrollments
  console.log('\n[2/4] Deleting all student section enrollments...');
  const deletedEnrollments = await prisma.studentSection.deleteMany({});
  console.log(` -> Deleted ${deletedEnrollments.count} student enrollments.`);

  // 3. Delete ALL students from database
  console.log('\n[3/4] Deleting all students from database...');
  const deletedStudents = await prisma.user.deleteMany({
    where: { role: 'STUDENT' },
  });
  console.log(` -> Deleted ${deletedStudents.count} student user accounts.`);

  // 4. Ensure sections exist
  const sec1 = await prisma.section.findFirst({ where: { name: 'BS.PHY1-A' } });
  const sec3 = await prisma.section.findFirst({ where: { name: 'BS.PHY3-A' } });
  const sec5 = await prisma.section.findFirst({ where: { name: 'BS.PHY5-A' } });
  const sec7 = await prisma.section.findFirst({ where: { name: 'BS.PHY7-A' } });
  const sec7SSP = await prisma.section.findFirst({ where: { name: 'BS.PHY7-A (Special SSP-I)' } });
  const sec7Laser = await prisma.section.findFirst({ where: { name: 'BS.PHY7-A (Lasers Physics-I)' } });
  const sec7DLD = await prisma.section.findFirst({ where: { name: 'BS.PHY7-A (Digital Electronics-I)' } });
  const mphilSec = await prisma.section.findFirst({ where: { name: 'MPHIL.PHY1-SS' } });
  const mphilSecA = await prisma.section.findFirst({ where: { name: 'MPHIL.PHY1-SS (Group A)' } });
  const mphilSecB = await prisma.section.findFirst({ where: { name: 'MPHIL.PHY1-SS (Group B)' } });

  if (!sec1 || !sec3 || !sec5 || !sec7) {
    throw new Error('One or more required sections (BS.PHY1-A, BS.PHY3-A, BS.PHY5-A, BS.PHY7-A) not found!');
  }

  console.log('\n[4/4] Importing official students strictly according to class & section:');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Helper to create student and enroll in sections
  async function enrollStudent(item, targetSectionIds) {
    const email = `${item.roll.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.uosahiwal.edu.pk`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: item.name,
        employeeOrRollId: item.roll,
        role: 'STUDENT',
        departmentId: dept.id,
      },
    });

    for (const secId of targetSectionIds) {
      if (secId) {
        await prisma.studentSection.create({
          data: {
            studentId: user.id,
            sectionId: secId,
          },
        });
      }
    }

    return user;
  }

  // --- BS Physics 1st Semester Session 2026-30 (Section BS.PHY1-A) ---
  console.log(`\nImporting BS Physics 1st Semester (${sem1Students.length} students -> BS.PHY1-A)...`);
  for (const st of sem1Students) {
    await enrollStudent(st, [sec1.id]);
  }
  console.log(` -> Successfully enrolled ${sem1Students.length} students into BS.PHY1-A.`);

  // --- BS Physics 3rd Semester Session 2025-29 (Section BS.PHY3-A) ---
  console.log(`\nImporting BS Physics 3rd Semester (${sem3Students.length} students -> BS.PHY3-A)...`);
  for (const st of sem3Students) {
    await enrollStudent(st, [sec3.id]);
  }
  console.log(` -> Successfully enrolled ${sem3Students.length} students into BS.PHY3-A.`);

  // --- BS Physics 5th Semester Session 2024-28 (Section BS.PHY5-A) ---
  console.log(`\nImporting BS Physics 5th Semester (${sem5Students.length} students -> BS.PHY5-A)...`);
  for (const st of sem5Students) {
    await enrollStudent(st, [sec5.id]);
  }
  console.log(` -> Successfully enrolled ${sem5Students.length} students into BS.PHY5-A.`);

  // --- BS Physics 7th Semester Session 2023-27 (Section BS.PHY7-A & Specialized Electives) ---
  console.log(`\nImporting BS Physics 7th Semester (${sem7Students.length} students -> BS.PHY7-A & Specialized Classes)...`);
  const dldSet = new Set(sem7SpecializedDLD.map(s => s.roll));
  const laserSet = new Set(sem7SpecializedLaser.map(s => s.roll));
  const sspSet = new Set(sem7SpecializedSSP.map(s => s.roll));

  for (const st of sem7Students) {
    const targetSecs = [sec7.id];
    if (dldSet.has(st.roll) && sec7DLD) targetSecs.push(sec7DLD.id);
    else if (laserSet.has(st.roll) && sec7Laser) targetSecs.push(sec7Laser.id);
    else if (sspSet.has(st.roll) && sec7SSP) targetSecs.push(sec7SSP.id);

    await enrollStudent(st, targetSecs);
  }
  console.log(` -> Successfully enrolled ${sem7Students.length} students into BS.PHY7-A and their specialized groups.`);

  // --- MPhil Physics 1st Semester Session Fall 2026-28 (Section MPHIL.PHY1-SS, Group A, Group B) ---
  console.log(`\nImporting MPhil Physics 1st Semester (${mphilAllStudents.length} students -> MPHIL.PHY1-SS & Groups)...`);
  const groupASet = new Set(mphilGroupA.map(s => s.roll));
  const groupBSet = new Set(mphilGroupB.map(s => s.roll));

  for (const st of mphilAllStudents) {
    const targetSecs = [mphilSec?.id].filter(Boolean);
    if (groupASet.has(st.roll) && mphilSecA) targetSecs.push(mphilSecA.id);
    else if (groupBSet.has(st.roll) && mphilSecB) targetSecs.push(mphilSecB.id);

    await enrollStudent(st, targetSecs);
  }
  console.log(` -> Successfully enrolled ${mphilAllStudents.length} students into MPHIL.PHY1-SS and Groups A & B.`);

  // Final verification report
  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  const sec1Count = sec1 ? await prisma.studentSection.count({ where: { sectionId: sec1.id } }) : 0;
  const sec3Count = await prisma.studentSection.count({ where: { sectionId: sec3.id } });
  const sec5Count = await prisma.studentSection.count({ where: { sectionId: sec5.id } });
  const sec7Count = await prisma.studentSection.count({ where: { sectionId: sec7.id } });
  const sec7SSPCount = sec7SSP ? await prisma.studentSection.count({ where: { sectionId: sec7SSP.id } }) : 0;
  const sec7LaserCount = sec7Laser ? await prisma.studentSection.count({ where: { sectionId: sec7Laser.id } }) : 0;
  const sec7DLDCount = sec7DLD ? await prisma.studentSection.count({ where: { sectionId: sec7DLD.id } }) : 0;
  const mphilCount = mphilSec ? await prisma.studentSection.count({ where: { sectionId: mphilSec.id } }) : 0;
  const mphilACount = mphilSecA ? await prisma.studentSection.count({ where: { sectionId: mphilSecA.id } }) : 0;
  const mphilBCount = mphilSecB ? await prisma.studentSection.count({ where: { sectionId: mphilSecB.id } }) : 0;

  console.log('\n===================================================================');
  console.log(' DATABASE SYNC COMPLETE & VERIFIED:');
  console.log(` Total Student Accounts in Database: ${totalStudents}`);
  console.log(` - BS.PHY1-A (1st Sem 2026-30):      ${sec1Count} students`);
  console.log(` - BS.PHY3-A (3rd Sem 2025-29):      ${sec3Count} students`);
  console.log(` - BS.PHY5-A (5th Sem 2024-28):      ${sec5Count} students`);
  console.log(` - BS.PHY7-A (7th Sem 2023-27):      ${sec7Count} students`);
  console.log(`   * SSP-I Specialized:              ${sec7SSPCount} students`);
  console.log(`   * Lasers Specialized:             ${sec7LaserCount} students`);
  console.log(`   * DLD Specialized:                ${sec7DLDCount} students`);
  console.log(` - MPHIL.PHY1-SS (1st Sem 2026-28):   ${mphilCount} students`);
  console.log(`   * Group A (Material/Catalysis):   ${mphilACount} students`);
  console.log(`   * Group B (Nanomaterials/Elec):   ${mphilBCount} students`);
  console.log('===================================================================\n');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
