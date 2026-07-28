import { useEffect, useState } from 'react';
import { api, ImportRow, ImportRun } from '../lib/api';

const OUTCOME_STYLE: Record<string, string> = {
  accepted: 'bg-emerald-50 text-emerald-700',
  merged: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function ImportReport() {
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ImportRun | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'rejected' | 'merged' | 'accepted'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listImportRuns().then(({ runs }) => {
      setRuns(runs);
      if (runs.length) selectRun(runs[0]);
      else setLoading(false);
    });
  }, []);

  function selectRun(run: ImportRun) {
    setSelectedRun(run);
    setLoading(true);
    api.getImportRun(run.id).then(({ rows }) => setRows(rows)).finally(() => setLoading(false));
  }

  const visibleRows = filter === 'all' ? rows : rows.filter((r) => r.outcome === filter);
  const interesting = rows.filter((r) => r.outcome !== 'accepted' || r.reason);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Import report</h1>
      <p className="mb-6 text-sm text-slate-500">Every import run, with row-level detail on what was accepted, merged, or rejected.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => selectRun(run)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selectedRun?.id === run.id ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold text-slate-800">{run.source}</p>
              <p className="text-xs text-slate-500">{new Date(run.run_at + 'Z').toLocaleString()}</p>
              <div className="mt-1.5 flex gap-2 text-[11px]">
                <span className="text-emerald-600">{run.accepted_count} ok</span>
                <span className="text-amber-600">{run.merged_count} merged</span>
                <span className="text-red-600">{run.rejected_count} rejected</span>
              </div>
            </button>
          ))}
          {runs.length === 0 && <p className="text-sm text-slate-400">No import runs yet.</p>}
        </div>

        <div>
          {selectedRun && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  {(['all', 'rejected', 'merged', 'accepted'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f} {f !== 'all' && `(${rows.filter((r) => r.outcome === f).length})`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">{selectedRun.total_rows} total rows processed</p>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
              ) : (
                <div className="space-y-2">
                  {visibleRows.filter((r) => filter !== 'all' ? true : (r.outcome !== 'accepted' || r.reason)).map((row) => (
                    <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">row {row.row_number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${OUTCOME_STYLE[row.outcome]}`}>
                          {row.outcome}
                        </span>
                      </div>
                      <p className="mb-1 truncate font-mono text-[11px] text-slate-400">
                        {Object.entries(row.raw_row).map(([k, v]) => `${k}=${v}`).join('  ·  ')}
                      </p>
                      {row.reason && <p className="text-sm text-slate-700"><span className="font-medium">Issue:</span> {row.reason}</p>}
                      {row.action_taken && <p className="text-xs text-slate-500"><span className="font-medium">Action:</span> {row.action_taken}</p>}
                    </div>
                  ))}
                  {visibleRows.filter((r) => filter !== 'all' ? true : (r.outcome !== 'accepted' || r.reason)).length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-400">No rows to show for this filter.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
