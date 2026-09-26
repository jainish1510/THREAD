"use client";

import Link from "next/link";
import { useCart } from "@/store/cart";
import { Sheet } from "../ui/Sheet";
import { CartLines } from "./CartLines";
import { CartTotals, FreeShippingMeter } from "./CartSummary";

export function CartDrawer() {
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const lines = useCart((s) => s.lines);
  const close = () => setOpen(false);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Your bag"
      footer={
        lines.length > 0 ? (
          <div className="space-y-6">
            <CartTotals lines={lines} />
            <Link href="/checkout" onClick={close} className="btn btn-primary btn-block">
              Checkout
            </Link>
            <Link href="/bag" onClick={close} className="block text-center text-[12px] text-muted underline-offset-4 hover:underline">
              View bag
            </Link>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="t-meta text-[13px]">Your bag is empty.</p>
          <p className="mt-4 text-muted">Nothing here yet.</p>
          <Link href="/shop" onClick={close} className="btn btn-primary mt-8">
            Explore collection
          </Link>
        </div>
      ) : (
        <div className="px-6">
          <div className="border-b border-line py-6">
            <FreeShippingMeter lines={lines} />
          </div>
          <CartLines lines={lines} compact onNavigate={close} />
        </div>
      )}
    </Sheet>
  );
}
