import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../src/config/db.js';

// Excel-Safe Cryptographically Strong Password Generator (12 chars)
// Starts with an uppercase letter so Excel NEVER mistakes it for a formula (=, @, +, -)
function generateStrongPassword() {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused I, O
  const lowers = 'abcdefghjkmnpqrstuvwxyz';  // exclude easily confused l, o
  const numbers = '23456789';                // exclude easily confused 0, 1
  const symbols = '!#$%&*';

  // Ensure first character is always a letter (Excel-safe)
  const firstChar = uppers[crypto.randomInt(0, uppers.length)];
  
  let rest = [
    lowers[crypto.randomInt(0, lowers.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const allChars = uppers + lowers + numbers + symbols;
  for (let i = 0; i < 8; i++) {
    rest.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Shuffle remaining characters
  rest = rest.sort(() => 0.5 - Math.random()).join('');
  return firstChar + rest;
}

async function main() {
  console.log('===============================================================');
  console.log('  UOS Attendance Portal - Production Clean Slate & Credentials');
  console.log('===============================================================');

  // 1. Purge any remaining test data
  console.log('\n[Step 1] Purging test sessions, attendances & logs...');
  const deletedRecords = await prisma.studentAttendance.deleteMany({});
  const deletedSessions = await prisma.attendanceSession.deleteMany({});
  const deletedOverrides = await prisma.overrideRequest.deleteMany({});
  const deletedLogs = await prisma.networkAuditLog.deleteMany({});
  console.log(`  ✓ Database slate clean (${deletedSessions.count} sessions, ${deletedRecords.count} records purged).`);

  // 2. Fetch all teachers, HOD, and Admins sorted by full name
  console.log('\n[Step 2] Generating Excel-safe strong passwords for all accounts...');
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    include: { department: true, taughtSlots: true },
    orderBy: { fullName: 'asc' },
  });

  const hod = await prisma.user.findFirst({
    where: { role: 'HOD' },
    include: { department: true, taughtSlots: true },
  });

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    include: { department: true },
    orderBy: { fullName: 'asc' },
  });

  const allAccounts = [
    ...(hod ? [hod] : []),
    ...teachers,
    ...admins,
  ];

  const credentialsReport = [];
  const credentialsMap = {};

  let sr = 1;
  for (const acc of allAccounts) {
    const rawPassword = generateStrongPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.user.update({
      where: { id: acc.id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    const shortUsername = acc.email.split('@')[0];
    credentialsMap[acc.email] = rawPassword;

    credentialsReport.push({
      sr: sr++,
      role: acc.role,
      name: acc.fullName,
      employeeId: acc.employeeOrRollId || '',
      shortUsername,
      email: acc.email,
      password: rawPassword,
      department: acc.department?.name || 'Department of Physics',
      scheduledSlots: acc.taughtSlots?.length || 0,
    });
  }

  console.log(`  ✓ Updated ${credentialsReport.length} accounts with strong passwords.`);

  // 3. Update facultyCredentialsMap.js so API always serves these exact credentials
  const mapFileContent = `/**
 * University of Sahiwal - Official Faculty Credentials Store
 * Auto-generated with Excel-safe cryptographically strong passwords.
 */
export const FACULTY_CREDENTIALS = ${JSON.stringify(credentialsMap, null, 2)};
`;
  const mapFilePath = path.resolve('src/config/facultyCredentialsMap.js');
  fs.writeFileSync(mapFilePath, mapFileContent, 'utf8');
  console.log(`  ✓ Updated: ${mapFilePath}`);

  // 4. Generate CSV with UTF-8 BOM for perfect Excel rendering
  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Sr #',
    'Role',
    'Faculty Member Name',
    'Username',
    'Official Email',
    'Official Password',
    'Employee ID',
    'Department',
    'Scheduled Classes'
  ];

  const rows = credentialsReport.map((c) => [
    c.sr,
    escapeCsv(c.role),
    escapeCsv(c.name),
    escapeCsv(c.shortUsername),
    escapeCsv(c.email),
    escapeCsv(c.password),
    escapeCsv(c.employeeId),
    escapeCsv(c.department),
    c.scheduledSlots,
  ]);

  // \uFEFF is the UTF-8 BOM that forces Microsoft Excel to open CSV with perfect columns and character encoding
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  
  const backendCsvPath = path.resolve('Faculty_Official_Credentials.csv');
  const frontendCsvPath = path.resolve('../frontend/public/Faculty_Official_Credentials.csv');
  
  fs.writeFileSync(backendCsvPath, csvContent, 'utf8');
  fs.writeFileSync(frontendCsvPath, csvContent, 'utf8');
  console.log(`  ✓ Exported: ${backendCsvPath}`);
  console.log(`  ✓ Exported: ${frontendCsvPath}`);

  console.log('\n================ OFFICIAL CREDENTIALS LIST ================');
  console.table(
    credentialsReport.map((c) => ({
      '#': c.sr,
      Role: c.role,
      Name: c.name,
      Username: c.shortUsername,
      Email: c.email,
      Password: c.password,
    }))
  );
  console.log('===========================================================\n');
}

main()
  .catch((e) => {
    console.error('Fatal error generating credentials:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
