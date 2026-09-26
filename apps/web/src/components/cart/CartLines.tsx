"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart, MAX_PER_LINE, type CartLine } from "@/store/cart";
import { money } from "@/lib/format";
import { textureFor } from "@/lib/texture";
import { GarmentArt } from "../garment/GarmentArt";
import { Icon } from "../ui/Icon";

export function CartLines({ lines, compact = false, onNavigate }: { lines: CartLine[]; compact?: boolean; onNavigate?: () => void }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  return (
    <ul className="divide-y divide-line">
      <AnimatePresence initial={false}>
        {lines.map((line) => (
          <motion.li
            key={line.sku}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-4 py-6"
          >
            <Link href={`/products/${line.slug}?color=${line.colorId}`} onClick={onNavigate} className={`shrink-0 bg-surface ${compact ? "w-24" : "w-28 md:w-36"}`}>
              <GarmentArt garment={line.garment} hex={line.hex} texture={textureFor(line.materialSlug)} className="aspect-[4/5] h-auto w-full" title={`${line.name}, ${line.colorName}`} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/products/${line.slug}?color=${line.colorId}`} onClick={onNavigate} className="text-[15px] font-medium">
                    {line.name}
                  </Link>
                  <p className="mt-1 text-[13px] text-muted">
                    {line.colorName} / {line.size}
                  </p>
                </div>
                <p className="t-num text-[15px]">{money(line.price * line.quantity)}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <div className="flex h-9 items-center border border-line-strong" role="group" aria-label={`Quantity for ${line.name}`}>
                  <button type="button" className="grid h-full w-9 place-items-center text-ink/70 hover:text-ink" onClick={() => setQuantity(line.sku, line.quantity - 1)} aria-label="Decrease quantity">
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="t-num w-8 text-center text-[13px]" aria-live="polite">{line.quantity}</span>
                  <button
                    type="button"
                    className="grid h-full w-9 place-items-center text-ink/70 hover:text-ink disabled:opacity-30"
                    onClick={() => setQuantity(line.sku, line.quantity + 1)}
                    disabled={line.quantity >= MAX_PER_LINE}
                    aria-label="Increase quantity"
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <button type="button" onClick={() => remove(line.sku)} className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
                  Remove
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
