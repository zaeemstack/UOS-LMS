import http from 'http';
import prisma from '../src/config/db.js';
import { FACULTY_CREDENTIALS } from '../src/config/facultyCredentialsMap.js';

function postReq(path, body, headers = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (_) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

function getReq(path, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (_) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('       UNIVERSITY OF SAHIWAL - NETWORK SECURITY AUDIT TEST       ');
  console.log('================================================================');

  // 1. TEST TIER 1: OUTSIDE INTERNET (4G SIM / HOME NET)
  console.log('\n[TIER 1] Test 1: Jazz 4G IP (39.40.12.5) trying to hit portal API');
  const jazzRes = await getReq('/api/timetable/slots', { 'x-simulated-ip': '39.40.12.5' });
  console.log('Response Status:', jazzRes.status);
  console.log('Response Body:', jazzRes.body);

  console.log('\n[TIER 1] Test 2: Zong 4G IP (182.185.10.22) trying to hit portal API');
  const zongRes = await getReq('/api/timetable/slots', { 'x-simulated-ip': '182.185.10.22' });
  console.log('Response Status:', zongRes.status);
  console.log('Response Body:', zongRes.body);

  // 2. TEST TIER 1: INSIDE CAMPUS WI-FI
  console.log('\n[TIER 1] Test 3: Campus Wi-Fi (172.200.47.193) accessing portal');
  const campusDiag = await getReq('/api/network/status', { 'x-simulated-ip': '172.200.47.193' });
  console.log('Campus Diagnostics Allowed:', campusDiag.body.diagnostics?.isAllowed);

  // 3. LOGIN AS TEACHER FROM CAMPUS WI-FI
  const teacherEmail = 'dr.farooq@uosahiwal.edu.pk';
  const teacherPass = FACULTY_CREDENTIALS[teacherEmail];
  const loginRes = await postReq('/api/auth/login', {
    email: 'dr.farooq',
    password: teacherPass,
  }, { 'x-simulated-ip': '172.200.47.193' });

  console.log('\nTeacher Login Status:', loginRes.status, 'Teacher:', loginRes.body.user?.fullName);
  const token = loginRes.body.token;

  // 4. TEST TIER 2: CLASSROOM ROUTER CHECK FOR ROOM 4.1.20
  const room4120 = await prisma.room.findUnique({ where: { roomNumber: '4.1.20' } });
  console.log('\nTarget Room:', room4120.roomNumber, 'Router IP:', room4120.routerIp, 'Subnet:', room4120.assignedSubnet);

  console.log('\n[TIER 2] Test 4: Teacher INSIDE Room 4.1.20 (Connected to Room Subnet: 172.200.47.88)');
  const insideRes = await postReq('/api/network/verify-room', { roomId: room4120.id }, {
    'Authorization': `Bearer ${token}`,
    'x-simulated-ip': '172.200.47.88',
  });
  console.log('Verification inside room:', {
    isMatched: insideRes.body.isMatched,
    reason: insideRes.body.reason,
    routerName: insideRes.body.routerName,
    clientIp: insideRes.body.clientIp,
  });

  console.log('\n[TIER 2] Test 5: Teacher OUTSIDE Room (In Canteen / Another Block: 172.200.37.99)');
  const outsideRes = await postReq('/api/network/verify-room', { roomId: room4120.id }, {
    'Authorization': `Bearer ${token}`,
    'x-simulated-ip': '172.200.37.99',
  });
  console.log('Verification outside room:', {
    isMatched: outsideRes.body.isMatched,
    reason: outsideRes.body.reason,
    routerName: outsideRes.body.routerName,
    clientIp: outsideRes.body.clientIp,
  });

  console.log('\n================================================================');
  console.log('                      ALL AUDIT TESTS COMPLETED                  ');
  console.log('================================================================');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
