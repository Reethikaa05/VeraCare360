import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Isolate this test run to its own SQLite file so it never touches dev/seed data.
const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-test-')), 'test.db');
process.env.DB_PATH = tmpDb;
process.env.DATA_DIR = path.dirname(tmpDb);

const { db } = await import('../db/connection.js');
const { claimShift, unclaimShift, findEditConflicts } = await import('../lib/claims.js');

function makeUser(profession, name = 'Test Person') {
  const info = db.prepare(
    `INSERT INTO users (external_staff_id, full_name, email, password_hash, role, profession) VALUES (?, ?, ?, 'x', 'staff', ?)`
  ).run(`ext-${Math.random()}`, name, `${Math.random()}@test.local`, profession);
  return info.lastInsertRowid;
}

function makeShift({ date = '2026-09-01', start = '08:00', end = '16:00', doctor = 1, nurse = 1, receptionist = 1 } = {}) {
  const startDt = `${date}T${start}:00`;
  let endDate = date;
  if (end <= start) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); endDate = d.toISOString().slice(0, 10); }
  const endDt = `${endDate}T${end}:00`;
  const info = db.prepare(`
    INSERT INTO shifts (date, start_time, end_time, start_dt, end_dt, req_doctor, req_nurse, req_receptionist)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, start, end, startDt, endDt, doctor, nurse, receptionist);
  return info.lastInsertRowid;
}

test('claiming succeeds when a slot for the profession is open', () => {
  const nurse = makeUser('nurse');
  const shiftId = makeShift({ nurse: 1 });
  const claim = claimShift({ shiftId, userId: nurse, assignedBy: 'self' });
  assert.ok(claim.id);
});

test('claiming is rejected once the profession headcount is met', () => {
  const shiftId = makeShift({ nurse: 1 });
  const nurseA = makeUser('nurse', 'Nurse A');
  const nurseB = makeUser('nurse', 'Nurse B');
  claimShift({ shiftId, userId: nurseA, assignedBy: 'self' });
  assert.throws(() => claimShift({ shiftId, userId: nurseB, assignedBy: 'self' }), /already has enough nurses/);
});

test('claiming is rejected when it overlaps another claimed shift for that person', () => {
  const nurse = makeUser('nurse');
  const shiftA = makeShift({ date: '2026-09-05', start: '08:00', end: '16:00', nurse: 1 });
  const shiftB = makeShift({ date: '2026-09-05', start: '15:00', end: '23:00', nurse: 1 });
  claimShift({ shiftId: shiftA, userId: nurse, assignedBy: 'self' });
  assert.throws(() => claimShift({ shiftId: shiftB, userId: nurse, assignedBy: 'self' }), /overlap/);
});

test('non-overlapping back-to-back shifts are both claimable', () => {
  const nurse = makeUser('nurse');
  const shiftA = makeShift({ date: '2026-09-06', start: '08:00', end: '16:00', nurse: 1 });
  const shiftB = makeShift({ date: '2026-09-06', start: '16:00', end: '23:00', nurse: 1 });
  claimShift({ shiftId: shiftA, userId: nurse, assignedBy: 'self' });
  const claim = claimShift({ shiftId: shiftB, userId: nurse, assignedBy: 'self' });
  assert.ok(claim.id);
});

test('overnight shift overlap is detected correctly across midnight', () => {
  const nurse = makeUser('nurse');
  const shiftA = makeShift({ date: '2026-09-10', start: '22:00', end: '06:00', nurse: 1 }); // -> 09-11 06:00
  const shiftB = makeShift({ date: '2026-09-11', start: '05:00', end: '13:00', nurse: 1 });
  claimShift({ shiftId: shiftA, userId: nurse, assignedBy: 'self' });
  assert.throws(() => claimShift({ shiftId: shiftB, userId: nurse, assignedBy: 'self' }), /overlap/);
});

test('manager assign follows the same rules as self-claim', () => {
  const shiftId = makeShift({ doctor: 1 });
  const docA = makeUser('doctor', 'Doc A');
  const docB = makeUser('doctor', 'Doc B');
  claimShift({ shiftId, userId: docA, assignedBy: 'manager' });
  assert.throws(() => claimShift({ shiftId, userId: docB, assignedBy: 'manager' }), /already has enough doctors/);
});

test('unclaim frees the profession slot back up', () => {
  const shiftId = makeShift({ nurse: 1 });
  const nurseA = makeUser('nurse', 'Nurse A');
  const nurseB = makeUser('nurse', 'Nurse B');
  claimShift({ shiftId, userId: nurseA, assignedBy: 'self' });
  unclaimShift({ shiftId, userId: nurseA, requestingUser: { role: 'staff', id: nurseA } });
  const claim = claimShift({ shiftId, userId: nurseB, assignedBy: 'self' });
  assert.ok(claim.id);
});

test('editing a shift time that would create an overlap is flagged as a conflict', () => {
  const nurse = makeUser('nurse');
  const shiftA = makeShift({ date: '2026-09-15', start: '08:00', end: '16:00', nurse: 1 });
  const shiftB = makeShift({ date: '2026-09-16', start: '08:00', end: '16:00', nurse: 1 });
  claimShift({ shiftId: shiftA, userId: nurse, assignedBy: 'self' });
  claimShift({ shiftId: shiftB, userId: nurse, assignedBy: 'self' });
  // Now try to move shiftB to overlap with shiftA's time.
  const conflicts = findEditConflicts(shiftB, '2026-09-15T10:00:00', '2026-09-15T18:00:00');
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].userId, nurse);
});

test('concurrent-style rapid claims never over-fill a shift (serialized correctness)', () => {
  const shiftId = makeShift({ nurse: 2 });
  const nurses = [makeUser('nurse'), makeUser('nurse'), makeUser('nurse'), makeUser('nurse')];
  let succeeded = 0, failed = 0;
  for (const n of nurses) {
    try { claimShift({ shiftId, userId: n, assignedBy: 'self' }); succeeded++; }
    catch { failed++; }
  }
  assert.equal(succeeded, 2);
  assert.equal(failed, 2);
});
