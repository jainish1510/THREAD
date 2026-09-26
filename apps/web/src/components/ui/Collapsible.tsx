"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * On mobile, transparency sections collapse into a tidy list. From md up
 * they are always open and the toggle disappears.
 */
export function Collapsible({ id, title, eyebrow, children }: { id: string; title: string; eyebrow: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    // Deep links (#why) open their section on mobile.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the URL hash, an external source
    if (window.location.hash === `#${id}`) setOpen(true);
    return () => mq.removeEventListener("change", update);
  }, [id]);

  const expanded = desktop || open;

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28 border-t border-line md:border-0">
      <h2 id={`${id}-heading`} className="md:sr-only">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          className="flex w-full items-center justify-between py-5 text-left md:pointer-events-none"
        >
          <span>
            <span className="t-meta block text-[10px] text-muted">{eyebrow}</span>
            <span className="mt-1 block text-[18px] font-medium tracking-[-0.01em]">{title}</span>
          </span>
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="md:hidden">
            <Icon name="plus" size={18} />
          </motion.span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`${id}-content`}
            initial={desktop ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-10 md:pb-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
