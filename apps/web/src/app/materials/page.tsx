import type { Metadata } from "next";
import Link from "next/link";
import { GarmentArt } from "@/components/garment/GarmentArt";
import { MaterialExplorer } from "@/components/transparency/MaterialExplorer";
import { Reveal } from "@/components/ui/Reveal";
import { getColor, getMaterials, productsByMaterial } from "@/lib/catalog";
import { textureFor } from "@/lib/texture";

export const metadata: Metadata = { title: "Materials", description: "Every fabric we use — fibre, origin, weight, certification and how it wears." };

export default function MaterialsPage() {
  const materials = getMaterials();
  return (
    <div className="container-x pt-12 md:pt-16">
      <p className="t-meta text-muted">Know what you&apos;re buying</p>
      <h1 className="t-h1 mt-4 max-w-2xl">Materials</h1>
      <p className="mt-4 max-w-lg text-muted">
        {materials.length} fabrics, each chosen for how long it lasts. Origin, certification and feel — no vague claims.
      </p>
      <nav aria-label="Materials" className="mt-12 border-y border-line py-4">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {materials.map((m) => (
            <li key={m.slug}><a href={`#${m.slug}`} className="link-reveal text-muted hover:text-ink">{m.name}</a></li>
          ))}
        </ul>
      </nav>
      <div className="mt-16 space-y-32">
        {materials.map((m) => {
          const used = productsByMaterial(m.slug);
          const first = used[0];
          return (
            <Reveal as="section" key={m.slug}>
              <div id={m.slug} className="scroll-mt-28">
                <div className="grid gap-10 border-t border-ink pt-8 md:grid-cols-[1fr_2fr]">
                  <div>
                    <h2 className="t-h3 text-[24px]">{m.name}</h2>
                    <p className="mt-2 text-[13px] text-muted">{m.originRegion}, {m.origin}</p>
                    {first && (
                      <div className="mt-8 aspect-square w-40 overflow-hidden bg-surface">
                        <GarmentArt garment={first.garment} hex={getColor(first.colors[0]!).hex} texture={textureFor(m.slug)} view="fabric" className="h-full w-full" title={`${m.name} fabric close-up`} />
                      </div>
                    )}
                    {used.length > 0 && (
                      <p className="mt-6 text-[13px]">
                        <span className="text-muted">Used in </span>
                        {used.map((p, i) => (
                          <span key={p.slug}>
                            <Link href={`/products/${p.slug}`} className="underline underline-offset-4">{p.name}</Link>
                            {i < used.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <MaterialExplorer material={m} compact />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
