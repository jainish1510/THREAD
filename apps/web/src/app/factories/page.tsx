import type { Metadata } from "next";
import Link from "next/link";
import { FactoriesMap } from "@/components/transparency/FactoriesMap";
import { FactoryIllustration } from "@/components/transparency/FactorySummary";
import { Reveal } from "@/components/ui/Reveal";
import { getColor, getFactories, productsByFactory } from "@/lib/catalog";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Factories", description: "Every factory that makes THREAD clothing — named, located and audited." };

export default function FactoriesPage() {
  const factories = getFactories();
  return (
    <div className="container-x pt-12 md:pt-16">
      <p className="t-meta text-muted">Know who made it</p>
      <h1 className="t-h1 mt-4">Factories</h1>
      <p className="mt-4 max-w-lg text-muted">
        {factories.length} partners in {new Set(factories.map((f) => f.country)).size} countries. We publish every one, with the date of its last independent audit.
      </p>
      <div className="mt-12 border border-line bg-[#f2efe8]">
        <FactoriesMap factories={factories.map((f) => ({ id: f.slug, lat: f.lat, lng: f.lng, label: f.city }))} />
      </div>
      <ul className="mt-20 grid gap-x-6 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
        {factories.map((f, i) => (
          <Reveal as="li" key={f.slug} delay={(i % 3) * 0.06}>
            <Link href={`/factories/${f.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#e3ddd1]">
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]">
                  <FactoryIllustration hex={getColor(productsByFactory(f.slug)[0]?.colors[0] ?? "black").hex} variant={i} />
                </div>
              </div>
              <p className="t-meta mt-5 text-muted">{f.city}, {f.country}</p>
              <h2 className="mt-2 text-[20px] font-medium tracking-[-0.015em]">{f.name}</h2>
              <p className="mt-1 text-[13px] text-muted">
                {f.specialty} · {f.workers} people · Audited {formatDate(f.lastAudit)}
              </p>
            </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
