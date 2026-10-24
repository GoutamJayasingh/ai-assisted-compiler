// Small dependency-free SVG charts. Colours: fixed categorical order keyed by
// system id (colour follows the entity). Every chart has a legend, hover
// tooltips and a table alternative supplied by the caller.
import { useMemo, useRef, useState } from "react";

export const SERIES_COLOR: Record<string, string> = {
  P: "var(--series-1)",
  C: "var(--series-2)",
  D: "var(--series-3)",
  E: "var(--series-4)",
  F: "var(--series-5)",
  L: "var(--series-6)",
  G: "var(--series-7)",
};

export interface BarGroup {
  label: string; // metric name
  bars: { id: string; name: string; value: number | null; lo?: number | null; hi?: number | null }[];
}

/** Grouped horizontal bars for proportions (0..1) with 95% CI whiskers. */
export function GroupedBars({ groups, legend }: { groups: BarGroup[]; legend: { id: string; name: string }[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const barH = 12;
  const gap = 2;
  const left = 150;
  const width = 640;
  const plotW = width - left - 70;
  const groupH = (n: number) => n * (barH + gap) + 16;
  const height = groups.reduce((a, g) => a + groupH(g.bars.length), 0) + 26;
  let y = 6;
  return (
    <div className="chart-wrap">
      <div className="legend" style={{ marginBottom: 8 }}>
        {legend.map((l) => (
          <span key={l.id}><span className="sw" style={{ background: SERIES_COLOR[l.id] }} />{l.id} · {l.name}</span>
        ))}
      </div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grouped bar chart" onMouseLeave={() => setTip(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line className="grid-line" x1={left + t * plotW} x2={left + t * plotW} y1={0} y2={height - 20} />
            <text x={left + t * plotW} y={height - 6} textAnchor="middle">{t * 100}%</text>
          </g>
        ))}
        {groups.map((g) => {
          const gy = y;
          y += groupH(g.bars.length);
          return (
            <g key={g.label}>
              <text x={left - 10} y={gy + 10} textAnchor="end" style={{ fill: "var(--text)", fontWeight: 600 }}>{g.label}</text>
              {g.bars.map((b, i) => {
                const by = gy + 16 + i * (barH + gap) - 12;
                const w = b.value === null ? 0 : b.value * plotW;
                return (
                  <g
                    key={b.id}
                    onMouseMove={(e) => {
                      const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setTip({ x: e.clientX - r.left + 12, y: e.clientY - r.top + 12, text: `${b.id} ${b.name}: ${b.value === null ? "n/a" : (b.value * 100).toFixed(1) + "%"}${b.lo != null ? ` [${(b.lo * 100).toFixed(1)}, ${(b.hi! * 100).toFixed(1)}]` : ""}` });
                    }}
                  >
                    <rect x={left} y={by - 1} width={plotW} height={barH + 2} fill="transparent" />
                    <path d={`M${left},${by} h${Math.max(0, w - 4)} a4,4 0 0 1 4,4 v${barH - 8} a4,4 0 0 1 -4,4 h${-Math.max(0, w - 4)} z`} fill={SERIES_COLOR[b.id]} />
                    {b.lo != null && b.hi != null && (
                      <line x1={left + b.lo * plotW} x2={left + b.hi * plotW} y1={by + barH / 2} y2={by + barH / 2} stroke="var(--text)" strokeWidth={1} opacity={0.55} />
                    )}
                    <text x={left + w + 6} y={by + barH - 2} style={{ fill: "var(--text-muted)" }}>{b.id} {b.value === null ? "n/a" : `${(b.value * 100).toFixed(1)}%`}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {tip && <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
    </div>
  );
}

export interface Series {
  id: string;
  name: string;
  points: { x: number; y: number }[];
}

/** Line chart with a crosshair tooltip (used for risk-coverage curves). */
export function LineChart({ series, xLabel, yLabel, yMax }: { series: Series[]; xLabel: string; yLabel: string; yMax?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const W = 640, H = 300, L = 48, R = 16, T = 12, B = 40;
  const ymax = yMax ?? Math.max(0.1, ...series.flatMap((s) => s.points.map((p) => p.y))) * 1.05;
  const sx = (x: number) => L + x * (W - L - R);
  const sy = (y: number) => T + (1 - y / ymax) * (H - T - B);
  const ticksY = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((t) => t * ymax), [ymax]);
  const nearest = (s: Series, x: number) => s.points.reduce((a, p) => (Math.abs(p.x - x) < Math.abs(a.x - x) ? p : a), s.points[0]);
  return (
    <div className="chart-wrap">
      <div className="legend" style={{ marginBottom: 8 }}>
        {series.map((s) => (
          <span key={s.id}><span className="sw" style={{ background: SERIES_COLOR[s.id] }} />{s.id} · {s.name}</span>
        ))}
      </div>
      <svg
        ref={ref}
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${yLabel} versus ${xLabel}`}
        onMouseMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          setHx(Math.min(1, Math.max(0, (x - L) / (W - L - R))));
        }}
        onMouseLeave={() => setHx(null)}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} />
            <text x={L - 6} y={sy(t) + 4} textAnchor="end">{(t * 100).toFixed(0)}%</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={sx(t)} y={H - B + 16} textAnchor="middle">{t * 100}%</text>
        ))}
        <line className="axis" x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} />
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle">{xLabel}</text>
        <text x={12} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>{yLabel}</text>
        {series.map((s) => (
          <polyline key={s.id} fill="none" stroke={SERIES_COLOR[s.id]} strokeWidth={2} strokeLinejoin="round" points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} />
        ))}
        {hx !== null && <line x1={sx(hx)} x2={sx(hx)} y1={T} y2={H - B} stroke="var(--text-faint)" strokeDasharray="3 3" />}
        {hx !== null &&
          series.map((s) => {
            const p = nearest(s, hx);
            return <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={SERIES_COLOR[s.id]} stroke="var(--surface)" strokeWidth={2} />;
          })}
      </svg>
      {hx !== null && (
        <div className="chart-tip" style={{ left: `${(sx(hx) / W) * 100}%`, top: 24 }}>
          <div className="tiny muted">{xLabel} ≈ {(hx * 100).toFixed(0)}%</div>
          {series.map((s) => (
            <div key={s.id} className="row tiny"><span className="sw" style={{ background: SERIES_COLOR[s.id], width: 10, height: 3, display: "inline-block" }} />{s.id}: {(nearest(s, hx).y * 100).toFixed(1)}%</div>
          ))}
        </div>
      )}
    </div>
  );
}
