"use client";

import Link from "next/link";
import { useState } from "react";
import type { Garment } from "@/lib/types";
import type { Texture } from "../garment/GarmentArt";
import { GarmentArt } from "../garment/GarmentArt";
import { money } from "@/lib/format";

export interface CardColor {
  id: string;
  name: string;
  hex: string;
  stock: number;
}

export interface ProductCardData {
  slug: string;
  name: string;
  price: number;
  materialName: string;
  garment: Garment;
  texture: Texture;
  colors: CardColor[];
}

function availability(stock: number): { label: string; tone: "ok" | "low" | "out" } {
  if (stock === 0) return { label: "Sold out", tone: "out" };
  if (stock < 12) return { label: "Low stock", tone: "low" };
  return { label: "In stock", tone: "ok" };
}

export function ProductCard({ product, initialColor, priority = false }: { product: ProductCardData; initialColor?: string; priority?: boolean }) {
  const [colorId, setColorId] = useState(initialColor ?? product.colors[0]!.id);
  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0]!;
  const avail = availability(color.stock);
  const href = `/products/${product.slug}?color=${color.id}`;

  return (
    <article className="group">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-surface" aria-label={`${product.name}, ${color.name}, ${money(product.price)}`} prefetch={priority}>
        <GarmentArt garment={product.garment} hex={color.hex} texture={product.texture} className="absolute inset-0 h-full w-full transition-opacity duration-500 ease-out group-hover:opacity-0" title={`${product.name} in ${color.name}, front`} />
        <GarmentArt garment={product.garment} hex={color.hex} texture={product.texture} view="detail" className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" title={`${product.name} in ${color.name}, detail`} />
        {avail.tone !== "ok" && (
          <span className="t-meta absolute left-3 top-3 text-[10px] text-charcoal">{avail.label}</span>
        )}
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium leading-snug">
            <Link href={href}>{product.name}</Link>
          </h3>
          <p className="mt-0.5 text-[13px] text-muted">{product.materialName}</p>
        </div>
        <p className="t-num text-[15px]">{money(product.price)}</p>
      </div>
      <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label={`${product.name} colours`}>
        {product.colors.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === colorId}
            aria-label={c.name}
            title={c.name}
            onClick={() => setColorId(c.id)}
            onMouseEnter={() => setColorId(c.id)}
            className={`relative h-4 w-4 rounded-full border transition-[box-shadow] ${c.id === colorId ? "shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-ink)]" : "hover:shadow-[0_0_0_2px_var(--color-paper),0_0_0_3px_var(--color-line-strong)]"} ${c.stock === 0 ? "opacity-40" : ""}`}
            style={{ backgroundColor: c.hex, borderColor: "rgba(0,0,0,0.12)" }}
          />
        ))}
        <span className="ml-1 text-[12px] text-muted">{color.name}</span>
      </div>
    </article>
  );
}
