"use client";

import { scaleBand, scaleLinear, scaleTime } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { useEffect, useMemo, useState } from "react";

const INK = "#1b1b19";
const GRID = "#e3ded4";
const MUTED = "#75726b";

export interface Point {
  date: string;
  value: number;
}

function useWidth() {
  const [width, setWidth] = useState(800);
  const [el, setRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { setRef, width };
}

function niceTicks(max: number, count = 4) {
  return scaleLinear().domain([0, max || 1]).nice(count).ticks(count);
}

/**
 * Single-series area chart with a crosshair tooltip. One y-axis, recessive
 * grid, 2px line, direct label on the latest value only.
 */
export function AreaChart({
  data,
  format,
  height = 240,
  label,
}: {
  data: Point[];
  format: (v: number) => string;
  height?: number;
  label: string;
}) {
  const { setRef, width } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 16, right: 56, bottom: 28, left: 8 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const { x, y, path, fill, ticks } = useMemo(() => {
    const dates = data.map((d) => new Date(d.date + "T00:00:00Z"));
    const max = Math.max(...data.map((d) => d.value), 1);
    const ticks = niceTicks(max);
    const x = scaleTime()
      .domain([dates[0] ?? new Date(), dates.at(-1) ?? new Date()])
      .range([0, iw]);
    const y = scaleLinear().domain([0, ticks.at(-1) ?? max]).range([ih, 0]);
    const pts = data.map((d, i) => [x(dates[i]!), y(d.value)] as [number, number]);
    const path = line().curve(curveMonotoneX)(pts) ?? "";
    const fill = area().curve(curveMonotoneX).y0(ih)(pts) ?? "";
    return { x, y, path, fill, ticks };
  }, [data, iw, ih]);

  if (!data.length) return <p className="py-16 text-center text-[13px] text-muted">No data for this period.</p>;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round((px / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const last = data.at(-1)!;
  const hx = hover !== null ? x(new Date(data[hover]!.date + "T00:00:00Z")) : null;
  const monthTicks = x.ticks(Math.min(6, Math.floor(iw / 110)));

  return (
    <div ref={setRef} className="relative">
      <svg width={width} height={height} role="img" aria-label={label}>
        <g transform={`translate(${m.left},${m.top})`}>
          {ticks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={0} x2={iw} stroke={GRID} />
              <text x={iw + 8} dy="0.32em" fontSize={11} fill={MUTED} className="t-num">
                {format(t)}
              </text>
            </g>
          ))}
          {monthTicks.map((t) => (
            <text key={t.toISOString()} x={x(t)} y={ih + 20} fontSize={11} fill={MUTED} textAnchor="middle">
              {t.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            </text>
          ))}
          <path d={fill} fill={INK} opacity={0.06} />
          <path d={path} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          {hover === null && (
            <circle cx={x(new Date(last.date + "T00:00:00Z"))} cy={y(last.value)} r={4} fill={INK} stroke="#f7f5f0" strokeWidth={2} />
          )}
          {hx !== null && hover !== null && (
            <g pointerEvents="none">
              <line x1={hx} x2={hx} y1={0} y2={ih} stroke={INK} strokeOpacity={0.3} />
              <circle cx={hx} cy={y(data[hover]!.value)} r={4.5} fill={INK} stroke="#f7f5f0" strokeWidth={2} />
            </g>
          )}
          <rect width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </g>
      </svg>
      {hover !== null && hx !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 border border-line bg-paper px-3 py-2 text-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          style={{ left: Math.min(Math.max(hx + m.left, 60), width - 60) }}
          role="status"
        >
          <p className="text-muted">{new Date(data[hover]!.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</p>
          <p className="t-num font-medium">{format(data[hover]!.value)}</p>
        </div>
      )}
    </div>
  );
}

/** Thin vertical bars for daily counts, 2px gaps, per-bar hover. */
export function BarChart({ data, height = 140, label, format }: { data: Point[]; height?: number; label: string; format: (v: number) => string }) {
  const { setRef, width } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 8, right: 56, bottom: 8, left: 8 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = niceTicks(max, 2);
  const x = scaleBand<number>().domain(data.map((_, i) => i)).range([0, iw]).paddingInner(0.25);
  const y = scaleLinear().domain([0, ticks.at(-1) ?? max]).range([ih, 0]);

  return (
    <div ref={setRef} className="relative">
      <svg width={width} height={height} role="img" aria-label={label}>
        <g transform={`translate(${m.left},${m.top})`}>
          {ticks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={0} x2={iw} stroke={GRID} />
              <text x={iw + 8} dy="0.32em" fontSize={11} fill={MUTED}>{format(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = ih - y(d.value);
            return (
              <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={x(i)} y={0} width={x.bandwidth()} height={ih} fill="transparent" />
                <rect x={x(i)} y={y(d.value)} width={x.bandwidth()} height={Math.max(0, h)} rx={Math.min(2, x.bandwidth() / 2)} fill={INK} opacity={hover === null || hover === i ? 0.85 : 0.3} />
              </g>
            );
          })}
        </g>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full border border-line bg-paper px-3 py-2 text-[12px]" style={{ left: (x(hover) ?? 0) + m.left + x.bandwidth() / 2 }} role="status">
          <p className="text-muted">{new Date(data[hover]!.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</p>
          <p className="t-num font-medium">{format(data[hover]!.value)}</p>
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars with values as text in ink, not series colour. */
export function RankBars({ rows, format }: { rows: { label: string; value: number; sub?: string }[]; format: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-4 text-[13px]" title={`${r.label}: ${format(r.value)}`}>
          <span className="truncate capitalize">{r.label}</span>
          <span className="h-2 bg-line/60">
            <span className="block h-2 rounded-r-[2px] bg-ink/85 transition-opacity group-hover:bg-ink" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="t-num w-20 text-right">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
