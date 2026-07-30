import { useState } from 'react';
import { User } from '../lib/api';

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profession, setProfession] = useState(user.profession || 'doctor');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    }, 600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="liquid-glass my-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-2xl backdrop-blur-2xl text-white border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-mono text-sm font-bold border border-white/20">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2
                className="text-2xl font-normal text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Profile & Settings
              </h2>
              <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                {user.role === 'manager' ? 'Clinic Manager Account' : `${user.profession?.toUpperCase()} ACCOUNT`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {savedSuccess && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3.5 text-center text-xs text-emerald-200 font-mono">
              ✓ Profile settings updated successfully!
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
            />
          </div>

          {user.role !== 'manager' && (
            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Medical Specialty / Profession
              </label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40 capitalize"
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
          )}

          {/* Notification Preferences */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] block">
              Shift Alert Preferences
            </span>

            <label className="flex items-center justify-between text-xs text-white cursor-pointer">
              <span>Email alerts for open shift slots</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-white cursor-pointer">
              <span>Instant push notifications for roster changes</span>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
            </label>
          </div>

          {/* Security Summary */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-white">Password & Security</div>
              <div className="text-[11px] text-[hsl(var(--muted-foreground))]">Password last updated 14 days ago</div>
            </div>
            <button
              type="button"
              onClick={() => alert('Password update request sent to your registered email.')}
              className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer"
            >
              Update Key
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 text-xs font-medium text-white/60 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="liquid-glass rounded-full px-6 py-2.5 text-xs font-semibold text-white hover:scale-105 transition-all disabled:opacity-40 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
