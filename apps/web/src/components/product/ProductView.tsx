"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Block, Garment, Variant } from "@/lib/types";
import type { Texture } from "../garment/GarmentArt";
import { money } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useLiveInventory } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ProductGallery } from "./ProductGallery";
import { Sheet } from "../ui/Sheet";
import { Icon } from "../ui/Icon";
import { FitFinder } from "../fit/FitFinder";
import { PassportDialog, type PassportData } from "../passport/PassportDialog";

export interface ProductViewData {
  slug: string;
  name: string;
  price: number;
  garment: Garment;
  texture: Texture;
  materialSlug: string;
  materialName: string;
  madeIn: string;
  fitLabel: string;
  tagline: string;
  colors: { id: string; name: string; hex: string }[];
  sizes: string[];
  variants: Variant[];
  blockId: string;
  block: Block;
  passport: Omit<PassportData, "sku" | "colorName" | "size">;
}

export function ProductView({ product }: { product: ProductViewData }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialColor = product.colors.find((c) => c.id === params.get("color"))?.id ?? product.colors[0]!.id;
  const [colorId, setColorId] = useState(initialColor);
  const [size, setSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [fitOpen, setFitOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);
  const { user } = useAuth();
  const qc = useQueryClient();

  const initialLevels = Object.fromEntries(product.variants.map((v) => [v.sku, v.inventory]));
  const { levels, status, changed } = useLiveInventory(product.slug, initialLevels);

  const color = product.colors.find((c) => c.id === colorId)!;
  const variantFor = (s: string) => product.variants.find((v) => v.color === colorId && v.size === s);
  const variant = size ? variantFor(size) : undefined;
  const available = variant ? (levels[variant.sku] ?? 0) : null;
  const soldOut = available === 0;

  // Keep ?color= in the URL so the view is shareable.
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (next.get("color") === colorId) return;
    next.set("color", colorId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorId]);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry!.isIntersecting && entry!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wishlist = useQuery({
    queryKey: ["account", "wishlist"],
    queryFn: () => api<{ product_slug: string }[]>("/me/wishlist"),
    enabled: !!user,
  });
  const saved = !!wishlist.data?.some((w) => w.product_slug === product.slug);
  const toggleWishlist = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    qc.setQueryData<{ product_slug: string }[]>(["account", "wishlist"], (old = []) =>
      saved ? old.filter((w) => w.product_slug !== product.slug) : [...old, { product_slug: product.slug }],
    );
    try {
      await api(`/me/wishlist/${product.slug}`, { method: saved ? "DELETE" : "PUT" });
    } finally {
      qc.invalidateQueries({ queryKey: ["account", "wishlist"] });
    }
  };

  const addToBag = () => {
    if (!size || !variant) {
      setSizeError(true);
      document.getElementById("size-picker")?.focus();
      return;
    }
    if (soldOut) return;
    add({
      sku: variant.sku,
      slug: product.slug,
      name: product.name,
      garment: product.garment,
      materialSlug: product.materialSlug,
      colorId: color.id,
      colorName: color.name,
      hex: color.hex,
      size,
      price: product.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const ctaLabel = !size ? "Add to bag" : soldOut ? "Sold out" : added ? "Added" : "Add to bag";
  const passportSku = variant?.sku ?? product.variants.find((v) => v.color === colorId)!.sku;

  return (
    <div className="container-x grid gap-10 pt-6 md:pt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)] lg:gap-16">
      <ProductGallery garment={product.garment} hex={color.hex} texture={product.texture} name={product.name} colorName={color.name} />

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-start justify-between gap-6">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.025em] md:text-[32px]">{product.name}</h1>
          <button
            type="button"
            onClick={toggleWishlist}
            className="mt-1 grid h-10 w-10 shrink-0 place-items-center text-ink/70 transition-colors hover:text-ink"
            aria-pressed={saved}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Icon name="heart" size={20} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="t-num mt-2 text-[20px]">{money(product.price)}</p>

        <dl className="mt-8 space-y-1 text-[14px]">
          <div className="flex gap-2">
            <dt className="sr-only">Material</dt>
            <dd>{product.materialName}</dd>
          </div>
          <div className="flex gap-2 text-muted">
            <dt className="sr-only">Made in</dt>
            <dd>Made in {product.madeIn}</dd>
          </div>
          <div className="flex gap-2 text-muted">
            <dt className="sr-only">Fit</dt>
            <dd>{product.fitLabel} fit</dd>
          </div>
        </dl>

        {/* Colour */}
        <fieldset className="mt-10">
          <legend className="t-meta flex gap-2">
            Color <span className="normal-case tracking-normal text-muted">{color.name}</span>
          </legend>
          <div className="mt-4 flex flex-wrap gap-3">
            {product.colors.map((c) => {
              const stock = product.variants.filter((v) => v.color === c.id).reduce((n, v) => n + (levels[v.sku] ?? 0), 0);
              return (
                <label key={c.id} className="cursor-pointer" title={c.name}>
                  <input type="radio" name="color" value={c.id} checked={c.id === colorId} onChange={() => setColorId(c.id)} className="peer sr-only" />
                  <span
                    className={`block h-8 w-8 rounded-full border border-black/10 transition-shadow peer-checked:shadow-[0_0_0_3px_var(--color-paper),0_0_0_4px_var(--color-ink)] peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 ${stock === 0 ? "opacity-40" : ""}`}
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="sr-only">
                    {c.name}
                    {stock === 0 ? ", sold out" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Size */}
        <fieldset className="mt-10" aria-describedby={sizeError ? "size-error" : "stock-status"}>
          <div className="flex items-baseline justify-between">
            <legend className="t-meta">Size</legend>
            <button type="button" onClick={() => setFitOpen(true)} className="flex items-center gap-1.5 text-[12px] underline-offset-4 hover:underline">
              <Icon name="ruler" size={15} /> Find your size
            </button>
          </div>
          <div id="size-picker" tabIndex={-1} className="mt-4 grid grid-cols-5 gap-2 outline-none">
            {product.sizes.map((s) => {
              const v = variantFor(s);
              const qty = v ? (levels[v.sku] ?? 0) : 0;
              const out = qty === 0;
              return (
                <label
                  key={s}
                  className={`relative grid h-12 cursor-pointer place-items-center border text-[14px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 ${
                    size === s ? "border-ink bg-ink text-paper" : out ? "border-line text-muted/60" : "border-line-strong hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={size === s}
                    onChange={() => {
                      setSize(s);
                      setSizeError(false);
                    }}
                    className="sr-only"
                  />
                  <span className={out && size !== s ? "line-through decoration-1" : ""}>{s}</span>
                  <span className="sr-only">{out ? ", sold out" : qty < 5 ? `, only ${qty} left` : ""}</span>
                  {!out && qty < 5 && size !== s && <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-accent" aria-hidden="true" />}
                </label>
              );
            })}
          </div>
          <div id="stock-status" className="mt-4 flex min-h-5 items-center gap-2 text-[13px]" aria-live="polite">
            {sizeError ? (
              <p id="size-error" className="text-danger">
                Please select a size.
              </p>
            ) : variant ? (
              <>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${available === 0 ? "bg-danger" : available! < 5 ? "bg-accent" : "bg-ok"} ${status === "live" ? "live-dot" : ""}`}
                  aria-hidden="true"
                />
                <AnimatePresence mode="wait">
                  <motion.span key={`${variant.sku}-${available}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="t-num">
                    {changed && changed.sku === variant.sku ? (
                      <>
                        <span className="text-muted">{changed.from} →</span> {changed.to} available
                      </>
                    ) : available === 0 ? (
                      "Sold out in this size"
                    ) : (
                      `${available} available`
                    )}
                  </motion.span>
                </AnimatePresence>
                <span className="text-muted">·</span>
                <span className="text-muted">{status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Snapshot"}</span>
              </>
            ) : (
              <span className="text-muted">Select a size to see live availability.</span>
            )}
          </div>
        </fieldset>

        <div ref={ctaRef} className="mt-8">
          <button type="button" onClick={addToBag} disabled={!!size && soldOut} className="btn btn-primary btn-block h-14" aria-describedby="stock-status">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={ctaLabel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="flex items-center gap-2">
                {added && <Icon name="check" size={16} />}
                {ctaLabel}
              </motion.span>
            </AnimatePresence>
          </button>
          <p className="mt-4 text-center text-[12px] text-muted">Free shipping over $100 · Free 30-day returns</p>
        </div>

        <p className="mt-10 border-t border-line pt-8 text-[15px] leading-relaxed text-charcoal">{product.tagline}</p>

        <button type="button" onClick={() => setPassportOpen(true)} className="group mt-8 flex w-full items-center justify-between border border-line-strong px-5 py-4 text-left transition-colors hover:border-ink">
          <span className="flex items-center gap-4">
            <Icon name="qr" size={22} />
            <span>
              <span className="t-meta block">Digital passport</span>
              <span className="block text-[12px] text-muted">Batch {product.passport.batch} · 100% traceable</span>
            </span>
          </span>
          <Icon name="arrow" size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>

      {/* Mobile sticky add-to-bag */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden"
          >
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{product.name}</p>
                <p className="text-[12px] text-muted">
                  {color.name}
                  {size ? ` / ${size}` : ""} · {money(product.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => (size ? addToBag() : ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }))}
                disabled={!!size && soldOut}
                className="btn btn-primary h-12 px-6"
              >
                {size ? ctaLabel : "Select size"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={fitOpen} onOpenChange={setFitOpen} title="Find your size" side="bottom">
        <div className="px-6 py-8">
          <p className="mb-8 text-[14px] text-muted">
            Tell us a little about you. We compare it with the {product.name}&apos;s measurements and how it&apos;s designed to fit.
          </p>
          <FitFinder
            blockId={product.blockId}
            block={product.block}
            productName={product.name}
            onSelectSize={(s) => {
              setSize(s);
              setSizeError(false);
              setFitOpen(false);
            }}
          />
        </div>
      </Sheet>

      <PassportDialog
        open={passportOpen}
        onOpenChange={setPassportOpen}
        data={{ ...product.passport, sku: passportSku, colorName: color.name, size: variant?.size ?? null }}
      />
    </div>
  );
}
