const STYLES: Record<string, string> = {
  empty: 'bg-red-50 text-red-700 border-red-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  full: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const LABELS: Record<string, string> = {
  empty: 'Empty',
  partial: 'Partially staffed',
  full: 'Fully staffed',
};

export default function StatusBadge({ status }: { status: 'empty' | 'partial' | 'full' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'empty' ? 'bg-red-500' : status === 'partial' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {LABELS[status]}
    </span>
  );
}
