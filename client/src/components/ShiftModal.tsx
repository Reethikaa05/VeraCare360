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
    if (!confirm('Delete this shift? This also removes any staff claims on it.')) return;
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

  async function handleAssign() {
    if (!shift || !assignUserId) return;
    setError(null);
    setSaving(true);
    try {
      await api.assignShift(shift.id, Number(assignUserId));
      setAssignUserId('');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to assign staff');
    } finally {
      setSaving(false);
    }
  }

  const myClaim = shift?.claims.find((c) => c.user_id === user.id);
  const canClaimSelf =
    !isManager && shift && user.profession && shift.missing[user.profession] > 0 && !myClaim;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isNew ? 'New shift' : `Shift ${shift?.external_shift_id ? `#${shift.external_shift_id}` : ''}`}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : (
          <div className="space-y-5 p-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            {conflicts && conflicts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Conflicts: {conflicts.map((c) => c.name).join(', ')}
              </div>
            )}

            {shift && <StatusBadge status={shift.status} />}

            {isManager ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Start time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">End time</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <p className="mt-1 text-[11px] text-slate-400">End ≤ start is treated as overnight (next day).</p>
                </div>

                {PROFESSIONS.map((p) => (
                  <div key={p}>
                    <label className="mb-1 block text-xs font-medium text-slate-600">{PROFESSION_LABELS[p]} needed</label>
                    <input
                      type="number" min={0}
                      value={p === 'doctor' ? reqDoctor : p === 'nurse' ? reqNurse : reqReceptionist}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value));
                        if (p === 'doctor') setReqDoctor(v); else if (p === 'nurse') setReqNurse(v); else setReqReceptionist(v);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
            ) : shift ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-medium text-slate-900">{shift.date}</p>
                <p className="text-slate-600">{shift.start_time} – {shift.end_time}</p>
                {shift.notes && <p className="mt-2 text-slate-500">{shift.notes}</p>}
              </div>
            ) : null}

            {shift && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned staff</p>
                <div className="space-y-1.5">
                  {PROFESSIONS.map((p) => {
                    const claimsForProf = shift.claims.filter((c) => c.profession === p);
                    const required = p === 'doctor' ? shift.req_doctor : p === 'nurse' ? shift.req_nurse : shift.req_receptionist;
                    if (required === 0 && claimsForProf.length === 0) return null;
                    return (
                      <div key={p} className="rounded-lg border border-slate-200 p-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
                          <span>{PROFESSION_LABELS[p]}</span>
                          <span>{claimsForProf.length}/{required}</span>
                        </div>
                        {claimsForProf.length === 0 && <p className="text-xs text-slate-400">None assigned</p>}
                        {claimsForProf.map((c) => (
                          <div key={c.claim_id} className="flex items-center justify-between py-0.5 text-sm">
                            <span className="text-slate-700">
                              {c.full_name} {c.assigned_by === 'manager' && <span className="text-[10px] text-slate-400">(assigned)</span>}
                            </span>
                            {(isManager || c.user_id === user.id) && (
                              <button
                                disabled={saving}
                                onClick={() => handleUnclaim(c.user_id)}
                                className="text-xs font-medium text-red-500 hover:text-red-700"
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

            {isManager && shift && (
              <div className="flex items-center gap-2">
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Assign a staff member…</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.profession})</option>
                  ))}
                </select>
                <button
                  disabled={!assignUserId || saving}
                  onClick={handleAssign}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-40"
                >
                  Assign
                </button>
              </div>
            )}

            {canClaimSelf && (
              <button
                disabled={saving}
                onClick={handleClaimSelf}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Claim this shift
              </button>
            )}
            {myClaim && !isManager && (
              <p className="text-center text-sm text-emerald-600">You're claimed for this shift.</p>
            )}

            {isManager && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete shift
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="ml-auto rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : isNew ? 'Create shift' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
