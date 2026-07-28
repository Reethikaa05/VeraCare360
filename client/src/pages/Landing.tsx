import { Link } from 'react-router-dom';
import ShiftRing from '../components/ShiftRing';

const FEATURES = [
  {
    title: 'Claim a shift in one tap',
    body: 'Staff see exactly which shifts still need their profession and grab one without a phone call or a spreadsheet edit.',
  },
  {
    title: 'Never double-booked',
    body: 'Every claim is checked against headcount and overlapping shifts on the server, even when a dozen people act at once.',
  },
  {
    title: 'Hand it a messy CSV',
    body: 'Duplicate rows, "RN" vs "Registered Nurse," impossible dates — the importer cleans it and shows you exactly what it changed.',
  },
];

const STEPS = [
  { verb: 'Import', detail: 'Drop in the clinic\u2019s roster and shift spreadsheet. Every row that needed a fix is logged, not silently guessed.' },
  { verb: 'Cover', detail: 'See the week at a glance — which shifts are full, partial, or empty, and which role is missing.' },
  { verb: 'Claim', detail: 'Staff pick up open shifts themselves, or a manager assigns directly. Same rules apply either way.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-handoff text-sm font-bold text-ink">C</span>
          <span className="font-display text-lg font-semibold tracking-tight">Clinic Scheduler</span>
        </div>
        <Link
          to="/login"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/10"
        >
          Sign in
        </Link>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pt-16">
        <div className="rise-in">
          <span className="mb-5 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-brand-300">
            Built for one small clinic, one shift at a time
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Care doesn&rsquo;t clock out.
            <br />
            <span className="italic text-brand-300">Neither should your schedule.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-300">
            Replace the shared spreadsheet with a scheduler that knows the rules: the right
            headcount, no overlapping claims, and a coverage board that shows gaps before they
            become a problem.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-brand-500/20 transition-transform hover:scale-[1.02] hover:bg-brand-400"
            >
              Sign in to your clinic
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-white">
              See how it works
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="rise-in" style={{ animationDelay: '0.15s' }}>
            <ShiftRing size={340} />
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-white/10 bg-white/[0.02] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Three steps, in order</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Each step depends on the last — you can&rsquo;t see accurate coverage until the roster is
            clean, and you can&rsquo;t claim a shift until coverage shows it&rsquo;s open.
          </p>

          <div className="relative mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent sm:block" />
            {STEPS.map((s) => (
              <div key={s.verb} className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-brand-400/40 bg-ink font-display text-sm font-semibold text-brand-300">
                  {s.verb[0]}
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{s.verb}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROOF STRIP */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 sm:grid-cols-3">
          <div>
            <p className="font-display font-mono text-3xl font-semibold text-white">112</p>
            <p className="mt-1 text-xs text-slate-400">shifts imported clean from one clinic&rsquo;s real spreadsheet</p>
          </div>
          <div>
            <p className="font-display font-mono text-3xl font-semibold text-white">5</p>
            <p className="mt-1 text-xs text-slate-400">bad rows caught and explained instead of guessed at</p>
          </div>
          <div>
            <p className="font-display font-mono text-3xl font-semibold text-white">0</p>
            <p className="mt-1 text-xs text-slate-400">double-bookings possible, even under concurrent claims</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500">
        Clinic Shift Scheduler — a take-home project.
      </footer>
    </div>
  );
}
