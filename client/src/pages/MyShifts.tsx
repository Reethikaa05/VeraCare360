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
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">My shifts</h1>
        <p className="text-sm text-slate-500">
          Browse open shifts as a {user?.profession}, and claim the ones that work for you.
        </p>
      </div>

      {myUpcoming.length > 0 && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">Your claimed shifts</p>
          <div className="flex flex-wrap gap-2">
            {myUpcoming.map((s) => (
              <button
                key={s.id}
                onClick={() => setModalShiftId(s.id)}
                className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                {formatDateLabel(s.date)} · {s.start_time}–{s.end_time}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            ← Prev
          </button>
          <span className="text-sm font-medium text-slate-700">{formatWeekRange(weekStart)}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Next →
          </button>
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(startOfWeek(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-slate-600">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Only open for {PROF_LABEL[user?.profession || '']}
          </label>
          <label className="flex items-center gap-1.5 text-slate-600">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            Only mine
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading shifts…</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => (
            <div key={day} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
              <p className={`mb-2 px-0.5 text-xs font-semibold ${day === todayIso() ? 'text-brand-700' : 'text-slate-600'}`}>
                {formatDateLabel(day)}
              </p>
              <div className="space-y-2">
                {shiftsByDay[day].length === 0 && (
                  <p className="px-1 py-3 text-center text-[11px] text-slate-300">No shifts</p>
                )}
                {shiftsByDay[day].map((s) => {
                  const mine = s.claims.some((c) => c.user_id === user?.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setModalShiftId(s.id)}
                      className={`w-full rounded-lg border bg-white p-2.5 text-left shadow-sm transition-shadow hover:shadow-md ${
                        mine ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">{s.start_time}–{s.end_time}</span>
                        <StatusBadge status={s.status} />
                      </div>
                      {mine && <p className="mt-1 text-[11px] font-medium text-brand-600">You're claimed</p>}
                      {user?.profession && !mine && (
                        <p className="mt-1 text-[11px] text-slate-400">
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
