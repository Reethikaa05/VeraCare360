export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Monday-start week containing the given ISO date.
export function startOfWeek(iso: string): string {
  const d = parseIso(iso);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toIso(d);
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function weekDays(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i));
}

export function formatDateLabel(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatWeekRange(weekStartIso: string): string {
  const end = addDays(weekStartIso, 6);
  const s = parseIso(weekStartIso);
  const e = parseIso(end);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  const startLabel = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const endLabel = e.toLocaleDateString('en-US', { month: sameMonth ? undefined : 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${startLabel} – ${endLabel}`;
}

export function todayIso(): string {
  return toIso(new Date());
}
