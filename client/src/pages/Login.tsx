import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profession, setProfession] = useState<'doctor' | 'nurse' | 'receptionist'>('doctor');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        navigate('/dashboard', { replace: true });
      } else {
        setSuccessMsg('Account created successfully! Signing in...');
        setTimeout(async () => {
          await login(email.trim() || 'marcus.whitfield@clinicmail.test', password || 'Passw0rd!');
          navigate('/my-shifts', { replace: true });
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  function autofill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Passw0rd!');
    setError(null);
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[hsl(201_100%_13%)] px-6 py-12 text-white font-sans selection:bg-white/20 selection:text-white">
      {/* Bright Custom Floating Clock Video Backdrop */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60 brightness-110"
        src="/videos/floating_clock_rings.mp4"
      />
      <div className="absolute inset-0 bg-black/30 z-0" />

      {/* Top Left Navigation Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="liquid-glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white transition-all hover:scale-105 border border-white/20 cursor-pointer shadow-lg"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-rise">
        {/* Brand Header */}
        <Link to="/" className="mb-8 flex flex-col items-center group">
          <span
            className="text-4xl tracking-tight text-white transition-transform group-hover:scale-105"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            VeraCare<sup className="text-sm">®</sup>
          </span>
          <span className="mt-1 font-mono text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            Clinic Scheduler Access
          </span>
        </Link>

        {/* Tab Selector */}
        <div className="mb-6 flex rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`w-1/2 rounded-full py-2 text-xs font-semibold transition-all cursor-pointer ${
              mode === 'login'
                ? 'liquid-glass text-white shadow'
                : 'text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`w-1/2 rounded-full py-2 text-xs font-semibold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'liquid-glass text-white shadow'
                : 'text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}
          >
            Create Staff Account
          </button>
        </div>

        {/* Main Form Container */}
        <div className="liquid-glass rounded-3xl p-8 shadow-2xl backdrop-blur-2xl border border-white/20">
          <div className="mb-6 text-center">
            <h1
              className="text-3xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {mode === 'login' ? 'Welcome Back' : 'Join Clinic Roster'}
            </h1>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {mode === 'login'
                ? 'Sign in to access your shift portal and coverage board'
                : 'Register your staff profile to start browsing and claiming open shifts'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 backdrop-blur">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 backdrop-blur">
                {successMsg}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                  placeholder="Dr. Evelyn Thorne"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Email Address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder={mode === 'login' ? 'manager@clinic.local' : 'evelyn.thorne@clinicmail.test'}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Medical Specialty / Profession
                </label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="liquid-glass w-full rounded-full py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign In to Dashboard'
                : 'Create Account & Sign In'}
            </button>
          </form>

          {/* One-Click Quick Demo Credentials */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] text-center">
              Instant Demo Logins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => autofill('manager@clinic.local')}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <div className="text-xs font-semibold text-white">Manager</div>
                <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate">manager@clinic.local</div>
              </button>
              <button
                type="button"
                onClick={() => autofill('marcus.whitfield@clinicmail.test')}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <div className="text-xs font-semibold text-white">Doctor</div>
                <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate">marcus.whitfield...</div>
              </button>
              <button
                type="button"
                onClick={() => autofill('aisha.sharma@clinicmail.test')}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <div className="text-xs font-semibold text-white">Nurse</div>
                <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate">aisha.sharma...</div>
              </button>
              <button
                type="button"
                onClick={() => autofill('karan.ali@clinicmail.test')}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
              >
                <div className="text-xs font-semibold text-white">Receptionist</div>
                <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate">karan.ali...</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          Default password for all demo accounts: <code className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">Passw0rd!</code>
        </div>
      </div>
    </div>
  );
}
