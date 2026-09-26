"use client";

import { motion } from "framer-motion";
import { cartTotals, FREE_SHIPPING_THRESHOLD, type CartLine } from "@/store/cart";
import { money } from "@/lib/format";

export function FreeShippingMeter({ lines }: { lines: CartLine[] }) {
  const { subtotal, remainingForFree } = cartTotals(lines);
  const pct = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);
  return (
    <div>
      <p className="text-[13px]" aria-live="polite">
        {remainingForFree > 0 ? (
          <>You&apos;re <span className="t-num font-medium">{money(remainingForFree)}</span> away from free shipping.</>
        ) : (
          <>Your order ships free.</>
        )}
      </p>
      <div className="mt-3 h-px w-full bg-line" aria-hidden="true">
        <motion.div className="h-px origin-left bg-ink" initial={false} animate={{ scaleX: pct }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

export function CartTotals({ lines, showTotal = true }: { lines: CartLine[]; showTotal?: boolean }) {
  const { subtotal, shipping, total } = cartTotals(lines);
  return (
    <dl className="space-y-2 text-[14px]">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="t-num">{money(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">Shipping</dt>
        <dd className="t-num">{shipping === 0 ? "Free" : money(shipping)}</dd>
      </div>
      {showTotal && (
        <div className="flex justify-between border-t border-line pt-4 text-[15px] font-medium">
          <dt className="t-meta self-center text-[12px]">Total</dt>
          <dd className="t-num">{money(total)}</dd>
        </div>
      )}
    </dl>
  );
}
