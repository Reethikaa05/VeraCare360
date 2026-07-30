import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import { parseCsvBuffer } from '../lib/csv.js';
import { importStaffRows, DEFAULT_SEED_PASSWORD } from '../lib/importStaff.js';
import { importShiftRows } from '../lib/importShifts.js';
import { computeShiftDateTimes } from '../lib/dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, '..', '..', 'seed-data');

function seedManager() {
  const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get('manager@clinic.local');
  if (existing) {
    console.log('Manager already seeded, skipping.');
    return;
  }
  const hash = bcrypt.hashSync(DEFAULT_SEED_PASSWORD, 10);
  db.prepare(
    `INSERT INTO users (external_staff_id, full_name, email, password_hash, role, profession) VALUES (NULL, ?, ?, ?, 'manager', NULL)`
  ).run('Morgan Reyes', 'manager@clinic.local', hash);
  console.log(`Seeded manager: manager@clinic.local / ${DEFAULT_SEED_PASSWORD}`);
}

function seedActiveWeekShifts() {
  console.log('--- Ensuring active current week shifts & claims ---');
  const doctors = db.prepare(`SELECT id FROM users WHERE profession='doctor'`).all();
  const nurses = db.prepare(`SELECT id FROM users WHERE profession='nurse'`).all();
  const receptionists = db.prepare(`SELECT id FROM users WHERE profession='receptionist'`).all();

  if (doctors.length === 0 || nurses.length === 0) return;

  const now = new Date();
  // Generate active shifts across current 3-week window (-7 to +14 days)
  for (let offset = -7; offset <= 14; offset++) {
    const dt = new Date(now);
    dt.setDate(now.getDate() + offset);
    const dateIso = dt.toISOString().split('T')[0];

    const existingCount = db.prepare(`SELECT COUNT(*) c FROM shifts WHERE date = ?`).get(dateIso).c;
    if (existingCount > 0) continue; // Already has shifts for this date

    // Shift 1: Day Shift (Fully Staffed)
    const dt1 = computeShiftDateTimes(dateIso, '08:00', '16:00');
    if (dt1.ok) {
      const res1 = db.prepare(
        `INSERT INTO shifts (date, start_time, end_time, start_dt, end_dt, req_doctor, req_nurse, req_receptionist, notes)
         VALUES (?, '08:00', '16:00', ?, ?, 1, 2, 1, 'Day General Practice Roster')`
      ).run(dateIso, dt1.startDt, dt1.endDt);

      const shiftId1 = res1.lastInsertRowid;
      const doc = doctors[(Math.abs(offset) + 100) % doctors.length];
      const n1 = nurses[(Math.abs(offset) * 2 + 100) % nurses.length];
      const n2 = nurses[(Math.abs(offset) * 2 + 101) % nurses.length];
      const rec = receptionists[(Math.abs(offset) + 100) % receptionists.length];

      if (doc) db.prepare(`INSERT OR IGNORE INTO claims (shift_id, user_id, assigned_by) VALUES (?, ?, 'self')`).run(shiftId1, doc.id);
      if (n1) db.prepare(`INSERT OR IGNORE INTO claims (shift_id, user_id, assigned_by) VALUES (?, ?, 'self')`).run(shiftId1, n1.id);
      if (n2) db.prepare(`INSERT OR IGNORE INTO claims (shift_id, user_id, assigned_by) VALUES (?, ?, 'self')`).run(shiftId1, n2.id);
      if (rec) db.prepare(`INSERT OR IGNORE INTO claims (shift_id, user_id, assigned_by) VALUES (?, ?, 'self')`).run(shiftId1, rec.id);
    }

    // Shift 2: Evening Shift (Partial Coverage)
    const dt2 = computeShiftDateTimes(dateIso, '16:00', '00:00');
    if (dt2.ok) {
      const res2 = db.prepare(
        `INSERT INTO shifts (date, start_time, end_time, start_dt, end_dt, req_doctor, req_nurse, req_receptionist, notes)
         VALUES (?, '16:00', '00:00', ?, ?, 1, 2, 1, 'Evening Urgent Care')`
      ).run(dateIso, dt2.startDt, dt2.endDt);

      const shiftId2 = res2.lastInsertRowid;
      const n1 = nurses[(Math.abs(offset) * 2 + 102) % nurses.length];
      if (n1) db.prepare(`INSERT OR IGNORE INTO claims (shift_id, user_id, assigned_by) VALUES (?, ?, 'self')`).run(shiftId2, n1.id);
    }

    // Shift 3: Night Shift (Unstaffed)
    const dt3 = computeShiftDateTimes(dateIso, '22:00', '06:00');
    if (dt3.ok) {
      db.prepare(
        `INSERT INTO shifts (date, start_time, end_time, start_dt, end_dt, req_doctor, req_nurse, req_receptionist, notes)
         VALUES (?, '22:00', '06:00', ?, ?, 1, 1, 0, 'Night ICU Coverage')`
      ).run(dateIso, dt3.startDt, dt3.endDt);
    }
  }
}

export function seedDatabase() {
  console.log('--- Seeding database check ---');
  seedManager();

  const staffCount = db.prepare(`SELECT COUNT(*) c FROM users WHERE role='staff'`).get().c;
  if (staffCount === 0) {
    const staffBuf = fs.readFileSync(path.join(SEED_DIR, 'staff.csv'));
    const staffRows = parseCsvBuffer(staffBuf);
    const staffResult = importStaffRows(staffRows, 'staff.csv (seed)');
    console.log('Staff import:', staffResult);
  } else {
    console.log('Staff already seeded, skipping staff.csv import.');
  }

  const shiftCount = db.prepare(`SELECT COUNT(*) c FROM shifts`).get().c;
  if (shiftCount === 0) {
    const shiftsBuf = fs.readFileSync(path.join(SEED_DIR, 'shifts.csv'));
    const shiftRows = parseCsvBuffer(shiftsBuf);
    const shiftResult = importShiftRows(shiftRows, 'shifts.csv (seed)');
    console.log('Shifts import:', shiftResult);
  } else {
    console.log('Shifts already seeded, skipping shifts.csv import.');
  }

  seedActiveWeekShifts();

  console.log('--- Seed complete ---');
  console.log(`All seeded staff logins share the password: ${DEFAULT_SEED_PASSWORD}`);
}

// Auto-run if executed directly via node src/db/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
