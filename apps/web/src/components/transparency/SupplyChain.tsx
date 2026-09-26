"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState, type KeyboardEvent } from "react";
import type { SupplyStage } from "@/lib/types";
import { WorldMap, type MapPoint } from "./WorldMap";

function formatFact(v: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  return v;
}

/**
 * MATERIAL → MILL → DYE HOUSE → FACTORY → WAREHOUSE → CUSTOMER.
 * An accessible tab list on the left, a live map on the right.
 */
export function SupplyChain({ stages, productName }: { stages: SupplyStage[]; productName: string }) {
  const [active, setActive] = useState<SupplyStage["stage"]>("factory");
  const uid = useId();
  const current = stages.find((s) => s.stage === active) ?? stages[0]!;

  const points: MapPoint[] = stages
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({ id: s.stage, lat: s.lat!, lng: s.lng!, label: s.place }));

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = stages[(i + dir + stages.length) % stages.length]!;
    setActive(next.stage);
    document.getElementById(`${uid}-tab-${next.stage}`)?.focus();
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-16">
      <div>
        <div role="tablist" aria-orientation="vertical" aria-label={`${productName} supply chain`} className="relative">
          {stages.map((s, i) => {
            const selected = s.stage === active;
            return (
              <div key={s.stage}>
                <button
                  id={`${uid}-tab-${s.stage}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`${uid}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(s.stage)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`group flex w-full items-baseline justify-between py-2 text-left transition-colors ${selected ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  <span className="flex items-baseline gap-4">
                    <span className="t-num w-5 text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="t-meta text-[12px]">{s.label}</span>
                  </span>
                  <span className="text-[13px]">{s.place}</span>
                </button>
                {i < stages.length - 1 && (
                  <div className="ml-[7px] h-4 w-px bg-line-strong" aria-hidden="true">
                    {selected && <motion.div layoutId={`${uid}-flow`} className="h-full w-px bg-ink" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${current.stage}`} className="mt-10 border-t border-line pt-8">
          <AnimatePresence mode="wait">
            <motion.div key={current.stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
              <p className="t-meta text-muted">{current.country || "Everywhere"}</p>
              <p className="mt-6 t-meta text-[10px] text-muted">{current.label}</p>
              <p className="mt-1 text-[18px] font-medium tracking-[-0.01em]">{current.name}</p>
              <dl className="mt-6 space-y-4">
                {current.facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="t-meta text-[10px] text-muted">{k}</dt>
                    <dd className="mt-0.5 text-[15px]">{formatFact(v)}</dd>
                  </div>
                ))}
              </dl>
              {current.ref && (
                <Link href={`/factories/${current.ref}`} className="btn btn-ghost link-underline mt-8 text-[11px]">
                  Factory profile
                </Link>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative self-start border border-line bg-[#f2efe8]">
        <WorldMap
          points={points}
          activeId={active}
          onSelect={(id) => setActive(id as SupplyStage["stage"])}
          label={`Map of the ${productName} supply chain from ${stages[0]?.place} to ${stages.at(-2)?.place}`}
        />
        <p className="t-meta absolute bottom-4 left-4 text-[10px] text-muted">
          {points.length} locations · {new Set(points.map((p) => stages.find((s) => s.stage === p.id)?.country)).size} countries
        </p>
      </div>
    </div>
  );
}
