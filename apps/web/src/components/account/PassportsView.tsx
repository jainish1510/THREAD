"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Garment } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { GarmentArt, type Texture } from "../garment/GarmentArt";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";
import { SectionTitle } from "./AccountShell";

interface Owned {
  sku: string;
  product_slug: string;
  product_name: string;
  color: string;
  size: string;
  batch: string;
  order_number: string;
  purchased_at: string;
  unit: number;
}

/** Every garment the customer has bought, each with its own passport. */
export function PassportsView({ products, colors }: { products: Record<string, { garment: Garment; texture: Texture }>; colors: Record<string, { name: string; hex: string }> }) {
  const q = useQuery({ queryKey: ["account", "garments"], queryFn: () => api<Owned[]>("/me/garments") });
  return (
    <section>
      <SectionTitle>Digital passports</SectionTitle>
      <p className="mt-4 max-w-lg text-[14px] text-muted">One passport for every garment you own — where it was made, what it&apos;s made of, and how to care for it.</p>
      {q.isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
      ) : q.error ? (
        <ErrorState title="We couldn't load your passports." onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState title="No garments yet." body="Passports appear here as soon as an order is confirmed." action={{ href: "/shop", label: "Explore collection" }} className="py-16" />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {q.data.map((g) => {
            const p = products[g.product_slug];
            const c = colors[g.color];
            return (
              <li key={`${g.order_number}-${g.sku}-${g.unit}`}>
                <Link href={`/passport/${g.sku}?order=${g.order_number}`} className="group block">
                  <div className="aspect-[4/5] bg-surface">
                    {p && <GarmentArt garment={p.garment} hex={c?.hex ?? "#999"} texture={p.texture} className="h-full w-full" title={g.product_name} />}
                  </div>
                  <p className="mt-3 text-[14px] font-medium group-hover:underline group-hover:underline-offset-4">{g.product_name}</p>
                  <p className="text-[12px] text-muted">{c?.name ?? g.color} / {g.size}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted">{g.batch} · {formatDate(g.purchased_at)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
