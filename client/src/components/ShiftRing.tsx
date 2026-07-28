// The signature visual for the marketing site: a 24-hour ring showing how
// three shift bands (night / day / evening) hand off across a single day,
// with small markers standing in for staff coverage. This directly mirrors
// what the product's coverage dashboard does, just distilled to one image.

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const BANDS = [
  { label: 'Night', from: 0, to: 120, color: '#3b4966' },     // 00:00–08:00
  { label: 'Day', from: 120, to: 240, color: '#2dd4bf' },     // 08:00–16:00
  { label: 'Evening', from: 240, to: 360, color: '#fb7185' }, // 16:00–24:00
];

// A handful of staff markers scattered across the bands (purely illustrative).
const MARKERS = [20, 55, 95, 150, 190, 215, 265, 300, 335];

export default function ShiftRing({ size = 360 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const tickR = size * 0.44;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="ring-sweep absolute inset-0 opacity-30"
        aria-hidden="true"
      >
        <circle cx={cx} cy={cy} r={size * 0.47} fill="none" stroke="url(#sweepGrad)" strokeWidth="1.5" strokeDasharray="1 14" strokeLinecap="round" />
        <defs>
          <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
      </svg>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* hour ticks */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = i * 15;
          const outer = polarToCartesian(cx, cy, tickR, angle);
          const inner = polarToCartesian(cx, cy, tickR - (i % 6 === 0 ? 10 : 5), angle);
          return (
            <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="#334155" strokeWidth={i % 6 === 0 ? 1.5 : 1} opacity={i % 6 === 0 ? 0.55 : 0.25} />
          );
        })}

        {/* shift bands */}
        {BANDS.map((b) => (
          <path key={b.label} d={describeArc(cx, cy, r, b.from, b.to)}
            fill="none" stroke={b.color} strokeWidth={14} strokeLinecap="butt" opacity={0.9} />
        ))}

        {/* staff markers */}
        {MARKERS.map((angle, i) => {
          const p = polarToCartesian(cx, cy, r, angle);
          const band = BANDS.find((b) => angle >= b.from && angle < b.to) ?? BANDS[0];
          return <circle key={i} cx={p.x} cy={p.y} r={4.5} fill="#0b1220" stroke={band.color} strokeWidth={2} />;
        })}

        {/* center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white" style={{ font: '600 15px Inter, sans-serif' }}>
          24h
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400" style={{ font: '500 10px "IBM Plex Mono", monospace', letterSpacing: '0.08em' }}>
          COVERAGE
        </text>
      </svg>

      {/* band legend */}
      <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 translate-y-full gap-4 pt-4 text-xs">
        {BANDS.map((b) => (
          <span key={b.label} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
