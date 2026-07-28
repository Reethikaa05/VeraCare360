import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function ImportPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<'staff' | 'shifts'>('shifts');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ accepted: number; rejected: number; merged: number; total: number } | null>(null);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setError(null);
  }

  async function onUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { result } = await api.uploadImport(file, kind);
      setResult(result);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Import CSV</h1>
      <p className="mb-6 text-sm text-slate-500">
        Upload a staff or shifts CSV using the same cleaning &amp; validation rules as the initial seed import.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-2">
          {(['shifts', 'staff'] as const).map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setResult(null); setError(null); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                kind === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {k === 'shifts' ? 'Shifts CSV' : 'Staff CSV'}
            </button>
          ))}
        </div>

        <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-brand-400">
          <input type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          <span className="text-sm font-medium text-slate-600">
            {file ? file.name : 'Click to choose a CSV file'}
          </span>
          <span className="mt-1 text-xs text-slate-400">
            {kind === 'shifts' ? 'Expected columns: shift_id, date, start_time, end_time, requirements' : 'Expected columns: staff_id, full_name, role, email'}
          </span>
        </label>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <button
          disabled={!file || uploading}
          onClick={onUpload}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {uploading ? 'Importing…' : 'Run import'}
        </button>

        {result && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Import complete</p>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-emerald-50 py-2">
                <p className="font-bold text-emerald-700">{result.accepted}</p>
                <p className="text-xs text-emerald-600">Accepted</p>
              </div>
              <div className="rounded-lg bg-amber-50 py-2">
                <p className="font-bold text-amber-700">{result.merged}</p>
                <p className="text-xs text-amber-600">Merged</p>
              </div>
              <div className="rounded-lg bg-red-50 py-2">
                <p className="font-bold text-red-700">{result.rejected}</p>
                <p className="text-xs text-red-600">Rejected</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/import-report')}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              View full report →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
