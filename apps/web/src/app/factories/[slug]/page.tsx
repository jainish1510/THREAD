import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { toCard } from "@/components/product/toCard";
import { FactoryIllustration } from "@/components/transparency/FactorySummary";
import { WorldMap } from "@/components/transparency/WorldMap";
import { Reveal } from "@/components/ui/Reveal";
import { catalog, getColor, getFactories, getFactory, productsByFactory } from "@/lib/catalog";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return getFactories().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/factories/[slug]">): Promise<Metadata> {
  const f = getFactory((await params).slug);
  return f ? { title: f.name, description: `${f.specialty} in ${f.city}, ${f.country}. ${f.workers} people. Last audited ${formatDate(f.lastAudit)}.` } : {};
}

export default async function FactoryPage({ params }: PageProps<"/factories/[slug]">) {
  const f = getFactory((await params).slug);
  if (!f) notFound();
  const products = productsByFactory(f.slug);
  const index = getFactories().findIndex((x) => x.slug === f.slug);
  const hex = getColor(products[0]?.colors[0] ?? "black").hex;
  const w = catalog.warehouse;

  return (
    <article>
      <div className="container-x pt-12 md:pt-16">
        <p className="t-meta text-muted">{f.city}, {f.country}</p>
        <h1 className="t-hero mt-4 max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)]">{f.name}</h1>
      </div>

      <div className="container-x mt-12">
        <div className="relative aspect-[16/9] overflow-hidden bg-[#e3ddd1] md:aspect-[21/9]">
          <FactoryIllustration hex={hex} variant={index} />
          <p className="t-meta absolute bottom-4 right-4 text-[10px] text-charcoal/70">Illustration</p>
        </div>
      </div>

      <div className="container-x mt-16 grid gap-16 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-[22px] leading-snug tracking-[-0.015em] md:text-[26px]">{f.story}</p>
          <p className="mt-8 text-muted">{f.wages}.</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-8 self-start border-t border-ink pt-8">
          {[
            ["Country", f.country],
            ["City", f.city],
            ["Founded", String(f.founded)],
            ["Workers", String(f.workers)],
            ["Specialty", f.specialty],
            ["Products for THREAD", String(products.length)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="t-meta text-[10px] text-muted">{k}</dt>
              <dd className="mt-1 text-[17px] t-num">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="container-x mt-32" aria-labelledby="process">
        <h2 id="process" className="t-h2 border-b border-line pb-6">Production process</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {f.process.map((s, i) => (
            <Reveal as="li" key={s.step} delay={i * 0.06}>
              <p className="t-num text-[13px] text-muted">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 text-[18px] font-medium">{s.step}</h3>
              <p className="mt-2 text-[14px] text-muted">{s.detail}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="container-x mt-32 grid gap-16 lg:grid-cols-2" aria-label="Audit and history">
        <div>
          <h2 className="t-h2 border-b border-line pb-6">Audit</h2>
          <div className="mt-10 flex items-end gap-6">
            <p className="text-[72px] font-medium leading-none tracking-[-0.04em] t-num">{f.auditScore}</p>
            <p className="pb-2 text-[13px] text-muted">/ 100<br />Last audit {formatDate(f.lastAudit)}</p>
          </div>
          <div className="mt-6 h-px w-full bg-line"><div className="h-px bg-ink" style={{ width: `${f.auditScore}%` }} /></div>
          <p className="mt-6 text-[14px] text-muted">{f.auditor}. Audits are unannounced and cover wages, hours, health and safety, and freedom of association.</p>
          <p className="t-meta mt-10 text-muted">Certifications</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {f.certifications.map((c) => (
              <li key={c} className="border border-line-strong px-3 py-1.5 text-[12px]">{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="t-h2 border-b border-line pb-6">History</h2>
          <ol className="mt-10">
            {f.history.map((h) => (
              <li key={h.year} className="grid grid-cols-[72px_1fr] gap-4 border-b border-line py-4 text-[15px]">
                <span className="t-num text-muted">{h.year}</span>
                <span>{h.event}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x mt-32" aria-labelledby="where">
        <h2 id="where" className="t-h2 border-b border-line pb-6">From {f.city} to you</h2>
        <div className="mt-10 border border-line bg-[#f2efe8]">
          <WorldMap
            points={[
              { id: "factory", lat: f.lat, lng: f.lng, label: f.city },
              { id: "warehouse", lat: w.lat, lng: w.lng, label: w.city },
            ]}
            label={`Route from ${f.city} to the THREAD warehouse in ${w.city}`}
          />
        </div>
      </section>

      {products.length > 0 && (
        <section className="container-x mt-32" aria-labelledby="made-here">
          <h2 id="made-here" className="t-h2 border-b border-line pb-6">Made here</h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.slug}><ProductCard product={toCard(p)} /></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
