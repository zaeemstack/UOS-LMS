import http from 'http';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { FACULTY_CREDENTIALS } from '../src/config/facultyCredentialsMap.js';

const TEST_PORT = 5099;
let server;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: reqHeaders,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch (_) {
          resolve({ status: res.statusCode, body: data, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSecurityAudit() {
  console.log('\n========================================================================');
  console.log('    UNIVERSITY OF SAHIWAL - ENTERPRISE MOBILE SECURITY AUDIT SUITE      ');
  console.log('========================================================================\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Audit Harness] Temporary audit server listening on 127.0.0.1:${TEST_PORT}\n`);
      resolve();
    });
  });

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(name, condition, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${name}`);
      if (details) console.log(`         -> ${details}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${name}`);
      if (details) console.error(`         -> ${details}`);
    }
  }

  try {
    // -----------------------------------------------------------------------------------------
    // TEST 1: Public App Download & External Network Diagnostics
    // -----------------------------------------------------------------------------------------
    console.log('[SECTION 1: External Access & Play Store Compatibility]');
    const publicDiagRes = await makeRequest('GET', '/api/network/status', null, {
      'x-simulated-ip': '39.40.12.5', // Jazz 4G Mobile IP
    });

    assertTest(
      'External network (Jazz 4G 39.40.12.5) can reach public diagnostics without HTTP 403',
      publicDiagRes.status === 200 && publicDiagRes.body.success === true,
      `Status: ${publicDiagRes.status}, isAllowed: ${publicDiagRes.body.diagnostics?.isAllowed}`
    );

    // -----------------------------------------------------------------------------------------
    // TEST 2: Teacher Remote Login from Home / Mobile Data
    // -----------------------------------------------------------------------------------------
    const teacherEmail = 'dr.farooq@uosahiwal.edu.pk';
    const teacherPass = FACULTY_CREDENTIALS[teacherEmail];

    const remoteLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: teacherEmail,
      password: teacherPass,
    }, {
      'x-simulated-ip': '39.40.12.5', // Jazz 4G Mobile IP
    });

    const teacherToken = remoteLoginRes.body?.token;
    assertTest(
      'Faculty can successfully log in from outside campus (e.g. at home / 4G data)',
      remoteLoginRes.status === 200 && Boolean(teacherToken),
      `Status: ${remoteLoginRes.status}, User: ${remoteLoginRes.body?.user?.fullName}, Role: ${remoteLoginRes.body?.user?.role}`
    );

    // -----------------------------------------------------------------------------------------
    // TEST 3: Outside IP Attendance Submission Hard-Block (Perimeter Defense)
    // -----------------------------------------------------------------------------------------
    console.log('\n[SECTION 2: Attendance Perimeter Security & Anti-Proxy]');
    
    // Find an active slot for testing
    const teacherUser = await prisma.user.findUnique({ where: { email: teacherEmail } });
    const slot = await prisma.timetableSlot.findFirst({
      where: { teacherId: teacherUser.id },
      include: { room: true },
    });

    if (!slot) {
      console.warn('  [WARN] No slot found for dr.farooq, using any slot');
    }
    const testSlotId = slot ? slot.id : 'any-test-slot';

    const outsideAttendanceRes = await makeRequest('POST', '/api/attendance/submit', {
      slotId: testSlotId,
      studentAttendances: [{ studentId: 'student-1', status: 'PRESENT' }],
      biometricVerified: true,
      biometricType: 'NATIVE_BIOMETRIC_THUMB',
    }, {
      'Authorization': `Bearer ${teacherToken}`,
      'x-simulated-ip': '39.40.12.5', // Jazz 4G Mobile IP
    });

    assertTest(
      'Attendance submission from outside IP (Jazz 4G 39.40.12.5) is strictly BLOCKED with HTTP 403',
      outsideAttendanceRes.status === 403 && outsideAttendanceRes.body.code === 'CAMPUS_PERIMETER_RESTRICTION',
      `HTTP Status: ${outsideAttendanceRes.status}, Error Code: ${outsideAttendanceRes.body?.code}`
    );

    // -----------------------------------------------------------------------------------------
    // TEST 4: Anti-Proxy Faculty Password Verification
    // -----------------------------------------------------------------------------------------
    const fakePassRes = await makeRequest('POST', '/api/attendance/submit', {
      slotId: testSlotId,
      studentAttendances: [{ studentId: 'student-1', status: 'PRESENT' }],
      biometricVerified: true,
      biometricType: 'NATIVE_BIOMETRIC_THUMB',
      teacherPassword: 'WrongHackedPassword123!',
    }, {
      'Authorization': `Bearer ${teacherToken}`,
      'x-simulated-ip': '172.200.47.193', // Campus Wi-Fi IP
    });

    assertTest(
      'Anti-Proxy Lock rejects fake/incorrect teacher security password with HTTP 401',
      fakePassRes.status === 401 && fakePassRes.body.code === 'INVALID_TEACHER_CREDENTIALS',
      `HTTP Status: ${fakePassRes.status}, Code: ${fakePassRes.body?.code}`
    );

    // -----------------------------------------------------------------------------------------
    // TEST 5: Classroom Router Independence (User Requirement)
    // -----------------------------------------------------------------------------------------
    console.log('\n[SECTION 3: Classroom Router Independence & Wi-Fi Verification]');
    const routerVerifyRes = await makeRequest('POST', '/api/network/verify-room', {
      slotId: testSlotId,
    }, {
      'Authorization': `Bearer ${teacherToken}`,
      'x-simulated-ip': '172.200.47.193', // General campus IP (different from specific room router)
    });

    assertTest(
      'Network verification succeeds on ANY University Campus Wi-Fi without Room Router Mismatch',
      routerVerifyRes.status === 200 && routerVerifyRes.body.isMatched === true && routerVerifyRes.body.isCampusNetwork === true,
      `isMatched: ${routerVerifyRes.body?.isMatched}, isCampusNetwork: ${routerVerifyRes.body?.isCampusNetwork}, Router: ${routerVerifyRes.body?.routerName}`
    );

    // -----------------------------------------------------------------------------------------
    // TEST 6: Biometrics Support (Thumbprint & Facial Recognition)
    // -----------------------------------------------------------------------------------------
    console.log('\n[SECTION 4: Native Thumbprint & Facial Biometrics Processing]');

    // Enable timetable lock bypass temporarily for unit testing attendance recording
    process.env.BYPASS_TIMETABLE_LOCK = 'true';

    // Fetch students enrolled in this slot
    const rosterRes = await makeRequest('GET', `/api/timetable/slot/${testSlotId}/roster`, null, {
      'Authorization': `Bearer ${teacherToken}`,
    });

    const students = rosterRes.body?.students || [];
    const studentPayload = students.slice(0, 3).map((s) => ({ studentId: s.id, status: 'PRESENT' }));

    // Test 6a: Thumbprint Submission
    const thumbSubmitRes = await makeRequest('POST', '/api/attendance/submit', {
      slotId: testSlotId,
      studentAttendances: studentPayload.length > 0 ? studentPayload : [{ studentId: 'student-1', status: 'PRESENT' }],
      biometricVerified: true,
      biometricType: 'NATIVE_BIOMETRIC_THUMB',
    }, {
      'Authorization': `Bearer ${teacherToken}`,
      'x-simulated-ip': '172.200.47.193', // Campus Wi-Fi
    });

    assertTest(
      'Attendance submitted with Thumbprint Biometric is recorded successfully',
      thumbSubmitRes.status === 200 && thumbSubmitRes.body.success === true,
      `Summary: ${JSON.stringify(thumbSubmitRes.body?.dualAttendanceSummary?.teacherAttendance || thumbSubmitRes.body?.message)}`
    );

    // Test 6b: Facial Biometric Submission
    const faceSubmitRes = await makeRequest('POST', '/api/attendance/submit', {
      slotId: testSlotId,
      studentAttendances: studentPayload.length > 0 ? studentPayload : [{ studentId: 'student-1', status: 'PRESENT' }],
      biometricVerified: true,
      biometricType: 'NATIVE_BIOMETRIC_FACE',
    }, {
      'Authorization': `Bearer ${teacherToken}`,
      'x-simulated-ip': '172.200.47.193', // Campus Wi-Fi
    });

    assertTest(
      'Attendance submitted with Facial Biometric is recorded successfully',
      faceSubmitRes.status === 200 && faceSubmitRes.body.success === true,
      `Status: ${faceSubmitRes.status}`
    );

    // Restore lock engine
    process.env.BYPASS_TIMETABLE_LOCK = 'false';

    // -----------------------------------------------------------------------------------------
    // TEST 7: SQL / Payload Injection Resilience
    // -----------------------------------------------------------------------------------------
    console.log('\n[SECTION 5: Anti-Hacking & Injection Resilience]');
    const injectionRes = await makeRequest('POST', '/api/attendance/submit', {
      slotId: "' OR '1'='1' --",
      studentAttendances: "NOT_AN_ARRAY",
      biometricVerified: "MALICIOUS_PAYLOAD",
    }, {
      'Authorization': `Bearer ${teacherToken}`,
      'x-simulated-ip': '172.200.47.193',
    });

    assertTest(
      'SQL / Type Injection attempts are safely rejected with HTTP 400 without server crash',
      injectionRes.status === 400 && injectionRes.body.success === false,
      `HTTP Status: ${injectionRes.status}, Message: ${injectionRes.body?.message}`
    );

    // -----------------------------------------------------------------------------------------
    // TEST 8: Anti-Brute Force Protection (Rate Limiter)
    // -----------------------------------------------------------------------------------------
    console.log('\n[SECTION 6: Brute Force Password Guessing Defense]');
    let hitRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const bruteRes = await makeRequest('POST', '/api/auth/login', {
        email: 'dr.farooq@uosahiwal.edu.pk',
        password: `wrong_guess_${i}`,
      }, {
        'x-simulated-ip': '192.168.99.99',
      });
      if (bruteRes.status === 429) {
        hitRateLimit = true;
        break;
      }
    }

    assertTest(
      'Auth Rate Limiter stops brute-force dictionary attacks with HTTP 429',
      hitRateLimit,
      'Blocked after excessive failed attempts within time window.'
    );

  } catch (err) {
    console.error('[Audit Error]', err);
  } finally {
    if (server) {
      server.close();
      console.log('\n[Audit Harness] Audit server closed.');
    }
    await prisma.$disconnect();

    console.log('========================================================================');
    console.log(`    FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('========================================================================\n');
  }
}

runSecurityAudit();

