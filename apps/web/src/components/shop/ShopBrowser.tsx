"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductSummary } from "@/lib/types";
import { ProductCard, type ProductCardData } from "../product/ProductCard";
import { Sheet } from "../ui/Sheet";
import { Icon } from "../ui/Icon";
import { EmptyState } from "../ui/States";

export interface ShopItem {
  card: ProductCardData;
  summary: ProductSummary;
}

type FilterKey = "size" | "color" | "material" | "price" | "fit" | "availability";

const PRICE_BANDS = [
  { id: "under-60", label: "Under $60", test: (p: number) => p < 60 },
  { id: "60-120", label: "$60 – $120", test: (p: number) => p >= 60 && p <= 120 },
  { id: "over-120", label: "Over $120", test: (p: number) => p > 120 },
];
const FITS = [
  { id: "slim", label: "Slim" },
  { id: "regular", label: "Regular" },
  { id: "relaxed", label: "Relaxed" },
];
const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
];

export function ShopBrowser({
  items,
  categories,
  colors,
  materials,
  sizes,
  title,
  lockedCategory,
}: {
  items: ShopItem[];
  categories: { id: string; label: string }[];
  colors: { id: string; name: string; hex: string }[];
  materials: string[];
  sizes: string[];
  title: string;
  lockedCategory?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState(false);

  const get = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const category = params.get("category") ?? "all";
  const selected: Record<FilterKey, string[]> = {
    size: get("size"),
    color: get("color"),
    material: get("material"),
    price: get("price"),
    fit: get("fit"),
    availability: get("availability"),
  };
  const sort = params.get("sort") ?? "featured";

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const toggle = (key: FilterKey, value: string) =>
    update((p) => {
      const cur = new Set(p.get(key)?.split(",").filter(Boolean));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      if (cur.size) p.set(key, [...cur].join(","));
      else p.delete(key);
    });
  const clearAll = () =>
    update((p) => {
      for (const k of ["size", "color", "material", "price", "fit", "availability"]) p.delete(k);
    });

  const filtered = useMemo(() => {
    const out = items.filter(({ summary: s }) => {
      if (category !== "all" && s.category !== category) return false;
      if (selected.size.length && !s.sizes.some((z) => selected.size.includes(z))) return false;
      if (selected.color.length && !s.colors.some((c) => selected.color.includes(c))) return false;
      if (selected.material.length && !selected.material.includes(s.materialName)) return false;
      if (selected.price.length && !PRICE_BANDS.filter((b) => selected.price.includes(b.id)).some((b) => b.test(s.price))) return false;
      if (selected.fit.length && !selected.fit.includes(s.fit)) return false;
      if (selected.availability.includes("in-stock")) {
        const sizeOk = (key: string) => !selected.size.length || selected.size.includes(key.split(":")[1]!);
        const colorOk = (key: string) => !selected.color.length || selected.color.includes(key.split(":")[0]!);
        if (!s.inStock.some((k) => sizeOk(k) && colorOk(k))) return false;
      }
      return true;
    });
    if (sort === "price-asc") out.sort((a, b) => a.summary.price - b.summary.price);
    if (sort === "price-desc") out.sort((a, b) => b.summary.price - a.summary.price);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, params]);

  const activeCount = Object.values(selected).reduce((n, v) => n + v.length, 0);
  const colorName = (id: string) => colors.find((c) => c.id === id)?.name ?? id;
  const activeChips: { key: FilterKey; value: string; label: string }[] = [
    ...selected.size.map((v) => ({ key: "size" as const, value: v, label: `Size ${v}` })),
    ...selected.color.map((v) => ({ key: "color" as const, value: v, label: colorName(v) })),
    ...selected.material.map((v) => ({ key: "material" as const, value: v, label: v })),
    ...selected.price.map((v) => ({ key: "price" as const, value: v, label: PRICE_BANDS.find((b) => b.id === v)?.label ?? v })),
    ...selected.fit.map((v) => ({ key: "fit" as const, value: v, label: `${v[0]!.toUpperCase()}${v.slice(1)} fit` })),
    ...selected.availability.map((v) => ({ key: "availability" as const, value: v, label: "In stock" })),
  ];

  return (
    <div className="container-x pt-12 md:pt-16">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="t-h1">{title}</h1>
          <p className="mt-3 text-[13px] text-muted t-num" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>

      {/* Category is the one filter always visible; everything else lives in the drawer. */}
      <div className="sticky top-16 z-30 -mx-4 mt-10 border-y border-line bg-paper/95 px-4 backdrop-blur md:-mx-8 md:px-8 xl:-mx-12 xl:px-12">
        <div className="flex h-14 items-center justify-between gap-6">
          {!lockedCategory ? (
            <nav aria-label="Categories" className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-6 overflow-x-auto px-1">
              {[{ id: "all", label: "All" }, ...categories].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => update((p) => (c.id === "all" ? p.delete("category") : p.set("category", c.id)))}
                  aria-pressed={category === c.id}
                  className={`link-reveal shrink-0 whitespace-nowrap text-[13px] transition-colors ${category === c.id ? "text-ink" : "text-muted hover:text-ink"}`}
                  aria-current={category === c.id ? "page" : undefined}
                >
                  {c.label}
                </button>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-6">
            <label className="hidden items-center gap-2 text-[13px] md:flex">
              <span className="text-muted">Sort</span>
              <select
                value={sort}
                onChange={(e) => update((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
                className="cursor-pointer bg-transparent pr-1 outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setDrawer(true)} className="flex items-center gap-2 text-[13px]" aria-haspopup="dialog">
              <Icon name="filter" size={18} />
              Filter{activeCount > 0 && <span className="t-num">({activeCount})</span>}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {activeChips.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="flex flex-wrap items-center gap-2 pt-6" aria-label="Active filters">
              {activeChips.map((c) => (
                <li key={`${c.key}-${c.value}`}>
                  <button type="button" onClick={() => toggle(c.key, c.value)} className="flex items-center gap-2 border border-line-strong px-3 py-1.5 text-[12px] hover:border-ink" aria-label={`Remove filter ${c.label}`}>
                    {c.label}
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearAll} className="ml-2 text-[12px] text-muted underline underline-offset-4 hover:text-ink">
                  Clear all
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing matches those filters." body="Try removing a filter or two." action={{ label: "Clear filters", onClick: clearAll }} />
      ) : (
        <motion.ul layout className="mt-10 grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map(({ card }, i) => (
              <motion.li key={card.slug} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <ProductCard product={card} initialColor={selected.color.find((c) => card.colors.some((cc) => cc.id === c))} priority={i < 4} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <Sheet
        open={drawer}
        onOpenChange={setDrawer}
        title="Filter"
        side="bottom"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={clearAll} className="btn btn-secondary flex-1" disabled={activeCount === 0}>
              Clear
            </button>
            <button type="button" onClick={() => setDrawer(false)} className="btn btn-primary flex-[2]">
              Show {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
            </button>
          </div>
        }
      >
        <div className="px-6">
          <label className="block border-b border-line py-6 md:hidden">
            <span className="t-meta block text-muted">Sort</span>
            <select
              value={sort}
              onChange={(e) => update((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
              className="field-input mt-3"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <FilterGroup legend="Size">
            <div className="grid grid-cols-5 gap-2">
              {sizes.map((s) => (
                <OptionBox key={s} checked={selected.size.includes(s)} onChange={() => toggle("size", s)} label={s} />
              ))}
            </div>
          </FilterGroup>
          <FilterGroup legend="Color">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {colors.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 text-[14px]">
                  <input type="checkbox" className="peer sr-only" checked={selected.color.includes(c.id)} onChange={() => toggle("color", c.id)} />
                  <span className="h-5 w-5 rounded-full border border-black/10 peer-checked:shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-ink)] peer-focus-visible:outline peer-focus-visible:outline-1" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                  {c.name}
                </label>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup legend="Material">
            {materials.map((m) => (
              <Check key={m} checked={selected.material.includes(m)} onChange={() => toggle("material", m)} label={m} />
            ))}
          </FilterGroup>
          <FilterGroup legend="Price">
            {PRICE_BANDS.map((b) => (
              <Check key={b.id} checked={selected.price.includes(b.id)} onChange={() => toggle("price", b.id)} label={b.label} />
            ))}
          </FilterGroup>
          <FilterGroup legend="Fit">
            {FITS.map((f) => (
              <Check key={f.id} checked={selected.fit.includes(f.id)} onChange={() => toggle("fit", f.id)} label={f.label} />
            ))}
          </FilterGroup>
          <FilterGroup legend="Availability" last>
            <Check checked={selected.availability.includes("in-stock")} onChange={() => toggle("availability", "in-stock")} label="In stock in my size and colour" />
          </FilterGroup>
        </div>
      </Sheet>
    </div>
  );
}

function FilterGroup({ legend, children, last = false }: { legend: string; children: React.ReactNode; last?: boolean }) {
  return (
    <fieldset className={`py-6 ${last ? "" : "border-b border-line"}`}>
      <legend className="t-meta float-left mb-4 w-full text-muted">{legend}</legend>
      <div className="clear-both space-y-3">{children}</div>
    </fieldset>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#1b1b19]" />
      {label}
    </label>
  );
}

function OptionBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className={`grid h-11 cursor-pointer place-items-center border text-[13px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 ${checked ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
