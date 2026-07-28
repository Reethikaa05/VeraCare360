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
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Staff directory</h1>
      <p className="mb-6 text-sm text-slate-500">{staff.length} active staff imported from the clinic roster.</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, or role…"
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Profession</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Email</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Staff ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{s.full_name}</td>
                  <td className="px-4 py-2.5 capitalize text-slate-600">{s.profession}</td>
                  <td className="px-4 py-2.5 hidden text-slate-500 sm:table-cell">{s.email}</td>
                  <td className="px-4 py-2.5 hidden text-slate-400 md:table-cell">{s.external_staff_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
