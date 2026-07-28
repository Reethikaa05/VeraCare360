import { db } from '../db/connection.js';
import { intervalsOverlap } from './dates.js';

function apiError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const REQ_COL = { doctor: 'req_doctor', nurse: 'req_nurse', receptionist: 'req_receptionist' };

/**
 * Validates + performs a claim (self-claim or manager-assign) atomically.
 * Throws { status, message } style errors (plain object) on business rule violations.
 */
export function claimShift({ shiftId, userId, assignedBy }) {
  const doIt = db.transaction(() => {
    const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shiftId);
    if (!shift) throw apiError(404, 'Shift not found');

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    if (!user || user.role !== 'staff' || !user.profession) {
      throw apiError(400, 'Only staff members with an assigned profession can claim shifts');
    }

    const existingClaim = db.prepare(`SELECT * FROM claims WHERE shift_id = ? AND user_id = ?`).get(shiftId, userId);
    if (existingClaim) throw apiError(409, `${user.full_name} has already claimed this shift`);

    // Rule 1: profession headcount not already met.
    const claimedOfProfession = db.prepare(`
      SELECT COUNT(*) c FROM claims c JOIN users u ON u.id = c.user_id
      WHERE c.shift_id = ? AND u.profession = ?
    `).get(shiftId, user.profession).c;
    const required = shift[REQ_COL[user.profession]];
    if (claimedOfProfession >= required) {
      throw apiError(400, `This shift already has enough ${user.profession}s (${claimedOfProfession}/${required} filled)`);
    }

    // Rule 2: no overlap with another shift this person has already claimed.
    const overlap = findOverlappingClaim(userId, shift.start_dt, shift.end_dt, null);
    if (overlap) {
      throw apiError(400, `${user.full_name} already has a shift on ${overlap.date} from ${overlap.start_time} to ${overlap.end_time} that overlaps with this one`);
    }

    db.prepare(`INSERT INTO claims (shift_id, user_id, assigned_by) VALUES (?, ?, ?)`)
      .run(shiftId, userId, assignedBy);

    return db.prepare(`SELECT * FROM claims WHERE shift_id = ? AND user_id = ?`).get(shiftId, userId);
  });

  return doIt();
}

export function findOverlappingClaim(userId, startDt, endDt, excludeShiftId) {
  const rows = db.prepare(`
    SELECT s.* FROM claims c JOIN shifts s ON s.id = c.shift_id
    WHERE c.user_id = ? AND s.id != COALESCE(?, -1)
  `).all(userId, excludeShiftId);
  return rows.find(s => intervalsOverlap(startDt, endDt, s.start_dt, s.end_dt)) || null;
}

export function unclaimShift({ shiftId, userId, requestingUser }) {
  const doIt = db.transaction(() => {
    const claim = db.prepare(`SELECT * FROM claims WHERE shift_id = ? AND user_id = ?`).get(shiftId, userId);
    if (!claim) throw apiError(404, 'No claim found for this staff member on this shift');
    if (requestingUser.role !== 'manager' && requestingUser.id !== userId) {
      throw apiError(403, 'You can only unclaim your own shifts');
    }
    db.prepare(`DELETE FROM claims WHERE id = ?`).run(claim.id);
  });
  return doIt();
}

/**
 * After a shift's time changes, re-validate every existing claim on it against
 * the NEW time window (checking for overlaps with claimants' OTHER shifts).
 * Returns a list of conflicts (empty if all still valid). Does not mutate anything.
 */
export function findEditConflicts(shiftId, newStartDt, newEndDt) {
  const claimants = db.prepare(`
    SELECT u.id, u.full_name FROM claims c JOIN users u ON u.id = c.user_id WHERE c.shift_id = ?
  `).all(shiftId);

  const conflicts = [];
  for (const person of claimants) {
    const overlap = findOverlappingClaim(person.id, newStartDt, newEndDt, shiftId);
    if (overlap) {
      conflicts.push({
        userId: person.id,
        name: person.full_name,
        conflictingShift: { id: overlap.id, date: overlap.date, start_time: overlap.start_time, end_time: overlap.end_time },
      });
    }
  }
  return conflicts;
}

/**
 * After a shift's requirements shrink, existing over-staffing is allowed (we never
 * auto-remove people). This helper is here for symmetry/documentation purposes only.
 */
export function professionCounts(shiftId) {
  const rows = db.prepare(`
    SELECT u.profession, COUNT(*) c FROM claims c JOIN users u ON u.id = c.user_id
    WHERE c.shift_id = ? GROUP BY u.profession
  `).all(shiftId);
  const out = { doctor: 0, nurse: 0, receptionist: 0 };
  rows.forEach(r => { out[r.profession] = r.c; });
  return out;
}
