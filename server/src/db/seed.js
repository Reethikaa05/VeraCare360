import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import { parseCsvBuffer } from '../lib/csv.js';
import { importStaffRows, DEFAULT_SEED_PASSWORD } from '../lib/importStaff.js';
import { importShiftRows } from '../lib/importShifts.js';

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

  console.log('--- Seed complete ---');
  console.log(`All seeded staff logins share the password: ${DEFAULT_SEED_PASSWORD}`);
}

// Auto-run if executed directly via node src/db/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
