"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { EXAMPLE_QUERIES, interpret, parseQuery, search } from "@/lib/search";
import type { ProductSummary } from "@/lib/types";
import { money } from "@/lib/format";
import { GarmentArt } from "../garment/GarmentArt";
import { Icon } from "../ui/Icon";
import { InterpretedFilters } from "../search/InterpretedFilters";

export function SearchOverlay({
  open,
  onOpenChange,
  products,
  hex,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: ProductSummary[];
  hex: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const parsed = useMemo(() => parseQuery(deferred), [deferred]);
  const chips = useMemo(() => (deferred.trim() ? interpret(parsed) : []), [parsed, deferred]);
  const results = useMemo(() => (deferred.trim() ? search(products, parsed) : []), [products, parsed, deferred]);

  const go = (q: string) => {
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-ink/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-x-0 top-0 z-50 max-h-dvh overflow-y-auto border-b border-line bg-paper"
                initial={{ y: -24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Dialog.Title className="sr-only">Search</Dialog.Title>
                <Dialog.Description className="sr-only">Describe what you are looking for in plain language.</Dialog.Description>
                <div className="container-x py-6 md:py-10">
                  <form
                    role="search"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (query.trim()) go(query.trim());
                    }}
                    className="flex items-center gap-4 border-b border-ink pb-4"
                  >
                    <Icon name="search" size={22} />
                    <label htmlFor="site-search" className="sr-only">Search THREAD</label>
                    <input
                      id="site-search"
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Describe it — “black shirt under $60 for hot weather”"
                      className="min-w-0 flex-1 bg-transparent text-[20px] tracking-[-0.01em] outline-none placeholder:text-[#a8a399] md:text-[28px]"
                      autoComplete="off"
                    />
                    <Dialog.Close className="grid h-10 w-10 place-items-center" aria-label="Close search">
                      <Icon name="close" />
                    </Dialog.Close>
                  </form>

                  <div className="mt-4">
                    <InterpretedFilters chips={chips} />
                  </div>

                  {!deferred.trim() ? (
                    <div className="mt-8">
                      <p className="t-meta text-muted">Try</p>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {EXAMPLE_QUERIES.map((q) => (
                          <li key={q}>
                            <button type="button" onClick={() => setQuery(q)} className="rounded-full border border-line-strong px-4 py-2 text-[13px] transition-colors hover:border-ink">
                              {q}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : results.length === 0 ? (
                    <p className="mt-10 text-muted">Nothing matches that yet. Try fewer words or a wider price.</p>
                  ) : (
                    <div className="mt-8">
                      <p className="t-meta text-muted" aria-live="polite">
                        {results.length} {results.length === 1 ? "piece" : "pieces"}
                      </p>
                      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                        {results.slice(0, 6).map(({ product, color }) => (
                          <li key={product.slug}>
                            <Link href={`/products/${product.slug}?color=${color}`} onClick={() => onOpenChange(false)} className="group block">
                              <div className="aspect-[4/5] overflow-hidden bg-surface">
                                <GarmentArt garment={product.garment} hex={hex[color] ?? "#888"} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" title={product.name} />
                              </div>
                              <p className="mt-3 text-[14px] font-medium">{product.name}</p>
                              <p className="text-[13px] text-muted">{product.materialName} · {money(product.price)}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {results.length > 6 && (
                        <button type="button" onClick={() => go(query)} className="btn btn-ghost mt-8 link-underline">
                          See all {results.length} results
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
