"use client";

import type { CartLine } from "@/store/cart";
import { money, moneyCents } from "@/lib/format";
import { textureFor } from "@/lib/texture";
import { GarmentArt } from "../garment/GarmentArt";

export interface Totals {
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
}

export function OrderSummary({ lines, totals, pending }: { lines: CartLine[]; totals: Totals | null; pending?: boolean }) {
  return (
    <div>
      <h2 className="t-meta">Order summary</h2>
      <ul className="mt-6 space-y-5">
        {lines.map((l) => (
          <li key={l.sku} className="flex items-center gap-4">
            <div className="relative w-16 shrink-0 bg-surface">
              <GarmentArt garment={l.garment} hex={l.hex} texture={textureFor(l.materialSlug)} className="aspect-[4/5] h-auto w-full" title={l.name} />
              <span className="t-num absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] text-paper">{l.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium">{l.name}</p>
              <p className="text-[12px] text-muted">
                {l.colorName} / {l.size}
              </p>
            </div>
            <p className="t-num text-[14px]">{money(l.price * l.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className={`mt-8 space-y-2 border-t border-line pt-6 text-[14px] transition-opacity ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="t-num">{totals ? moneyCents(totals.subtotal_cents) : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd className="t-num">{totals ? (totals.shipping_cents === 0 ? "Free" : moneyCents(totals.shipping_cents)) : "—"}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-4 text-[16px] font-medium">
          <dt className="t-meta self-center text-[12px]">Total</dt>
          <dd className="t-num">{totals ? moneyCents(totals.total_cents) : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
