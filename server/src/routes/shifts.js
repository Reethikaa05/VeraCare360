import express from 'express';
import { db } from '../db/connection.js';
import { requireAuth, requireManager } from '../middleware/auth.js';
import { claimShift, unclaimShift, findEditConflicts, professionCounts } from '../lib/claims.js';
import { computeShiftDateTimes, parseMessyDate } from '../lib/dates.js';

const router = express.Router();
router.use(requireAuth);

function shiftWithClaims(shift) {
  const claims = db.prepare(`
    SELECT c.id as claim_id, u.id as user_id, u.full_name, u.profession, c.assigned_by
    FROM claims c JOIN users u ON u.id = c.user_id WHERE c.shift_id = ?
    ORDER BY u.profession, u.full_name
  `).all(shift.id);
  const counts = professionCounts(shift.id);
  const missing = {
    doctor: Math.max(0, shift.req_doctor - counts.doctor),
    nurse: Math.max(0, shift.req_nurse - counts.nurse),
    receptionist: Math.max(0, shift.req_receptionist - counts.receptionist),
  };
  const totalRequired = shift.req_doctor + shift.req_nurse + shift.req_receptionist;
  const totalFilled = counts.doctor + counts.nurse + counts.receptionist;
  let status = 'empty';
  if (totalFilled >= totalRequired && totalRequired > 0) status = 'full';
  else if (totalFilled > 0) status = 'partial';
  else if (totalRequired === 0) status = 'full';

  return { ...shift, claims, counts, missing, status };
}

// GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = db.prepare(`SELECT * FROM shifts WHERE date >= ? AND date <= ? ORDER BY date, start_time`).all(from, to);
  } else {
    rows = db.prepare(`SELECT * FROM shifts ORDER BY date, start_time`).all();
  }
  res.json({ shifts: rows.map(shiftWithClaims) });
});

router.get('/:id', (req, res) => {
  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  res.json({ shift: shiftWithClaims(shift) });
});

function validateAndComputeTimes(body, res) {
  const dateResult = parseMessyDate(body.date);
  if (!dateResult.ok) { res.status(400).json({ error: dateResult.error }); return null; }
  const dtResult = computeShiftDateTimes(dateResult.iso, body.start_time, body.end_time);
  if (!dtResult.ok) { res.status(400).json({ error: dtResult.error }); return null; }
  return { dateIso: dateResult.iso, ...dtResult };
}

// POST /api/shifts (manager)
router.post('/', requireManager, (req, res) => {
  const { req_doctor = 0, req_nurse = 0, req_receptionist = 0, notes = null } = req.body || {};
  const t = validateAndComputeTimes(req.body || {}, res);
  if (!t) return;
  if (req_doctor + req_nurse + req_receptionist <= 0) {
    return res.status(400).json({ error: 'At least one staff role requirement must be greater than zero' });
  }
  const info = db.prepare(`
    INSERT INTO shifts (date, start_time, end_time, start_dt, end_dt, req_doctor, req_nurse, req_receptionist, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(t.dateIso, t.startTime, t.endTime, t.startDt, t.endDt, req_doctor, req_nurse, req_receptionist, notes);
  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ shift: shiftWithClaims(shift) });
});

// PUT /api/shifts/:id (manager) - edits date/time/requirements/notes; re-validates existing claims.
router.put('/:id', requireManager, (req, res) => {
  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  const body = {
    date: req.body.date ?? shift.date,
    start_time: req.body.start_time ?? shift.start_time,
    end_time: req.body.end_time ?? shift.end_time,
  };
  const t = validateAndComputeTimes(body, res);
  if (!t) return;

  const req_doctor = req.body.req_doctor ?? shift.req_doctor;
  const req_nurse = req.body.req_nurse ?? shift.req_nurse;
  const req_receptionist = req.body.req_receptionist ?? shift.req_receptionist;
  const notes = req.body.notes ?? shift.notes;

  // If the time window changed, re-validate that every current claimant's OTHER
  // shifts still don't overlap with the new window. We refuse the edit rather than
  // silently dropping people — see DECISIONS.md.
  const timeChanged = t.startDt !== shift.start_dt || t.endDt !== shift.end_dt;
  if (timeChanged) {
    const conflicts = findEditConflicts(shift.id, t.startDt, t.endDt);
    if (conflicts.length) {
      return res.status(409).json({
        error: 'Cannot save: the new time conflicts with claims already on this shift',
        conflicts,
      });
    }
  }

  db.prepare(`
    UPDATE shifts SET date=?, start_time=?, end_time=?, start_dt=?, end_dt=?, req_doctor=?, req_nurse=?, req_receptionist=?, notes=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(t.dateIso, t.startTime, t.endTime, t.startDt, t.endDt, req_doctor, req_nurse, req_receptionist, notes, shift.id);

  const updated = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shift.id);
  res.json({ shift: shiftWithClaims(updated) });
});

// DELETE /api/shifts/:id (manager)
router.delete('/:id', requireManager, (req, res) => {
  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  db.prepare(`DELETE FROM shifts WHERE id = ?`).run(shift.id); // claims cascade
  res.json({ ok: true });
});

// POST /api/shifts/:id/claim (staff, self only)
router.post('/:id/claim', (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Only staff can claim shifts for themselves' });
  try {
    claimShift({ shiftId: req.params.id, userId: req.user.id, assignedBy: 'self' });
    const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(req.params.id);
    res.status(201).json({ shift: shiftWithClaims(shift) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to claim shift' });
  }
});

// POST /api/shifts/:id/assign (manager, any staff)
router.post('/:id/assign', requireManager, (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    claimShift({ shiftId: req.params.id, userId, assignedBy: 'manager' });
    const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(req.params.id);
    res.status(201).json({ shift: shiftWithClaims(shift) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to assign staff' });
  }
});

// DELETE /api/shifts/:id/claims/:userId (self, or manager for anyone)
router.delete('/:id/claims/:userId', (req, res) => {
  try {
    unclaimShift({ shiftId: req.params.id, userId: req.params.userId, requestingUser: req.user });
    const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(req.params.id);
    res.json({ shift: shiftWithClaims(shift) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to unclaim shift' });
  }
});

export default router;
