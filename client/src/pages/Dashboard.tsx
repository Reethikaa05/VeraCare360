import { useCallback, useEffect, useState } from 'react';
import { api, Shift, StaffMember } from '../lib/api';
import { useAuth } from '../lib/auth';
import { addDays, formatDateLabel, formatWeekRange, startOfWeek, todayIso, weekDays } from '../lib/dateUtils';
import StatusBadge from '../components/StatusBadge';
import ShiftModal from '../components/ShiftModal';

const PROF_ORDER: Array<'doctor' | 'nurse' | 'receptionist'> = ['doctor', 'nurse', 'receptionist'];
const PROF_SHORT: Record<string, string> = { doctor: 'Dr', nurse: 'Nu', receptionist: 'Re' };

function ShiftCard({ shift, onClick }: { shift: Shift; onClick: () => void }) {
  const borderColor =
    shift.status === 'full' ? 'border-l-emerald-500' : shift.status === 'partial' ? 'border-l-amber-500' : 'border-l-red-500';
  const missingRoles = PROF_ORDER.filter((p) => shift.missing[p] > 0);

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-slate-200 border-l-4 ${borderColor} bg-white p-2.5 text-left shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-800">{shift.start_time}–{shift.end_time}</span>
        <StatusBadge status={shift.status} />
      </div>
      {missingRoles.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {missingRoles.map((p) => (
            <span key={p} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              {PROF_SHORT[p]} short {shift.missing[p]}
            </span>
          ))}
        </div>
      )}
      {missingRoles.length === 0 && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          {shift.counts.doctor + shift.counts.nurse + shift.counts.receptionist} staff assigned
        </p>
      )}
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(startOfWeek(todayIso()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalShiftId, setModalShiftId] = useState<number | null | 'new'>(null);
  const [newShiftDate, setNewShiftDate] = useState<string | undefined>(undefined);

  const days = weekDays(weekStart);

  const load = useCallback(() => {
    setLoading(true);
    const to = addDays(weekStart, 6);
    Promise.all([api.listShifts(weekStart, to), api.listStaff()])
      .then(([shiftRes, staffRes]) => {
        setShifts(shiftRes.shifts);
        setStaff(staffRes.staff);
      })
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const shiftsByDay: Record<string, Shift[]> = {};
  days.forEach((d) => { shiftsByDay[d] = []; });
  shifts.forEach((s) => { if (shiftsByDay[s.date]) shiftsByDay[s.date].push(s); });

  const totals = { total: shifts.length, empty: 0, partial: 0, full: 0 };
  shifts.forEach((s) => { totals[s.status]++; });

  function closeModal() {
    setModalShiftId(null);
    setNewShiftDate(undefined);
  }
  function onSaved() {
    closeModal();
    load();
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Coverage dashboard</h1>
          <p className="text-sm text-slate-500">Week of {formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            ← Prev
          </button>
          <button onClick={() => setWeekStart(startOfWeek(todayIso()))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            This week
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Next →
          </button>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(startOfWeek(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            aria-label="Jump to week containing date"
          />
          <button
            onClick={() => { setNewShiftDate(todayIso() > weekStart ? weekStart : todayIso()); setModalShiftId('new'); }}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + New shift
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-slate-600">{totals.total} shifts</span>
        <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-red-700">{totals.empty} empty</span>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-700">{totals.partial} partial</span>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-emerald-700">{totals.full} full</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">Loading coverage…</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => (
            <div key={day} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <span className={`text-xs font-semibold ${day === todayIso() ? 'text-brand-700' : 'text-slate-600'}`}>
                  {formatDateLabel(day)}
                </span>
                <button
                  onClick={() => { setNewShiftDate(day); setModalShiftId('new'); }}
                  className="text-xs text-slate-400 hover:text-brand-600"
                  title="Add shift on this day"
                >
                  +
                </button>
              </div>
              <div className="space-y-2">
                {shiftsByDay[day].length === 0 && (
                  <p className="px-1 py-3 text-center text-[11px] text-slate-300">No shifts</p>
                )}
                {shiftsByDay[day].map((s) => (
                  <ShiftCard key={s.id} shift={s} onClick={() => setModalShiftId(s.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalShiftId !== null && user && (
        <ShiftModal
          shiftId={modalShiftId === 'new' ? null : modalShiftId}
          defaultDate={newShiftDate}
          user={user}
          staffList={staff}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
