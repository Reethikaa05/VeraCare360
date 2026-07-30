import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_DAYS = ['Mon Sep 01', 'Tue Sep 02', 'Wed Sep 03', 'Thu Sep 04', 'Fri Sep 05', 'Sat Sep 06', 'Sun Sep 07'];

const DEMO_SHIFTS: Record<string, Array<{ time: string; status: 'full' | 'partial' | 'empty'; missingDoc: number; missingNurse: number; missingRecep: number }>> = {
  'Mon Sep 01': [
    { time: '08:00 – 16:00 (Day Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'partial', missingDoc: 0, missingNurse: 1, missingRecep: 0 },
    { time: '00:00 – 08:00 (Night ICU)', status: 'empty', missingDoc: 1, missingNurse: 1, missingRecep: 0 },
  ],
  'Tue Sep 02': [
    { time: '08:00 – 16:00 (Day Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '00:00 – 08:00 (Night ICU)', status: 'partial', missingDoc: 1, missingNurse: 0, missingRecep: 0 },
  ],
  'Wed Sep 03': [
    { time: '08:00 – 16:00 (Day Shift)', status: 'partial', missingDoc: 0, missingNurse: 1, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'empty', missingDoc: 1, missingNurse: 2, missingRecep: 1 },
    { time: '00:00 – 08:00 (Night ICU)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
  ],
  'Thu Sep 04': [
    { time: '08:00 – 16:00 (Day Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '00:00 – 08:00 (Night ICU)', status: 'partial', missingDoc: 0, missingNurse: 1, missingRecep: 0 },
  ],
  'Fri Sep 05': [
    { time: '08:00 – 16:00 (Day Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'partial', missingDoc: 1, missingNurse: 0, missingRecep: 0 },
    { time: '00:00 – 08:00 (Night ICU)', status: 'empty', missingDoc: 1, missingNurse: 1, missingRecep: 1 },
  ],
  'Sat Sep 06': [
    { time: '08:00 – 16:00 (Weekend ER)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
  ],
  'Sun Sep 07': [
    { time: '08:00 – 16:00 (Weekend ER)', status: 'partial', missingDoc: 0, missingNurse: 1, missingRecep: 0 },
    { time: '16:00 – 00:00 (Evening Shift)', status: 'full', missingDoc: 0, missingNurse: 0, missingRecep: 0 },
  ],
};

const FEATURES = [
  {
    title: 'One-Tap Staff Claiming',
    body: 'Doctors, nurses, and receptionists view open slots for their profession and claim shifts instantly without phone tag or manual spreadsheet edits.',
    icon: '⚡',
    tag: 'Instant Self-Service',
  },
  {
    title: 'Serialized Concurrency Engine',
    body: 'Strict server-side validation guarantees zero double-bookings, even when multiple medical staff click to claim the exact same slot simultaneously.',
    icon: '🛡️',
    tag: '100% Conflict Free',
  },
  {
    title: 'CSV Importer & Audit Stream',
    body: 'Drop in any clinic roster spreadsheet — duplicate emails, missing roles, or non-standard date formats are cleaned and logged in an audit report.',
    icon: '📊',
    tag: 'Smart Validation',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Import & Validate Roster',
    desc: 'Upload clinic staff and shift spreadsheets. Every row validation result is logged transparently in an audit trail.',
  },
  {
    step: '02',
    title: 'Monitor Week Coverage',
    desc: 'View week-at-a-glance headcount heatmaps to detect doctor, nurse, or receptionist shortages before shifts begin.',
  },
  {
    step: '03',
    title: 'Self-Claim or Direct Assign',
    desc: 'Medical staff claim open slots, or clinic managers assign staff directly under identical rule enforcement.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(DEMO_DAYS[0]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[hsl(201_100%_13%)] text-white font-sans selection:bg-white/20 selection:text-white">
      {/* Hero Background Video - Bright, Crisp & Natural Aspect */}
      <div className="absolute inset-0 w-full h-[100vh] z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-100 brightness-110 contrast-105"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
        />
        {/* Crisp Ambient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[hsl(201_100%_13%)]" />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 flex flex-row items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <Link
          to="/"
          className="text-3xl tracking-tight text-[hsl(var(--foreground))] transition-opacity hover:opacity-90 flex items-baseline gap-0.5"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          VeraCare<sup className="text-xs">®</sup>
        </Link>

        {/* Clinic Nav Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-sm font-medium text-[hsl(var(--foreground))] transition-colors">
            Home
          </Link>
          <a href="#coverage" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            Shift Board
          </a>
          <a href="#features" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            Clinic Features
          </a>
          <a href="#rules" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            Roster Rules
          </a>
          <a href="#portal" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            Staff Portal
          </a>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="hidden sm:inline-block text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Sign In
          </Link>
          <button
            onClick={() => navigate('/login')}
            className="liquid-glass rounded-full px-6 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition-transform hover:scale-[1.03] cursor-pointer"
          >
            Access Roster
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-36 min-h-[85vh]">
        <h1
          className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal text-[hsl(var(--foreground))] animate-fade-rise drop-shadow-lg"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Where <em className="not-italic text-[hsl(var(--muted-foreground))]">care</em> never clocks out,{' '}
          <em className="not-italic text-[hsl(var(--muted-foreground))]">precision scheduling begins.</em>
        </h1>

        <p className="text-white/90 text-base sm:text-lg max-w-2xl mt-8 leading-relaxed font-normal animate-fade-rise-delay drop-shadow-md">
          Designed for modern medical clinics, hospital units, and health teams. Eliminate double-bookings, enforce doctor and nurse headcount rules, and let staff claim open shifts in real time.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-12 animate-fade-rise-delay-2">
          <button
            onClick={() => navigate('/login')}
            className="liquid-glass rounded-full px-12 py-4 text-base font-medium text-[hsl(var(--foreground))] transition-transform hover:scale-[1.03] cursor-pointer shadow-2xl"
          >
            Access Clinic Roster
          </button>
          <a
            href="#coverage"
            className="rounded-full border border-white/30 bg-black/30 px-8 py-4 text-base font-medium text-white hover:bg-black/50 transition-colors backdrop-blur-md"
          >
            Preview Shift Board ↓
          </a>
        </div>
      </main>

      {/* SECTION 1: #coverage (Interactive Shift Board Preview with Floating Clock Rings Video Backdrop) */}
      <section id="coverage" className="relative z-10 overflow-hidden py-28 border-t border-white/10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50 z-0"
          src="/videos/floating_clock_rings.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(201_100%_13%)] via-black/40 to-[hsl(201_100%_13%)] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 block mb-2">
              ● Live 24/7 Roster Clock Engine
            </span>
            <h2
              className="text-4xl sm:text-6xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Week-at-a-Glance Coverage Board
            </h2>
            <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl mx-auto">
              Click across the clinic schedule to inspect doctor, nurse, and receptionist coverage in real time.
            </p>
          </div>

          {/* Day Selector Pills */}
          <div className="flex items-center justify-center gap-2.5 overflow-x-auto py-3 mb-10">
            {DEMO_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`rounded-full px-5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeDay === day
                    ? 'liquid-glass text-white border border-white/40 shadow-xl scale-105 ring-1 ring-white/30'
                    : 'border border-white/10 bg-black/40 text-[hsl(var(--muted-foreground))] hover:text-white backdrop-blur-md'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Shift Cards Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {DEMO_SHIFTS[activeDay]?.map((s, idx) => (
              <div
                key={idx}
                className="liquid-glass rounded-3xl p-7 border border-white/20 shadow-2xl backdrop-blur-2xl text-left transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-xs font-semibold text-white tracking-wide">{s.time}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-mono capitalize border ${
                      s.status === 'full'
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : s.status === 'partial'
                        ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                        : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {s.status === 'full' ? 'Fully Staffed' : s.status === 'partial' ? 'Partial Coverage' : 'Unstaffed'}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-white/80">
                    <span>Doctors Needed:</span>
                    <span className={s.missingDoc > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {s.missingDoc > 0 ? `${s.missingDoc} Short` : '✓ Complete'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span>Nurses Needed:</span>
                    <span className={s.missingNurse > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {s.missingNurse > 0 ? `${s.missingNurse} Short` : '✓ Complete'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span>Receptionists Needed:</span>
                    <span className={s.missingRecep > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {s.missingRecep > 0 ? `${s.missingRecep} Short` : '✓ Complete'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="liquid-glass mt-6 w-full rounded-full py-3 text-xs font-semibold text-white hover:scale-105 transition-transform cursor-pointer"
                >
                  Claim Shift Slot →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: #features (Clinic Features with Abstract Liquid Glass Video Backdrop) */}
      <section id="features" className="relative z-10 overflow-hidden py-28 border-t border-white/10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50 z-0"
          src="/videos/abstract_liquid_glass.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(201_100%_13%)] via-black/50 to-[hsl(201_100%_13%)] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] block mb-2">
              Built for Medical Operations
            </span>
            <h2
              className="text-4xl sm:text-6xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Engineered for Zero Scheduling Failures
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="liquid-glass rounded-3xl p-8 border border-white/20 shadow-2xl backdrop-blur-2xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl">{f.icon}</span>
                    <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 font-mono text-[10px] uppercase text-emerald-400">
                      {f.tag}
                    </span>
                  </div>
                  <h3
                    className="text-3xl font-normal text-white mb-3"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: #rules (3-Step Roster Rules Engine with Floating Clock Video Backdrop) */}
      <section id="rules" className="relative z-10 overflow-hidden py-28 border-t border-white/10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50 z-0"
          src="/videos/floating_clock_rings.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(201_100%_13%)] via-black/60 to-[hsl(201_100%_13%)] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] block mb-2">
              Workflow Architecture
            </span>
            <h2
              className="text-4xl sm:text-6xl font-normal text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Three Steps to Perfect Clinic Coverage
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="liquid-glass rounded-3xl p-8 border border-white/20 relative text-left transition-all hover:scale-[1.02]"
              >
                <span className="font-mono text-4xl font-bold text-white/30 block mb-4">{s.step}</span>
                <h3
                  className="text-3xl font-normal text-white mb-3"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: #portal (Quick Access Portal Card with Abstract Liquid Glass Video Backdrop) */}
      <section id="portal" className="relative z-10 overflow-hidden py-28 border-t border-white/10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-55 z-0"
          src="/videos/abstract_liquid_glass.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(201_100%_13%)] via-black/50 to-[hsl(201_100%_13%)] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="liquid-glass rounded-3xl p-12 sm:p-16 border border-white/30 shadow-2xl backdrop-blur-2xl text-center max-w-4xl mx-auto">
            <h2
              className="text-4xl sm:text-6xl font-normal text-white mb-4"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Ready to Streamline Your Clinic Schedule?
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xl mx-auto leading-relaxed mb-8">
              Access demo accounts instantly to test manager shift allocation, role headcount validation, and staff shift claiming.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="liquid-glass rounded-full px-12 py-4 text-sm font-semibold text-white hover:scale-105 transition-transform cursor-pointer shadow-2xl"
              >
                Sign In to Clinic Portal →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-8 py-8 text-center text-xs text-[hsl(var(--muted-foreground))] font-mono">
        VeraCare® Clinic Scheduler — 24/7 Medical Shift Roster Platform.
      </footer>
    </div>
  );
}
