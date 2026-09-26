"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { moneyCents } from "@/lib/format";
import { ErrorState, Skeleton } from "../ui/States";
import { AreaChart, BarChart, RankBars } from "./charts";
import type { FeedItem } from "./useAdmin";

interface OverviewData {
  kpis: {
    revenue_cents: number;
    revenue_delta: number | null;
    orders: number;
    orders_delta: number | null;
    conversion: number;
    conversion_delta: number | null;
    inventory_health: number;
    units_available: number;
    returns_rate: number;
    returns_delta: number | null;
    aov_cents: number;
  };
  series: { date: string; revenue_cents: number; orders: number; sessions: number }[];
  top_products: { slug: string; name: string; units: number; revenue_cents: number }[];
  categories: { category: string; revenue_cents: number }[];
  pipeline: Record<string, number>;
}

const RANGES = [7, 30, 90, 180];
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const compactMoney = (c: number) => (c >= 100_000_00 ? `$${(c / 100_000_00).toFixed(1)}m` : c >= 100_000 ? `$${Math.round(c / 100_000)}k` : moneyCents(c));

function Delta({ v, invert = false }: { v: number | null; invert?: boolean }) {
  if (v === null || !isFinite(v)) return <span className="text-muted">—</span>;
  const good = invert ? v < 0 : v > 0;
  return (
    <span className={good ? "text-ok" : "text-danger"}>
      <span aria-hidden="true">{v > 0 ? "▲" : "▼"}</span> {pct(Math.abs(v))}
      <span className="sr-only">{v > 0 ? " increase" : " decrease"} versus previous period</span>
    </span>
  );
}

export function Overview({ header, feed }: { header: (right?: ReactNode) => ReactNode; feed: FeedItem[] }) {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["admin", "overview", days], queryFn: () => api<OverviewData>(`/admin/overview?days=${days}`) });

  const range = (
    <div className="flex border border-line-strong text-[12px]" role="group" aria-label="Date range">
      {RANGES.map((d) => (
        <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={`px-3 py-1.5 transition-colors ${days === d ? "bg-ink text-paper" : "hover:bg-line/60"}`}>
          {d}d
        </button>
      ))}
    </div>
  );

  if (q.error) return <>{header(range)}<ErrorState title="We couldn't load analytics." onRetry={() => q.refetch()} /></>;
  const d = q.data;

  const kpis = d
    ? [
        { label: "Revenue", value: moneyCents(d.kpis.revenue_cents).replace(/\.00$/, ""), delta: <Delta v={d.kpis.revenue_delta} /> },
        { label: "Orders", value: d.kpis.orders.toLocaleString(), delta: <Delta v={d.kpis.orders_delta} /> },
        { label: "Conversion", value: pct(d.kpis.conversion), delta: <Delta v={d.kpis.conversion_delta} /> },
        { label: "Inventory", value: pct(d.kpis.inventory_health, 0), delta: <span className="text-muted">{d.kpis.units_available.toLocaleString()} units</span> },
        { label: "Returns", value: pct(d.kpis.returns_rate), delta: <Delta v={d.kpis.returns_delta} invert /> },
      ]
    : [];

  return (
    <>
      {header(range)}
      {/* Headline numbers as a single ruled row — not five cards. */}
      <dl className="grid grid-cols-2 border-y border-ink md:grid-cols-5">
        {(d ? kpis : Array.from({ length: 5 }, (_, i) => ({ label: String(i), value: "", delta: null }))).map((k, i) => (
          <div key={k.label} className={`py-5 pr-4 ${i > 0 ? "md:border-l md:border-line md:pl-5" : ""} ${i % 2 === 1 ? "border-l border-line pl-5 md:pl-5" : ""} ${i >= 2 ? "border-t border-line md:border-t-0" : ""}`}>
            {d ? (
              <>
                <dt className="t-meta text-[10px] text-muted">{k.label}</dt>
                <dd className="mt-2 text-[30px] font-medium leading-none tracking-[-0.03em] t-num">{k.value}</dd>
                <dd className="mt-2 text-[12px] t-num">{k.delta}</dd>
              </>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] text-muted">Last {days} days vs. the previous {days}. Includes simulated order history for the fictional brand.</p>

      <div className="mt-12 grid gap-12 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="rev">
            <div className="flex items-baseline justify-between">
              <h2 id="rev" className="t-meta">Revenue per day</h2>
              {d && <p className="text-[12px] text-muted">AOV {moneyCents(d.kpis.aov_cents)}</p>}
            </div>
            <div className="mt-4">
              {d ? <AreaChart data={d.series.map((s) => ({ date: s.date, value: s.revenue_cents }))} format={compactMoney} label={`Daily revenue, last ${days} days`} /> : <Skeleton className="h-60 w-full" />}
            </div>
          </section>
          <section aria-labelledby="ord">
            <h2 id="ord" className="t-meta">Orders per day</h2>
            <div className="mt-4">
              {d ? <BarChart data={d.series.map((s) => ({ date: s.date, value: s.orders }))} format={(v) => String(v)} label={`Daily orders, last ${days} days`} /> : <Skeleton className="h-36 w-full" />}
            </div>
          </section>
          <div className="grid gap-12 md:grid-cols-2">
            <section aria-labelledby="top">
              <h2 id="top" className="t-meta">Top products</h2>
              <div className="mt-6">{d ? <RankBars rows={d.top_products.map((p) => ({ label: p.name, value: p.revenue_cents }))} format={compactMoney} /> : <Skeleton className="h-48 w-full" />}</div>
            </section>
            <section aria-labelledby="cat">
              <h2 id="cat" className="t-meta">Revenue by category</h2>
              <div className="mt-6">{d ? <RankBars rows={d.categories.map((c) => ({ label: c.category, value: c.revenue_cents }))} format={compactMoney} /> : <Skeleton className="h-48 w-full" />}</div>
            </section>
          </div>
        </div>

        <aside className="space-y-12">
          <section aria-labelledby="pipe">
            <h2 id="pipe" className="t-meta">Fulfilment pipeline</h2>
            <dl className="mt-4 divide-y divide-line border-y border-line text-[13px]">
              {d
                ? ["pending_payment", "paid", "preparing", "shipped", "out_for_delivery"].map((s) => (
                    <div key={s} className="flex justify-between py-2.5">
                      <dt className="capitalize text-muted">{s.replaceAll("_", " ")}</dt>
                      <dd className="t-num">{(d.pipeline[s] ?? 0).toLocaleString()}</dd>
                    </div>
                  ))
                : <Skeleton className="h-40 w-full" />}
            </dl>
          </section>
          <section aria-labelledby="feed">
            <h2 id="feed" className="t-meta">Live activity</h2>
            {feed.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted">Waiting for orders and stock changes…</p>
            ) : (
              <ul className="mt-4 space-y-2 text-[12px]" aria-live="polite">
                {feed.map((f) => (
                  <li key={`${f.at}-${f.text}`} className="flex gap-3">
                    <span className="t-meta w-16 shrink-0 text-[9px] text-muted">{f.kind}</span>
                    <span className="font-mono">{f.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {d && (
        <details className="mt-12 text-[13px]">
          <summary className="cursor-pointer text-muted">View daily data as a table</summary>
          <table className="mt-4 w-full max-w-xl t-num">
            <thead><tr className="border-b border-line text-left text-muted"><th className="py-2 font-normal">Date</th><th className="py-2 text-right font-normal">Revenue</th><th className="py-2 text-right font-normal">Orders</th><th className="py-2 text-right font-normal">Sessions</th></tr></thead>
            <tbody>
              {d.series.map((s) => (
                <tr key={s.date} className="border-b border-line"><td className="py-1.5">{s.date}</td><td className="py-1.5 text-right">{moneyCents(s.revenue_cents)}</td><td className="py-1.5 text-right">{s.orders}</td><td className="py-1.5 text-right">{s.sessions.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
