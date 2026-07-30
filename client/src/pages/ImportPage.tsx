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
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-rise">
      <div>
        <h1
          className="text-4xl font-normal text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          CSV Roster Importer
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Upload staff lists or shift schedules. The automated pipeline cleans, validates, and logs any corrections made.
        </p>
      </div>

      <div className="liquid-glass rounded-3xl p-8 shadow-2xl backdrop-blur-2xl border border-white/10">
        <div className="mb-6 flex gap-2">
          {(['shifts', 'staff'] as const).map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setResult(null); setError(null); }}
              className={`rounded-full px-5 py-2 text-xs font-semibold capitalize transition-all cursor-pointer ${
                kind === k
                  ? 'liquid-glass text-white border border-white/30'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              {k === 'shifts' ? 'Shifts Roster CSV' : 'Staff Directory CSV'}
            </button>
          ))}
        </div>

        <label className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/5 px-6 py-12 text-center transition-all hover:border-white/40 hover:bg-white/10">
          <input type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white font-mono text-xl mb-3 border border-white/15">
            📁
          </div>
          <span className="text-sm font-semibold text-white">
            {file ? file.name : 'Click to select CSV file'}
          </span>
          <span className="mt-1.5 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
            {kind === 'shifts'
              ? 'Expected headers: shift_id, date, start_time, end_time, requirements'
              : 'Expected headers: staff_id, full_name, role, email'}
          </span>
        </label>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/15 p-4 text-xs text-rose-200">
            {error}
          </div>
        )}

        <button
          disabled={!file || uploading}
          onClick={onUpload}
          className="liquid-glass w-full rounded-full py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {uploading ? 'Processing & Validating CSV…' : 'Run Import Pipeline'}
        </button>

        {result && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 animate-fade-rise">
            <p className="mb-3 text-xs font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Import Pipeline Complete
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 py-3">
                <p className="font-mono text-xl font-bold text-emerald-300">{result.accepted}</p>
                <p className="text-[10px] text-emerald-200">Accepted</p>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/15 py-3">
                <p className="font-mono text-xl font-bold text-amber-300">{result.merged}</p>
                <p className="text-[10px] text-amber-200">Merged</p>
              </div>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/15 py-3">
                <p className="font-mono text-xl font-bold text-rose-300">{result.rejected}</p>
                <p className="text-[10px] text-rose-200">Rejected</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/import-report')}
              className="liquid-glass mt-4 w-full rounded-full py-2.5 text-xs font-semibold text-white hover:scale-105 transition-transform"
            >
              View Detailed Audit Report →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
