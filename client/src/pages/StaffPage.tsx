import { useEffect, useState } from 'react';
import { api, StaffMember } from '../lib/api';

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.listStaff().then(({ staff }) => setStaff(staff)).finally(() => setLoading(false));
  }, []);

  const filtered = staff.filter((s) =>
    (s.full_name + s.email + s.profession).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-rise">
      <div>
        <h1
          className="text-4xl font-normal text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Clinic Staff Directory
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          <span className="text-white font-semibold">{staff.length}</span> active medical professionals on roster.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by staff name, email, or medical profession…"
          className="w-full max-w-md rounded-full border border-white/10 bg-slate-900 px-5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
        />

        <div className="flex items-center gap-2 text-xs font-mono text-[hsl(var(--muted-foreground))]">
          <span>Showing <strong className="text-white">{filtered.length}</strong> staff</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm font-mono text-[hsl(var(--muted-foreground))]">
          Loading roster...
        </div>
      ) : (
        <div className="liquid-glass overflow-hidden rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/5 font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Profession</th>
                <th className="px-6 py-4 hidden sm:table-cell">Email Address</th>
                <th className="px-6 py-4 hidden md:table-cell">External Staff ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-white/5">
                  <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] uppercase text-white border border-white/15">
                      {s.full_name.slice(0, 2)}
                    </div>
                    {s.full_name}
                  </td>
                  <td className="px-6 py-4 capitalize">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-mono ${
                        s.profession === 'doctor'
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                          : s.profession === 'nurse'
                          ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {s.profession}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/70 hidden sm:table-cell font-mono">{s.email}</td>
                  <td className="px-6 py-4 text-[hsl(var(--muted-foreground))] hidden md:table-cell font-mono">
                    {s.external_staff_id || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
