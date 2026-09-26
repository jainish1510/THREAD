import type { Metadata } from "next";
import Link from "next/link";
import { GarmentArt } from "@/components/garment/GarmentArt";
import { Reveal } from "@/components/ui/Reveal";
import { getCollections, getColor, productsInCollection } from "@/lib/catalog";
import { textureFor } from "@/lib/texture";

export const metadata: Metadata = { title: "Collections" };

export default function CollectionsPage() {
  return (
    <div className="container-x pt-12 md:pt-16">
      <h1 className="t-h1">Collections</h1>
      <p className="mt-4 max-w-md text-muted">Small, considered edits. We add slowly and never discount.</p>
      <ul className="mt-16 space-y-24">
        {getCollections().map((c, i) => {
          const items = productsInCollection(c.slug).slice(0, 3);
          return (
            <Reveal as="li" key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="group grid gap-8 md:grid-cols-12 md:items-end">
                <div className={`grid grid-cols-3 gap-2 md:col-span-8 ${i % 2 ? "md:order-last" : ""}`}>
                  {items.map((p) => (
                    <div key={p.slug} className="aspect-[4/5] overflow-hidden bg-surface">
                      <GarmentArt garment={p.garment} hex={getColor(p.colors[0]!).hex} texture={textureFor(p.materialSlug)} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" title={p.name} />
                    </div>
                  ))}
                </div>
                <div className="md:col-span-4">
                  <p className="t-meta text-muted">{c.season}</p>
                  <h2 className="t-h2 mt-3">{c.name}</h2>
                  <p className="mt-3 text-muted">{c.description}</p>
                  <span className="btn btn-ghost link-underline mt-6 text-[11px]">Shop {productsInCollection(c.slug).length} pieces</span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}
