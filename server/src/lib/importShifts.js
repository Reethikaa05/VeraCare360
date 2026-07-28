import { db } from '../db/connection.js';
import { parseMessyDate, computeShiftDateTimes } from './dates.js';

const REQ_KEY_MAP = {
  doctor: 'doctor', doctors: 'doctor',
  nurse: 'nurse', nurses: 'nurse',
  receptionist: 'receptionist', receptionists: 'receptionist',
};

// Parses "nurses=3;doctors=0;receptionists=0" style strings. Any freeform text
// without recognizable key=value pairs is rejected outright.
function parseRequirements(raw) {
  if (!raw || !String(raw).trim()) return { ok: false, error: 'missing requirements' };
  const s = String(raw).trim();
  const parts = s.split(';').map(p => p.trim()).filter(Boolean);
  const result = { doctor: 0, nurse: 0, receptionist: 0 };
  let matchedAny = false;

  for (const part of parts) {
    const m = part.match(/^([a-zA-Z]+)\s*=\s*(-?\d+)$/);
    if (!m) {
      return { ok: false, error: `requirements not in parseable "role=count" format: "${raw}"` };
    }
    const key = REQ_KEY_MAP[m[1].toLowerCase()];
    if (!key) {
      return { ok: false, error: `unrecognized requirement role "${m[1]}" in "${raw}"` };
    }
    const count = parseInt(m[2], 10);
    if (count < 0) {
      return { ok: false, error: `negative requirement count in "${raw}"` };
    }
    result[key] = count;
    matchedAny = true;
  }
  if (!matchedAny) return { ok: false, error: `requirements not in parseable "role=count" format: "${raw}"` };
  if (result.doctor === 0 && result.nurse === 0 && result.receptionist === 0) {
    return { ok: false, error: `requirements sum to zero staff needed: "${raw}"` };
  }
  return { ok: true, ...result };
}

export function importShiftRows(rows, sourceLabel) {
  const insertRun = db.prepare(
    `INSERT INTO import_runs (source, kind, total_rows) VALUES (?, 'shifts', ?)`
  );
  const insertRowLog = db.prepare(
    `INSERT INTO import_rows (run_id, row_number, raw_row, outcome, reason, action_taken) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const findByExternalId = db.prepare(`SELECT * FROM shifts WHERE external_shift_id = ?`);
  const insertShift = db.prepare(`
    INSERT INTO shifts (external_shift_id, date, start_time, end_time, start_dt, end_dt, req_doctor, req_nurse, req_receptionist)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const run = db.transaction((rows) => {
    const runInfo = insertRun.run(sourceLabel, rows.length);
    const runId = runInfo.lastInsertRowid;

    let accepted = 0, rejected = 0, merged = 0;

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const rawJson = JSON.stringify(row);
      const externalId = String(row.shift_id ?? '').trim();

      if (!externalId) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected', 'missing shift_id', 'row skipped');
        rejected++; return;
      }

      const dateResult = parseMessyDate(row.date);
      if (!dateResult.ok) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected', dateResult.error, 'row skipped');
        rejected++; return;
      }

      const dtResult = computeShiftDateTimes(dateResult.iso, row.start_time, row.end_time);
      if (!dtResult.ok) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected', dtResult.error, 'row skipped');
        rejected++; return;
      }

      const reqResult = parseRequirements(row.requirements);
      if (!reqResult.ok) {
        insertRowLog.run(runId, rowNumber, rawJson, 'rejected', reqResult.error, 'row skipped');
        rejected++; return;
      }

      const existing = findByExternalId.get(externalId);
      if (existing) {
        const identical = existing.date === dateResult.iso && existing.start_time === dtResult.startTime
          && existing.end_time === dtResult.endTime && existing.req_doctor === reqResult.doctor
          && existing.req_nurse === reqResult.nurse && existing.req_receptionist === reqResult.receptionist;
        insertRowLog.run(runId, rowNumber, rawJson, 'merged',
          identical
            ? `exact duplicate of already-imported shift_id ${externalId}`
            : `duplicate shift_id ${externalId} with conflicting data vs. already-imported row`,
          'row discarded, first occurrence kept');
        merged++; return;
      }

      insertShift.run(
        externalId, dateResult.iso, dtResult.startTime, dtResult.endTime, dtResult.startDt, dtResult.endDt,
        reqResult.doctor, reqResult.nurse, reqResult.receptionist
      );

      const notes = [];
      if (String(row.date).trim() !== dateResult.iso) notes.push(`date normalized from "${row.date}" to ${dateResult.iso}`);
      if (dtResult.endDt.slice(0, 10) !== dateResult.iso) notes.push('shift crosses midnight; end date rolled to the next day');
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
