"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Interpretation } from "@/lib/search";

/** Shows how a natural-language query was understood — quietly, as data. */
export function InterpretedFilters({ chips }: { chips: Interpretation[] }) {
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
      {chips.length > 0 && <span className="t-meta text-muted">Understood as</span>}
      <AnimatePresence initial={false}>
        {chips.map((c) => (
          <motion.span
            key={`${c.key}-${c.value}`}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-baseline gap-1.5 font-mono text-[12px]"
          >
            <span className="text-muted">{c.label}</span>
            <span className="text-muted">=</span>
            <span className="text-ink">{c.value}</span>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
