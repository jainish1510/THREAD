"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { EXAMPLE_QUERIES, interpret, parseQuery, search } from "@/lib/search";
import type { ProductSummary } from "@/lib/types";
import { ProductCard, type ProductCardData } from "../product/ProductCard";
import { Icon } from "../ui/Icon";
import { EmptyState } from "../ui/States";
import { InterpretedFilters } from "./InterpretedFilters";

export function SearchPage({ summaries, cards }: { summaries: ProductSummary[]; cards: ProductCardData[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const deferred = useDeferredValue(q);
  const parsed = useMemo(() => parseQuery(deferred), [deferred]);
  const results = useMemo(() => (deferred.trim() ? search(summaries, parsed) : []), [summaries, parsed, deferred]);

  // Keep the URL shareable without adding history entries per keystroke.
  useEffect(() => {
    const t = setTimeout(() => router.replace(deferred.trim() ? `/search?q=${encodeURIComponent(deferred.trim())}` : "/search", { scroll: false }), 300);
    return () => clearTimeout(t);
  }, [deferred, router]);

  return (
    <div className="container-x pt-12 md:pt-16">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex items-center gap-4 border-b border-ink pb-4">
        <Icon name="search" size={24} />
        <label htmlFor="q" className="sr-only">Search</label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe what you're looking for"
          className="min-w-0 flex-1 bg-transparent text-[24px] tracking-[-0.02em] outline-none placeholder:text-[#a8a399] md:text-[40px]"
          autoFocus
          autoComplete="off"
        />
      </form>
      <div className="mt-4">
        <InterpretedFilters chips={deferred.trim() ? interpret(parsed) : []} />
      </div>
      {!deferred.trim() ? (
        <div className="mt-12">
          <p className="t-meta text-muted">Try</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((e) => (
              <li key={e}>
                <button type="button" onClick={() => setQ(e)} className="rounded-full border border-line-strong px-4 py-2 text-[13px] hover:border-ink">{e}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : results.length === 0 ? (
        <EmptyState title="Nothing matches that yet." body="Try fewer words, a different colour, or a wider price." />
      ) : (
        <>
          <p className="t-meta mt-10 text-muted" aria-live="polite">{results.length} {results.length === 1 ? "piece" : "pieces"}</p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
            {results.map((r) => {
              const card = cards.find((c) => c.slug === r.product.slug)!;
              return (
                <li key={r.product.slug}>
                  <ProductCard product={card} initialColor={r.color} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
