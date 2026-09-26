"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import type { CostBreakdown } from "@/lib/types";
import { money } from "@/lib/format";

const ORDER: (keyof CostBreakdown)[] = ["materials", "labor", "transport", "operations", "brand"];
const LABEL: Record<keyof CostBreakdown, string> = {
  materials: "Materials",
  labor: "Labor",
  transport: "Transportation",
  operations: "Operations",
  brand: "Brand",
};
// Neutral ramp from ink to stone — hierarchy without colour noise.
const TONE: Record<keyof CostBreakdown, string> = {
  materials: "#1b1b19",
  labor: "#4a4843",
  transport: "#7a766e",
  operations: "#a8a296",
  brand: "#8c5b3f",
};

export function PriceBreakdown({
  price,
  cost,
  factoryName,
  factoryCity,
  heading = true,
}: {
  price: number;
  cost: CostBreakdown;
  factoryName: string;
  factoryCity: string;
  heading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [active, setActive] = useState<keyof CostBreakdown | null>(null);

  const explain: Record<keyof CostBreakdown, string> = {
    materials: "Fabric, thread, trims, labels and packaging.",
    labor: `Cutting, sewing and finishing at ${factoryName}.`,
    transport: `Freight from ${factoryCity} to our Nashville warehouse, plus duties.`,
    operations: "Warehousing, customer care, returns and payment fees.",
    brand: "What THREAD keeps — design, salaries, and a margin we're comfortable publishing.",
  };
  const show = inView || reduce;

  return (
    <div ref={ref}>
      {heading && <h2 className="t-h2">Why {money(price)}?</h2>}

      <div className={`${heading ? "mt-10" : ""} flex h-2 w-full overflow-hidden`} aria-hidden="true">
        {ORDER.map((k, i) => (
          <motion.div
            key={k}
            className="h-full origin-left"
            style={{ backgroundColor: TONE[k], width: `${(cost[k] / price) * 100}%` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: show ? 1 : 0, opacity: active && active !== k ? 0.25 : 1 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <table className="mt-8 w-full text-[15px]">
        <caption className="sr-only">Cost breakdown of the {money(price)} retail price</caption>
        <tbody>
          {ORDER.map((k, i) => (
            <tr
              key={k}
              className="group cursor-default border-b border-line"
              onMouseEnter={() => setActive(k)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(k)}
              onBlur={() => setActive(null)}
              tabIndex={0}
            >
              <th scope="row" className="py-4 text-left font-normal">
                <span className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0" style={{ backgroundColor: TONE[k] }} aria-hidden="true" />
                  {LABEL[k]}
                </span>
                <span className={`block overflow-hidden pl-5 text-[13px] text-muted transition-all duration-300 ${active === k ? "max-h-12 pt-1 opacity-100" : "max-h-0 opacity-0"}`}>
                  {explain[k]}
                </span>
              </th>
              <td className="w-16 py-4 text-right align-top text-[13px] text-muted t-num">{Math.round((cost[k] / price) * 100)}%</td>
              <td className="w-20 py-4 text-right align-top t-num">
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: show ? 1 : 0 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.08 }}>
                  {money(cost[k])}
                </motion.span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="t-meta pt-5 text-left text-[12px]">Retail</th>
            <td />
            <td className="pt-5 text-right text-[17px] font-medium t-num">{money(price)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-6 text-[12px] text-muted">Illustrative, simulated figures for a fictional brand. Not real-world costs.</p>
    </div>
  );
}
