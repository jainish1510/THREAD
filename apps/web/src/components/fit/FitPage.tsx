"use client";

import Link from "next/link";
import { useState } from "react";
import type { Block } from "@/lib/types";
import { FitFinder } from "./FitFinder";

export function FitPage({ options, blocks }: { options: { slug: string; name: string; block: string }[]; blocks: Record<string, Block> }) {
  const [slug, setSlug] = useState(options[0]!.slug);
  const current = options.find((o) => o.slug === slug)!;
  const block = blocks[current.block]!;
  return (
    <div className="container-x grid gap-16 pt-12 md:pt-16 lg:grid-cols-[1fr_480px]">
      <div>
        <p className="t-meta text-muted">Personalised fit</p>
        <h1 className="t-h1 mt-4 max-w-md">Find your size.</h1>
        <p className="mt-6 max-w-md text-charcoal">
          We compare your measurements with each garment&apos;s measurements and the ease it was designed with — then tell you why.
        </p>
        <div className="mt-12 max-w-md border-t border-line pt-8">
          <p className="t-meta text-muted">Size chart · {current.name}</p>
          <table className="mt-4 w-full text-[13px] t-num">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2 font-normal">Size</th>
                {Object.keys(block.measurements[block.sizes[0]!]!).map((k) => (
                  <th key={k} scope="col" className="py-2 text-right font-normal capitalize">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.sizes.map((s) => (
                <tr key={s} className="border-b border-line">
                  <th scope="row" className="py-2 text-left font-medium">{s}</th>
                  {Object.values(block.measurements[s]!).map((v, i) => (
                    <td key={i} className="py-2 text-right">{v || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-muted">Garment measurements in cm, laid flat and doubled where relevant.</p>
        </div>
      </div>
      <div>
        <label className="block">
          <span className="field-label">Garment</span>
          <select className="field-input" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
          </select>
        </label>
        <div className="mt-8">
          <FitFinder key={slug} blockId={current.block} block={block} productName={current.name} />
        </div>
        <Link href={`/products/${slug}`} className="btn btn-ghost link-underline mt-8 text-[11px]">View {current.name}</Link>
      </div>
    </div>
  );
}
