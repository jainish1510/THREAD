"use client";

import { useState } from "react";
import type { SupplyStage } from "@/lib/types";
import { SupplyChain } from "./SupplyChain";

export function SupplyChainExplorer({ products }: { products: { slug: string; name: string; stages: SupplyStage[] }[] }) {
  const [slug, setSlug] = useState(products[0]!.slug);
  const current = products.find((p) => p.slug === slug)!;
  return (
    <div className="mt-12">
      <label className="flex max-w-sm flex-col">
        <span className="field-label">Product</span>
        <select className="field-input" value={slug} onChange={(e) => setSlug(e.target.value)}>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
      </label>
      <div className="mt-12">
        <SupplyChain key={slug} stages={current.stages} productName={current.name} />
      </div>
    </div>
  );
}
