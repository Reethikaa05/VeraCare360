import { useCallback, useEffect, useState } from 'react';
import { api, Shift } from '../lib/api';
import { useAuth } from '../lib/auth';
import { addDays, formatDateLabel, formatWeekRange, startOfWeek, todayIso, weekDays } from '../lib/dateUtils';
import StatusBadge from '../components/StatusBadge';
import ShiftModal from '../components/ShiftModal';

const PROF_LABEL: Record<string, string> = { doctor: 'Doctor', nurse: 'Nurse', receptionist: 'Receptionist' };

export default function MyShifts() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(startOfWeek(todayIso()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalShiftId, setModalShiftId] = useState<number | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const days = weekDays(weekStart);

  const load = useCallback(() => {
    setLoading(true);
    api.listShifts(weekStart, addDays(weekStart, 6))
      .then(({ shifts }) => setShifts(shifts))
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  function closeModal() { setModalShiftId(null); }
  function onSaved() { closeModal(); load(); }

  const myUpcoming = shifts
    .filter((s) => s.claims.some((c) => c.user_id === user?.id))
    .sort((a, b) => a.start_dt.localeCompare(b.start_dt));

  let visible = shifts;
  if (onlyMine) visible = visible.filter((s) => s.claims.some((c) => c.user_id === user?.id));
  if (onlyOpen && user?.profession) visible = visible.filter((s) => s.missing[user.profession!] > 0);

  const shiftsByDay: Record<string, Shift[]> = {};
  days.forEach((d) => { shiftsByDay[d] = []; });
  visible.forEach((s) => { if (shiftsByDay[s.date]) shiftsByDay[s.date].push(s); });

  return (
    <div className="space-y-6 animate-fade-rise">
      <div>
        <h1
          className="text-4xl font-normal text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          My Shift Portal
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Browse open shifts as a <span className="text-white font-semibold capitalize">{user?.profession}</span>, and claim open slots instantly.
        </p>
      </div>

      {myUpcoming.length > 0 && (
        <div className="liquid-glass rounded-3xl border border-white/10 p-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            Your Claimed Roster ({myUpcoming.length} Shifts)
          </p>
          <div className="flex flex-wrap gap-2.5">
            {myUpcoming.map((s) => (
              <button
                key={s.id}
                onClick={() => setModalShiftId(s.id)}
                className="liquid-glass rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-white hover:scale-105 transition-all cursor-pointer"
              >
                ✓ {formatDateLabel(s.date)} · <span className="font-mono">{s.start_time}–{s.end_time}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="liquid-glass flex items-center rounded-full p-1 border border-white/10">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
            >
              ← Prev
            </button>
            <span className="px-3 font-mono text-xs text-white">{formatWeekRange(weekStart)}</span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
            >
              Next →
            </button>
          </div>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(startOfWeek(e.target.value))}
            className="rounded-full border border-white/10 bg-slate-900 px-4 py-1.5 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
              className="rounded border-white/20 bg-white/10"
            />
            Open for {PROF_LABEL[user?.profession || '']}
          </label>
          <label className="flex items-center gap-2 text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="rounded border-white/20 bg-white/10"
            />
            Only Mine
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-[hsl(var(--muted-foreground))] font-mono">
          Loading shifts...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => (
            <div key={day} className="liquid-glass rounded-3xl p-3 border border-white/10">
              <p
                className={`mb-3 border-b border-white/10 pb-2 px-1 text-lg font-normal ${
                  day === todayIso() ? 'text-white font-bold' : 'text-white/80'
                }`}
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {formatDateLabel(day)}
              </p>
              <div className="space-y-2.5 min-h-[140px]">
                {shiftsByDay[day].length === 0 && (
                  <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 text-[11px] text-white/30 italic">
                    No shifts
                  </div>
                )}
                {shiftsByDay[day].map((s) => {
                  const mine = s.claims.some((c) => c.user_id === user?.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setModalShiftId(s.id)}
                      className={`w-full rounded-2xl border p-3 text-left shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] cursor-pointer ${
                        mine
                          ? 'border-emerald-400 bg-emerald-500/15'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-white">
                          {s.start_time}–{s.end_time}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                      {mine && <p className="mt-2 text-[11px] font-semibold text-emerald-400">✓ You're claimed</p>}
                      {user?.profession && !mine && (
                        <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                          {s.missing[user.profession] > 0
                            ? `${s.missing[user.profession]} ${PROF_LABEL[user.profession]} spot(s) open`
                            : `No ${PROF_LABEL[user.profession]} spots open`}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalShiftId !== null && user && (
        <ShiftModal shiftId={modalShiftId} user={user} staffList={[]} onClose={closeModal} onSaved={onSaved} />
      )}
    </div>
  );
}
