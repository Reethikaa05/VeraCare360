import { useEffect, useState } from 'react';
import { api, ImportRow, ImportRun } from '../lib/api';

const OUTCOME_STYLE: Record<string, string> = {
  accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  merged: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
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

  return (
    <div className="space-y-6 animate-fade-rise">
      <div>
        <h1
          className="text-4xl font-normal text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Import Audit Log
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Row-by-row audit records explaining every accepted, merged, or rejected CSV record.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Runs Sidebar */}
        <div className="space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] block mb-1">
            Import History
          </span>
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => selectRun(run)}
              className={`w-full rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                selectedRun?.id === run.id
                  ? 'liquid-glass text-white border-white/40 shadow-lg'
                  : 'border-white/10 bg-white/5 text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/20'
              }`}
            >
              <p className="text-xs font-semibold text-white truncate">{run.source}</p>
              <p className="font-mono text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {new Date(run.run_at + 'Z').toLocaleString()}
              </p>
              <div className="mt-2.5 flex gap-2 font-mono text-[10px]">
                <span className="text-emerald-400">{run.accepted_count} ok</span>
                <span className="text-amber-400">{run.merged_count} merged</span>
                <span className="text-rose-400">{run.rejected_count} rejected</span>
              </div>
            </button>
          ))}
          {runs.length === 0 && <p className="text-xs text-white/40 italic">No import runs found.</p>}
        </div>

        {/* Audit Stream Details */}
        <div>
          {selectedRun && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex gap-2">
                  {(['all', 'rejected', 'merged', 'accepted'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-full px-3.5 py-1 text-xs font-medium capitalize transition-all cursor-pointer ${
                        filter === f
                          ? 'liquid-glass text-white border border-white/30'
                          : 'text-[hsl(var(--muted-foreground))] hover:text-white'
                      }`}
                    >
                      {f} {f !== 'all' && `(${rows.filter((r) => r.outcome === f).length})`}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  <strong className="text-white">{selectedRun.total_rows}</strong> total records processed
                </p>
              </div>

              {loading ? (
                <div className="py-24 text-center text-sm font-mono text-[hsl(var(--muted-foreground))]">
                  Loading audit logs...
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleRows
                    .filter((r) => (filter !== 'all' ? true : r.outcome !== 'accepted' || r.reason))
                    .map((row) => (
                      <div
                        key={row.id}
                        className="liquid-glass rounded-2xl border border-white/10 p-4 shadow-md backdrop-blur-md"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                            Row #{row.row_number}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono capitalize ${
                              OUTCOME_STYLE[row.outcome]
                            }`}
                          >
                            {row.outcome}
                          </span>
                        </div>
                        <p className="mb-2 truncate font-mono text-[10px] text-white/50 bg-black/30 p-2 rounded-xl">
                          {Object.entries(row.raw_row)
                            .map(([k, v]) => `${k}=${v}`)
                            .join('  ·  ')}
                        </p>
                        {row.reason && (
                          <p className="text-xs text-white">
                            <span className="font-mono text-rose-300 font-semibold">Issue:</span> {row.reason}
                          </p>
                        )}
                        {row.action_taken && (
                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                            <span className="font-mono text-amber-300 font-semibold">Action:</span> {row.action_taken}
                          </p>
                        )}
                      </div>
                    ))}

                  {visibleRows.filter((r) => (filter !== 'all' ? true : r.outcome !== 'accepted' || r.reason)).length === 0 && (
                    <div className="py-16 text-center text-xs font-mono text-white/40 italic">
                      No rows match the selected filter. All records processed cleanly.
                    </div>
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
