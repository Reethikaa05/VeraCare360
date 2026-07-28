// Parsing helpers for the dirty spreadsheet import + shift overlap math.

// Returns { ok, iso: 'YYYY-MM-DD', error } for a variety of messy date formats.
export function parseMessyDate(raw) {
  if (raw === null || raw === undefined) return { ok: false, error: 'missing date' };
  const s = String(raw).trim();
  if (!s) return { ok: false, error: 'missing date' };

  let y, m, d;

  // ISO: YYYY-MM-DD
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    y = +match[1]; m = +match[2]; d = +match[3];
  } else if ((match = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) {
    // Ambiguous dash format with 2-digit first token -> treat as MM-DD-YYYY (US style),
    // since these values in the source data only make sense that way (see DECISIONS.md).
    m = +match[1]; d = +match[2]; y = +match[3];
  } else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    // Slash format -> treat as DD/MM/YYYY (international style, see DECISIONS.md).
    d = +match[1]; m = +match[2]; y = +match[3];
  } else {
    return { ok: false, error: `unrecognized date format: "${s}"` };
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return { ok: false, error: `impossible calendar date: "${s}"` };
  }
  // Verify the date actually exists (catches Feb 30, Apr 31, etc.) using UTC to avoid TZ drift.
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false, error: `impossible calendar date: "${s}"` };
  }
  const iso = `${y.toString().padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { ok: true, iso };
}

// Parses "HH:MM" optionally suffixed with "+N" (meaning N extra days later).
// Returns { ok, hh, mm, extraDays, error }.
export function parseMessyTime(raw) {
  if (raw === null || raw === undefined) return { ok: false, error: 'missing time' };
  const s = String(raw).trim();
  if (!s) return { ok: false, error: 'missing time' };

  const match = s.match(/^(\d{1,2}):(\d{2})(?:\+(\d+))?$/);
  if (!match) return { ok: false, error: `unrecognized time format: "${s}"` };
  const hh = +match[1];
  const mm = +match[2];
  const extraDays = match[3] ? +match[3] : 0;
  if (hh > 23 || mm > 59) return { ok: false, error: `impossible time of day: "${s}"` };
  return { ok: true, hh, mm, extraDays };
}

function addDaysToIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear().toString().padStart(4, '0')}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// Given a shift date + start/end HH:MM (end may carry a "+N" suffix, or may be
// earlier-or-equal to start meaning it rolls past midnight), compute full
// start_dt / end_dt ISO datetimes usable for overlap comparison.
export function computeShiftDateTimes(dateIso, startTime, endTimeRaw) {
  const start = parseMessyTime(startTime);
  if (!start.ok) return { ok: false, error: start.error };
  const end = parseMessyTime(endTimeRaw);
  if (!end.ok) return { ok: false, error: end.error };

  if (start.extraDays > 0) {
    return { ok: false, error: `start time cannot have a "+N day" suffix: "${startTime}"` };
  }

  const startDt = `${dateIso}T${String(start.hh).padStart(2, '0')}:${String(start.mm).padStart(2, '0')}:00`;

  let endDateIso = dateIso;
  if (end.extraDays > 0) {
    endDateIso = addDaysToIso(dateIso, end.extraDays);
  } else {
    const startMinutes = start.hh * 60 + start.mm;
    const endMinutes = end.hh * 60 + end.mm;
    if (endMinutes === startMinutes) {
      return { ok: false, error: 'start and end time are identical (zero-length shift)' };
    }
    if (endMinutes < startMinutes) {
      // Crosses midnight, e.g. 22:00 -> 06:00
      endDateIso = addDaysToIso(dateIso, 1);
    }
  }
  const endDt = `${endDateIso}T${String(end.hh).padStart(2, '0')}:${String(end.mm).padStart(2, '0')}:00`;

  return { ok: true, startDt, endDt, startTime: `${String(start.hh).padStart(2, '0')}:${String(start.mm).padStart(2, '0')}`, endTime: `${String(end.hh).padStart(2, '0')}:${String(end.mm).padStart(2, '0')}` };
}

// True if two [startDt, endDt) intervals (ISO strings, lexically comparable) overlap.
export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
