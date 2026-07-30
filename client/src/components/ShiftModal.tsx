import { useEffect, useState } from 'react';
import { api, Shift, StaffMember, User } from '../lib/api';
import StatusBadge from './StatusBadge';

const PROFESSIONS: Array<'doctor' | 'nurse' | 'receptionist'> = ['doctor', 'nurse', 'receptionist'];
const PROFESSION_LABELS: Record<string, string> = { doctor: 'Doctors', nurse: 'Nurses', receptionist: 'Receptionists' };

interface Props {
  shiftId: number | null; // null = creating new
  defaultDate?: string;
  user: User;
  staffList: StaffMember[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ShiftModal({ shiftId, defaultDate, user, staffList, onClose, onSaved }: Props) {
  const isManager = user.role === 'manager';
  const isNew = shiftId === null;

  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);

  const [date, setDate] = useState(defaultDate || '');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [reqDoctor, setReqDoctor] = useState(0);
  const [reqNurse, setReqNurse] = useState(1);
  const [reqReceptionist, setReqReceptionist] = useState(0);
  const [notes, setNotes] = useState('');
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  useEffect(() => {
    if (shiftId === null) return;
    setLoading(true);
    api.getShift(shiftId).then(({ shift }) => {
      setShift(shift);
      setDate(shift.date);
      setStartTime(shift.start_time);
      setEndTime(shift.end_time);
      setReqDoctor(shift.req_doctor);
      setReqNurse(shift.req_nurse);
      setReqReceptionist(shift.req_receptionist);
      setNotes(shift.notes || '');
    }).finally(() => setLoading(false));
  }, [shiftId]);

  async function refresh() {
    if (shift) {
      const { shift: updated } = await api.getShift(shift.id);
      setShift(updated);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setConflicts(null);
    try {
      const payload = {
        date, start_time: startTime, end_time: endTime,
        req_doctor: reqDoctor, req_nurse: reqNurse, req_receptionist: reqReceptionist,
        notes: notes || null,
      };
      if (isNew) {
        await api.createShift(payload);
      } else if (shift) {
        await api.updateShift(shift.id, payload);
      }
      onSaved();
    } catch (err: any) {
      if (err.status === 409 && err.message?.includes('conflict')) {
        setError(err.message);
      } else {
        setError(err.message || 'Failed to save shift');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!shift) return;
    if (!confirm('Delete this shift? This will also remove any staff claims on it.')) return;
    setSaving(true);
    try {
      await api.deleteShift(shift.id);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to delete shift');
      setSaving(false);
    }
  }

  async function handleClaimSelf() {
    if (!shift) return;
    setError(null);
    setSaving(true);
    try {
      await api.claimShift(shift.id);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to claim shift');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnclaim(userId: number) {
    if (!shift) return;
    setError(null);
    setSaving(true);
    try {
      await api.unclaimShift(shift.id, userId);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to remove claim');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignUser(userIdToAssign: number) {
    if (!shift) return;
    setError(null);
    setSaving(true);
    try {
      await api.assignShift(shift.id, userIdToAssign);
      setAssignUserId('');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to assign staff member');
    } finally {
      setSaving(false);
    }
  }

  const myClaim = shift?.claims.find((c) => c.user_id === user.id);
  const canClaimSelf =
    !isManager && shift && user.profession && shift.missing[user.profession] > 0 && !myClaim;

  const filteredStaffList = staffList.filter((s) =>
    (s.full_name + s.email + s.profession).toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="liquid-glass my-auto max-h-[85vh] w-full max-w-xl flex flex-col rounded-3xl p-6 shadow-2xl backdrop-blur-2xl text-white border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div>
            <h2
              className="text-2xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {isNew ? 'Create Clinic Shift' : `Shift Slot #${shift?.external_shift_id || shift?.id}`}
            </h2>
            <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              {isManager ? 'Manager Staffing Control' : 'Shift Details'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
            ✕
          </button>
        </div>

        {/* Scrollable Content Area */}
        {loading ? (
          <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))] font-mono">Loading shift parameters…</div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-6">
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3.5 text-xs text-rose-200">{error}</div>
            )}
            {conflicts && conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 p-3.5 text-xs text-amber-200">
                Conflicts Detected: {conflicts.map((c) => c.name).join(', ')}
              </div>
            )}

            {shift && <StatusBadge status={shift.status} />}

            {/* Manager Shift Creation & Slotting Controls */}
            {isManager ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Shift Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                    />
                  </div>
                </div>

                {/* Headcount Role Slotting Section */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    Role Headcount Requirements (Slotting)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Doctor Slot Counter */}
                    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                      <span className="text-xs font-semibold text-indigo-300 block mb-1">Doctors Needed</span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReqDoctor(Math.max(0, reqDoctor - 1))}
                          className="h-6 w-6 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono text-base font-bold text-white w-6">{reqDoctor}</span>
                        <button
                          type="button"
                          onClick={() => setReqDoctor(reqDoctor + 1)}
                          className="h-6 w-6 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Nurse Slot Counter */}
                    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                      <span className="text-xs font-semibold text-teal-300 block mb-1">Nurses Needed</span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReqNurse(Math.max(0, reqNurse - 1))}
                          className="h-6 w-6 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono text-base font-bold text-white w-6">{reqNurse}</span>
                        <button
                          type="button"
                          onClick={() => setReqNurse(reqNurse + 1)}
                          className="h-6 w-6 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Receptionist Slot Counter */}
                    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                      <span className="text-xs font-semibold text-amber-300 block mb-1">Receptionists</span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReqReceptionist(Math.max(0, reqReceptionist - 1))}
                          className="h-6 w-6 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono text-base font-bold text-white w-6">{reqReceptionist}</span>
                        <button
                          type="button"
                          onClick={() => setReqReceptionist(reqReceptionist + 1)}
                          className="h-6 w-6 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Shift Instructions / Department Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40 placeholder:text-white/30"
                    placeholder="ICU duty, ER handoff, or special clinic notes..."
                  />
                </div>
              </div>
            ) : shift ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="font-semibold text-white">{shift.date}</p>
                <p className="text-white/70 font-mono text-xs">{shift.start_time} – {shift.end_time}</p>
                {shift.notes && <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{shift.notes}</p>}
              </div>
            ) : null}

            {/* Currently Claimed / Assigned Roster */}
            {shift && (
              <div>
                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Current Shift Roster</p>
                <div className="space-y-2">
                  {PROFESSIONS.map((p) => {
                    const claimsForProf = shift.claims.filter((c) => c.profession === p);
                    const required = p === 'doctor' ? shift.req_doctor : p === 'nurse' ? shift.req_nurse : shift.req_receptionist;
                    if (required === 0 && claimsForProf.length === 0) return null;
                    return (
                      <div key={p} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-white">
                          <span className="capitalize">{PROFESSION_LABELS[p]}</span>
                          <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{claimsForProf.length}/{required} filled</span>
                        </div>
                        {claimsForProf.length === 0 && <p className="text-xs text-white/40 italic">No staff assigned yet</p>}
                        {claimsForProf.map((c) => (
                          <div key={c.claim_id} className="flex items-center justify-between py-1 text-xs">
                            <span className="text-white font-medium flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                              {c.full_name} {c.assigned_by === 'manager' && <span className="text-[10px] text-white/40">(assigned by manager)</span>}
                            </span>
                            {(isManager || c.user_id === user.id) && (
                              <button
                                disabled={saving}
                                onClick={() => handleUnclaim(c.user_id)}
                                className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manager Direct Staff Assignment Section with Search & Scroll */}
            {isManager && shift && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    Directly Assign Staff Member to Shift
                  </label>
                  <span className="text-[10px] font-mono text-white/60">{staffList.length} staff available</span>
                </div>

                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Filter doctor or nurse by name/role..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white focus:outline-none"
                />

                {/* Scrollable Staff List Selector */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-white/10 rounded-xl bg-slate-950 p-2">
                  {filteredStaffList.length === 0 ? (
                    <div className="text-center py-4 text-xs text-white/40 italic">No matching staff found</div>
                  ) : (
                    filteredStaffList.map((s) => {
                      const alreadyAssigned = shift.claims.some((c) => c.user_id === s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs transition-colors hover:bg-white/10"
                        >
                          <div>
                            <span className="font-semibold text-white block">{s.full_name}</span>
                            <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))] capitalize">
                              {s.profession} · {s.email}
                            </span>
                          </div>
                          <button
                            disabled={alreadyAssigned || saving}
                            onClick={() => handleAssignUser(s.id)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                              alreadyAssigned
                                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                : 'liquid-glass text-white hover:scale-105'
                            }`}
                          >
                            {alreadyAssigned ? 'Assigned' : '+ Assign'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {canClaimSelf && (
              <button
                disabled={saving}
                onClick={handleClaimSelf}
                className="liquid-glass w-full rounded-full py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                Claim This Shift Slot
              </button>
            )}

            {myClaim && !isManager && (
              <p className="text-center text-xs font-medium text-emerald-400">✓ You are claimed for this shift</p>
            )}
          </div>
        )}

        {/* Sticky Footer */}
        {isManager && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-white/10 pt-4 mt-4 bg-[hsl(201_100%_13%)]/95 backdrop-blur-md">
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Delete Shift
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="liquid-glass ml-auto rounded-full px-6 py-2.5 text-xs font-semibold text-white transition-all hover:scale-105 disabled:opacity-40 cursor-pointer"
            >
              {saving ? 'Saving…' : isNew ? 'Create Shift' : 'Save Shift Parameters'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
