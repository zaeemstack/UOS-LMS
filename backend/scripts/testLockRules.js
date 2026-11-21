import { evaluateSlotStatus } from '../src/services/lockEngineService.js';

function runTests() {
  console.log('Testing 30-Minute Live Production Lock Rules:');

  const slot = {
    dayOfWeek: 'THURSDAY',
    startTime: '10:00',
    endTime: '11:00',
  };

  // 1. Test Before Class: at 09:30 AM (Thursday)
  const timeBefore = new Date('2026-09-24T09:30:00');
  const resBefore = evaluateSlotStatus(slot, null, timeBefore);
  console.log('\n[Case 1: 09:30 AM (Before Window)]');
  console.log('Status:', resBefore.status);
  console.log('Can Mark:', resBefore.canMark);
  console.log('Lock Reason:', resBefore.lockReason);

  // 2. Test Inside 30-min Window: at 10:15 AM (Thursday)
  const timeInside = new Date('2026-09-24T10:15:00');
  const resInside = evaluateSlotStatus(slot, null, timeInside);
  console.log('\n[Case 2: 10:15 AM (15 mins into class - Inside 30-min window)]');
  console.log('Status:', resInside.status);
  console.log('Can Mark:', resInside.canMark);
  console.log('Window Notice:', resInside.windowNotice);

  // 3. Test After 30 mins: at 10:35 AM (Thursday)
  const timeAfter30 = new Date('2026-09-24T10:35:00');
  const resAfter30 = evaluateSlotStatus(slot, null, timeAfter30);
  console.log('\n[Case 3: 10:35 AM (35 mins after start - 30-min window expired)]');
  console.log('Status:', resAfter30.status);
  console.log('Can Mark:', resAfter30.canMark);
  console.log('Lock Reason:', resAfter30.lockReason);
  console.log('Requires Override:', resAfter30.requiresOverride);

  // 4. Test Concluded: at 11:10 AM (Thursday)
  const timeConcluded = new Date('2026-09-24T11:10:00');
  const resConcluded = evaluateSlotStatus(slot, null, timeConcluded);
  console.log('\n[Case 4: 11:10 AM (Class Concluded)]');
  console.log('Status:', resConcluded.status);
  console.log('Can Mark:', resConcluded.canMark);
  console.log('Lock Reason:', resConcluded.lockReason);

  // 5. Test With Approved Override
  const sessionWithOverride = { isOverridden: true, overrideReason: 'HOD Emergency Approval' };
  const resOverridden = evaluateSlotStatus(slot, sessionWithOverride, timeAfter30);
  console.log('\n[Case 5: 10:35 AM with HOD/Admin Override Granted]');
  console.log('Status:', resOverridden.status);
  console.log('Can Mark:', resOverridden.canMark);
  console.log('Override Reason:', resOverridden.overrideReason);
}

runTests();
