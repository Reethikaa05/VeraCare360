const STYLES: Record<string, string> = {
  empty: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  full: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const LABELS: Record<string, string> = {
  empty: 'Unstaffed',
  partial: 'Partial',
  full: 'Fully Staffed',
};

export default function StatusBadge({ status }: { status: 'empty' | 'partial' | 'full' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium backdrop-blur ${STYLES[status]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'empty'
            ? 'bg-rose-400 animate-pulse'
            : status === 'partial'
            ? 'bg-amber-400'
            : 'bg-emerald-400'
        }`}
      />
      {LABELS[status]}
    </span>
  );
}
