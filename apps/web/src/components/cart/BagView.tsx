"use client";

import Link from "next/link";
import { useHydrated } from "@/hooks/useHydrated";
import { useCart } from "@/store/cart";
import { CartLines } from "./CartLines";
import { CartTotals, FreeShippingMeter } from "./CartSummary";
import { EmptyState, Skeleton } from "../ui/States";

export function BagView() {
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();

  return (
    <div className="container-x pt-12 md:pt-16">
      <h1 className="t-h1">Your bag</h1>
      {!hydrated ? (
        <div className="mt-12 space-y-6" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : lines.length === 0 ? (
        <EmptyState title="Your bag is empty." body="Nothing here yet." action={{ href: "/shop", label: "Explore collection" }} />
      ) : (
        <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_380px]">
          <div className="border-t border-line">
            <CartLines lines={lines} />
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-t border-ink pt-6">
              <FreeShippingMeter lines={lines} />
              <div className="mt-8">
                <CartTotals lines={lines} />
              </div>
              <Link href="/checkout" className="btn btn-primary btn-block mt-8">
                Checkout
              </Link>
              <p className="mt-4 text-center text-[12px] text-muted">Taxes included. Free 30-day returns.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
