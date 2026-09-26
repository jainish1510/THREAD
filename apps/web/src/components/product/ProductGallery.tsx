"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import type { Garment } from "@/lib/types";
import { GarmentArt, type GarmentView, type Texture } from "../garment/GarmentArt";

const VIEWS: { view: GarmentView; label: string }[] = [
  { view: "front", label: "Front" },
  { view: "back", label: "Back" },
  { view: "detail", label: "Detail" },
  { view: "fabric", label: "Fabric" },
];

/**
 * Desktop: an editorial two-up grid. Mobile: a swipeable, snap-scrolling
 * carousel with position indicators. Images cross-fade on colour change.
 */
export function ProductGallery({ garment, hex, texture, name, colorName }: { garment: Garment; hex: string; texture: Texture; name: string; colorName: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const image = (v: GarmentView, label: string) => (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={`${hex}-${v}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
        <GarmentArt garment={garment} hex={hex} texture={texture} view={v} className="h-full w-full" title={`${name} in ${colorName} — ${label.toLowerCase()} view`} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div>
      {/* Mobile */}
      <div className="relative -mx-4 md:hidden">
        <div ref={scroller} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" aria-roledescription="carousel" aria-label={`${name} images`}>
          {VIEWS.map(({ view, label }, i) => (
            <div key={view} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface" aria-roledescription="slide" aria-label={`${i + 1} of ${VIEWS.length}: ${label}`}>
              {image(view, label)}
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5" aria-hidden="true">
          {VIEWS.map((v, i) => (
            <span key={v.view} className={`h-px transition-all duration-300 ${i === index ? "w-6 bg-ink" : "w-3 bg-ink/30"}`} />
          ))}
        </div>
      </div>

      {/* Tablet + desktop */}
      <div className="hidden grid-cols-2 gap-2 md:grid">
        {VIEWS.map(({ view, label }) => (
          <div key={view} className="relative aspect-[4/5] overflow-hidden bg-surface">
            {image(view, label)}
          </div>
        ))}
      </div>
    </div>
  );
}
