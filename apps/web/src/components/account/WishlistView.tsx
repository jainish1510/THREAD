"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProductCard, type ProductCardData } from "../product/ProductCard";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";
import { SectionTitle } from "./AccountShell";

export function WishlistView({ cards }: { cards: ProductCardData[] }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["account", "wishlist"], queryFn: () => api<{ product_slug: string }[]>("/me/wishlist") });
  const remove = async (slug: string) => {
    qc.setQueryData<{ product_slug: string }[]>(["account", "wishlist"], (old = []) => old.filter((w) => w.product_slug !== slug));
    await api(`/me/wishlist/${slug}`, { method: "DELETE" }).catch(() => qc.invalidateQueries({ queryKey: ["account", "wishlist"] }));
  };
  const saved = (q.data ?? []).map((w) => cards.find((c) => c.slug === w.product_slug)).filter((c): c is ProductCardData => !!c);

  return (
    <section>
      <SectionTitle>Wishlist</SectionTitle>
      {q.isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
      ) : q.error ? (
        <ErrorState title="We couldn't load your wishlist." onRetry={() => q.refetch()} />
      ) : saved.length === 0 ? (
        <EmptyState title="Nothing saved yet." body="Tap the heart on any product to keep it here." action={{ href: "/shop", label: "Explore collection" }} className="py-16" />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
          {saved.map((c) => (
            <li key={c.slug}>
              <ProductCard product={c} />
              <button type="button" onClick={() => remove(c.slug)} className="mt-3 text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
                Remove<span className="sr-only"> {c.name} from wishlist</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
