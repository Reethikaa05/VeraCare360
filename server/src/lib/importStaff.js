import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';

const ROLE_MAP = {
  doctor: 'doctor', md: 'doctor', physician: 'doctor',
  nurse: 'nurse', rn: 'nurse', 'registered nurse': 'nurse',
  receptionist: 'receptionist', reception: 'receptionist', 'recep.': 'receptionist', recep: 'receptionist',
};

export const DEFAULT_SEED_PASSWORD = 'Passw0rd!';

function normalizeRole(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  return ROLE_MAP[key] || null;
}

function normalizeName(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
    .join(' ');
}

function normalizeEmail(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase().replace('(at)', '@');
}

/**
 * Imports staff rows (already parsed from CSV as objects). Runs inside a single
 * transaction, logs every interesting row to import_rows, and returns a summary.
 */
export function importStaffRows(rows, sourceLabel) {
  const insertRun = db.prepare(
    `INSERT INTO import_runs (source, kind, total_rows) VALUES (?, 'staff', ?)`
  );
  const insertRowLog = db.prepare(
    `INSERT INTO import_rows (run_id, row_number, raw_row, outcome, reason, action_taken) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const findByExternalId = db.prepare(`SELECT * FROM users WHERE external_staff_id = ?`);
  const findByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const insertUser = db.prepare(
    `INSERT INTO users (external_staff_id, full_name, email, password_hash, role, profession) VALUES (?, ?, ?, ?, 'staff', ?)`
  );

  const passwordHash = bcrypt.hashSync(DEFAULT_SEED_PASSWORD, 10);

  const run = db.transaction((rows) => {
    const runInfo = insertRun.run(sourceLabel, rows.length);
    const runId = runInfo.lastInsertRowid;

    let accepted = 0, rejected = 0, merged = 0;
    const seenEmails = new Map(); // normalized email -> external_staff_id first imported under

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2; // header is row 1
      const rawJson = JSON.stringify(row);
      const externalId = String(row.staff_id ?? '').trim();
      const name = normalizeName(row.full_name);
      const email = normalizeEmail(row.email);
      const profession = normalizeRole(row.role);
      const notes = [];

      if (!externalId) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected', 'missing staff_id', 'row skipped');
        rejected++; return;
      }
      if (!name) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected', 'missing full name', 'row skipped');
        rejected++; return;
      }
      if (!profession) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected',
          `role "${row.role}" is not a recognized clinical profession (expected doctor/nurse/receptionist variants)`,
          'row skipped');
        rejected++; return;
      }

      // Exact duplicate external staff_id already imported -> merge (skip, keep first).
      const existingById = findByExternalId.get(externalId);
      if (existingById) {
        insertRowLog.run(runId, rowNumber, rawJson, 'merged',
          `duplicate staff_id ${externalId} (already imported as "${existingById.full_name}")`,
          'row discarded, first occurrence kept');
        merged++; return;
      }

      let finalEmail = email;
      if (!finalEmail) {
        finalEmail = `staff${externalId}@clinic.local`;
        notes.push(`email was blank; auto-generated "${finalEmail}"`);
      }

      // Same name+email already imported under a different staff_id -> same person, duplicate entry.
      const dupPerson = [...seenEmails.entries()].find(([em, info]) => em === finalEmail && info.name === name);
      if (dupPerson) {
        insertRowLog.run(runId, rowNumber, rawJson, 'merged',
          `duplicate person: same name & email already imported under staff_id ${dupPerson[1].externalId}`,
          'row discarded, first occurrence kept');
        merged++; return;
      }

      // Email collision with a *different* person already imported -> can't use as login, reject.
      const existingByEmail = findByEmail.get(finalEmail);
      if (existingByEmail) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected',
          `email "${finalEmail}" is already used by staff_id ${existingByEmail.external_staff_id} (${existingByEmail.full_name}); this row looks invalid/placeholder data`,
          'row skipped');
        rejected++; return;
      }

      if (row.role && normalizeRole(row.role) && String(row.role).trim().toLowerCase() !== profession) {
        notes.push(`role "${row.role}" normalized to "${profession}"`);
      }
      if (row.full_name && normalizeName(row.full_name) !== String(row.full_name)) {
        notes.push('name whitespace/casing normalized');
      }
      if (row.email && normalizeEmail(row.email) !== String(row.email).trim()) {
        notes.push('email format cleaned (e.g. "(at)" -> "@", lowercased)');
      }

      insertUser.run(externalId, name, finalEmail, passwordHash, profession);
      seenEmails.set(finalEmail, { name, externalId });

      if (notes.length) {
        insertRowLog.run(runId, rowNumber, rawJson, 'accepted', notes.join('; '), 'imported with normalization');
      }
      accepted++;
    });

    db.prepare(`UPDATE import_runs SET accepted_count=?, rejected_count=?, merged_count=? WHERE id=?`)
      .run(accepted, rejected, merged, runId);

    return { runId, accepted, rejected, merged, total: rows.length };
  });

  return run(rows);
}
