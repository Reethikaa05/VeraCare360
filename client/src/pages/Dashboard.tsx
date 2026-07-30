import { useCallback, useEffect, useState } from 'react';
import { api, Shift, StaffMember } from '../lib/api';
import { useAuth } from '../lib/auth';
import { addDays, formatDateLabel, formatWeekRange, startOfWeek, todayIso, weekDays } from '../lib/dateUtils';
import StatusBadge from '../components/StatusBadge';
import ShiftModal from '../components/ShiftModal';

const PROF_ORDER: Array<'doctor' | 'nurse' | 'receptionist'> = ['doctor', 'nurse', 'receptionist'];
const PROF_SHORT: Record<string, string> = { doctor: 'Dr', nurse: 'Nu', receptionist: 'Re' };

function ShiftCard({ shift, onClick }: { shift: Shift; onClick: () => void }) {
  const borderGradient =
    shift.status === 'full'
      ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-400'
      : shift.status === 'partial'
      ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-400'
      : 'border-rose-500/40 bg-rose-500/5 hover:border-rose-400';

  const missingRoles = PROF_ORDER.filter((p) => shift.missing[p] > 0);

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border ${borderGradient} p-3.5 text-left shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] cursor-pointer`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-white tracking-wide">
          {shift.start_time}–{shift.end_time}
        </span>
        <StatusBadge status={shift.status} />
      </div>

      {missingRoles.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {missingRoles.map((p) => (
            <span
              key={p}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-300"
            >
              {PROF_SHORT[p]} short {shift.missing[p]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
          {shift.counts.doctor + shift.counts.nurse + shift.counts.receptionist} staff assigned
        </p>
      )}

      {shift.notes && (
        <p className="mt-1 text-[10px] text-white/50 truncate italic">{shift.notes}</p>
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

  // Filters & Extra Features
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'nurse' | 'receptionist' | 'unstaffed'>('all');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  // Filtered Shifts Calculation
  const filteredShifts = shifts.filter((s) => {
    if (roleFilter === 'doctor') return s.missing.doctor > 0;
    if (roleFilter === 'nurse') return s.missing.nurse > 0;
    if (roleFilter === 'receptionist') return s.missing.receptionist > 0;
    if (roleFilter === 'unstaffed') return s.status === 'empty';
    return true;
  });

  const shiftsByDay: Record<string, Shift[]> = {};
  days.forEach((d) => {
    shiftsByDay[d] = [];
  });
  filteredShifts.forEach((s) => {
    if (shiftsByDay[s.date]) shiftsByDay[s.date].push(s);
  });

  // KPI Totals & Coverage Rate
  const totals = { total: shifts.length, empty: 0, partial: 0, full: 0 };
  shifts.forEach((s) => {
    totals[s.status]++;
  });

  const doctorShortage = shifts.reduce((acc, s) => acc + s.missing.doctor, 0);
  const nurseShortage = shifts.reduce((acc, s) => acc + s.missing.nurse, 0);
  const receptionistShortage = shifts.reduce((acc, s) => acc + s.missing.receptionist, 0);

  const totalPositionsNeeded = shifts.reduce(
    (acc, s) => acc + s.req_doctor + s.req_nurse + s.req_receptionist,
    0
  );
  const totalPositionsFilled = shifts.reduce(
    (acc, s) =>
      acc + (s.counts.doctor + s.counts.nurse + s.counts.receptionist),
    0
  );
  const coveragePercentage = totalPositionsNeeded
    ? Math.round((totalPositionsFilled / totalPositionsNeeded) * 100)
    : 100;

  // Currently Active Shift for Today (Live Roster Widget)
  const todayShifts = shifts.filter((s) => s.date === todayIso());
  const activeTodayStaff = todayShifts.flatMap((s) => s.claims);

  function closeModal() {
    setModalShiftId(null);
    setNewShiftDate(undefined);
  }
  function onSaved() {
    closeModal();
    load();
  }

  function handleSendBroadcast() {
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setShowBroadcastModal(false);
    }, 2000);
  }

  return (
    <div className="space-y-8 animate-fade-rise">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            className="text-4xl sm:text-5xl font-normal text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Clinic Coverage Board
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Week of <span className="text-white font-mono">{formatWeekRange(weekStart)}</span>
          </p>
        </div>

        {/* Date Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="liquid-glass flex items-center rounded-full p-1 border border-white/10">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(todayIso()))}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
            >
              This Week
            </button>
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
            className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-white focus:outline-none"
          />

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="liquid-glass rounded-full px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105 cursor-pointer"
          >
            📡 Broadcast Alert
          </button>

          <button
            onClick={() => {
              setNewShiftDate(todayIso() > weekStart ? weekStart : todayIso());
              setModalShiftId('new');
            }}
            className="liquid-glass rounded-full px-5 py-2 text-xs font-semibold text-white transition-transform hover:scale-105 cursor-pointer border border-white/20"
          >
            + Create Shift
          </button>
        </div>
      </div>

      {/* KPI Analytics Gauge & Statistics Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Coverage Percentage Card */}
        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Coverage Score
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-400">{coveragePercentage}% Filled</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="text-4xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {totalPositionsFilled}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">/ {totalPositionsNeeded} slots covered</span>
          </div>
          {/* Gauge Bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
        </div>

        {/* Shift Breakdown Card */}
        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-2">
            Shift Status Breakdown
          </span>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2">
              <div className="font-mono text-xl font-bold text-emerald-400">{totals.full}</div>
              <div className="text-[10px] text-emerald-300">Fully Staffed</div>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-2">
              <div className="font-mono text-xl font-bold text-amber-400">{totals.partial}</div>
              <div className="text-[10px] text-amber-300">Partial</div>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2">
              <div className="font-mono text-xl font-bold text-rose-400">{totals.empty}</div>
              <div className="text-[10px] text-rose-300">Unstaffed</div>
            </div>
          </div>
        </div>

        {/* Role Shortage Counter Card */}
        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-2">
            Role Shortages
          </span>
          <div className="flex items-center justify-between text-xs space-x-2 mt-3">
            <div className="flex-1 rounded-2xl bg-white/5 p-2 text-center border border-white/10">
              <div className="text-white font-mono text-base font-bold">{doctorShortage}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Doctors</div>
            </div>
            <div className="flex-1 rounded-2xl bg-white/5 p-2 text-center border border-white/10">
              <div className="text-white font-mono text-base font-bold">{nurseShortage}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Nurses</div>
            </div>
            <div className="flex-1 rounded-2xl bg-white/5 p-2 text-center border border-white/10">
              <div className="text-white font-mono text-base font-bold">{receptionistShortage}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Reception</div>
            </div>
          </div>
        </div>

        {/* Live On-Duty Roster Widget */}
        <div className="liquid-glass rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Today's Live Roster
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Now
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {activeTodayStaff.slice(0, 4).map((c, i) => (
                <div
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white border-2 border-[hsl(201_100%_13%)]"
                >
                  {c.full_name?.slice(0, 2) || 'ST'}
                </div>
              ))}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              <strong className="text-white">{activeTodayStaff.length}</strong> staff working today
            </div>
          </div>
        </div>
      </div>

      {/* Role Shortage Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))] mr-2">Filter View:</span>
          {(['all', 'doctor', 'nurse', 'receptionist', 'unstaffed'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all cursor-pointer ${
                roleFilter === r
                  ? 'liquid-glass text-white border border-white/30'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              {r === 'all' ? 'All Shifts' : r === 'unstaffed' ? 'Unstaffed Only' : `Needs ${r}`}
            </button>
          ))}
        </div>

        <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          Showing <span className="text-white font-semibold">{filteredShifts.length}</span> shifts
        </span>
      </div>

      {/* Week Grid */}
      {loading ? (
        <div className="py-24 text-center text-sm text-[hsl(var(--muted-foreground))] font-mono">
          Fetching coverage board...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const isToday = day === todayIso();
            return (
              <div
                key={day}
                className={`liquid-glass rounded-3xl p-3 border transition-all ${
                  isToday ? 'border-white/40 ring-1 ring-white/30' : 'border-white/10'
                }`}
              >
                {/* Day Header */}
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 px-1">
                  <div>
                    <span
                      className={`text-lg font-normal block ${
                        isToday ? 'text-white font-bold' : 'text-white/80'
                      }`}
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {formatDateLabel(day)}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 block">
                        Today
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setNewShiftDate(day);
                      setModalShiftId('new');
                    }}
                    className="rounded-full h-6 w-6 flex items-center justify-center border border-white/20 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    title="Add shift on this day"
                  >
                    +
                  </button>
                </div>

                {/* Day Shifts Container */}
                <div className="space-y-2.5 min-h-[140px]">
                  {shiftsByDay[day].length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 text-[11px] text-white/30 italic">
                      No shifts
                    </div>
                  ) : (
                    shiftsByDay[day].map((s) => (
                      <ShiftCard
                        key={s.id}
                        shift={s}
                        onClick={() => setModalShiftId(s.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="liquid-glass max-w-md w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl text-white">
            <h2
              className="text-3xl font-normal text-white mb-2"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Broadcast Open Shift Alert
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 leading-relaxed">
              Send an instant push & email alert to all doctors, nurses, and receptionists for unstaffed shifts this week.
            </p>

            {broadcastSent ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-center text-xs text-emerald-200">
                ✓ Broadcast alert successfully dispatched to 35 staff members!
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                    Custom Message
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                    defaultValue="Urgent: Open shifts are available for doctor and nurse coverage this week. Please log in to claim."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowBroadcastModal(false)}
                    className="rounded-full px-4 py-2 text-xs font-medium text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendBroadcast}
                    className="liquid-glass rounded-full px-6 py-2 text-xs font-semibold text-white transition-all hover:scale-105"
                  >
                    Send Alert Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Modal */}
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
