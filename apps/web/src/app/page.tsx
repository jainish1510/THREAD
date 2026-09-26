import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { toCard } from "@/components/product/toCard";
import { PriceBreakdown } from "@/components/transparency/PriceBreakdown";
import { SupplyChain } from "@/components/transparency/SupplyChain";
import { getFactories, getFactory, getJournal, getProduct, getProducts } from "@/lib/catalog";
import { formatDate, money } from "@/lib/format";

const principles = [
  {
    n: "01",
    title: "Know what you're buying.",
    body: "Fibre, origin, weight and certification for every fabric we use. No vague claims.",
    href: "/materials",
    cta: "Materials",
  },
  {
    n: "02",
    title: "Know who made it.",
    body: "Every factory named, located and audited — with the date of its last visit.",
    href: "/factories",
    cta: "Factories",
  },
  {
    n: "03",
    title: "Know why it costs what it costs.",
    body: "Materials, labour, transport and our margin, published on every product page.",
    href: "/products/everyday-tee#why",
    cta: "See an example",
  },
];

export default function Home() {
  const featuredSlugs = ["everyday-tee", "camp-shirt", "merino-crew", "straight-jean"];
  const featured = featuredSlugs.map((s) => getProduct(s)!).map(toCard);
  const tee = getProduct("everyday-tee")!;
  const teeFactory = getFactory(tee.factorySlug)!;
  const factories = getFactories();
  const journal = getJournal();
  const products = getProducts();

  return (
    <>
      <Hero />

      {/* Philosophy */}
      <section aria-labelledby="philosophy" className="container-x py-24 md:py-32">
        <Reveal>
          <h2 id="philosophy" className="t-meta text-muted">
            The THREAD philosophy
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
          {principles.map((p, i) => (
            <Reveal as="li" key={p.n} delay={i * 0.08} className="border-t border-ink pt-6">
              <p className="t-num text-[13px] text-muted">{p.n}</p>
              <h3 className="t-h3 mt-8 max-w-[16ch] text-[26px] leading-[1.15] tracking-[-0.025em]">{p.title}</h3>
              <p className="mt-4 max-w-sm text-muted">{p.body}</p>
              <Link href={p.href} className="btn btn-ghost link-underline mt-8 text-[11px]">
                {p.cta}
              </Link>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Featured */}
      <section aria-labelledby="essentials" className="container-x">
        <div className="flex items-end justify-between border-b border-line pb-6">
          <Reveal>
            <h2 id="essentials" className="t-h2">
              Essentials
            </h2>
          </Reveal>
          <Link href="/collections/essentials" className="text-[13px] link-underline">
            Shop all
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={i * 0.06}>
              <ProductCard product={p} priority={i < 2} />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Radical transparency — price */}
      <section aria-labelledby="why" className="mt-32 border-y border-line bg-surface/60">
        <div className="container-x grid gap-16 py-24 md:py-32 lg:grid-cols-2 lg:gap-24">
          <Reveal className="lg:pt-2">
            <p className="t-meta text-muted">Radical transparency</p>
            <h2 id="why" className="t-h1 mt-6 max-w-[14ch]">
              Every price, <span className="t-serif italic">explained</span>.
            </h2>
            <p className="mt-6 max-w-md text-charcoal">
              We publish what goes into each piece — from the cotton to the container ship — and the margin we keep. The {tee.name} costs{" "}
              {money(tee.price)}. Here&apos;s why.
            </p>
            <Link href={`/products/${tee.slug}`} className="btn btn-secondary mt-10">
              View the {tee.name}
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <PriceBreakdown price={tee.price} cost={tee.costBreakdown} factoryName={teeFactory.name} factoryCity={teeFactory.city} heading={false} />
          </Reveal>
        </div>
      </section>

      {/* Supply chain */}
      <section aria-labelledby="chain" className="container-x py-24 md:py-32">
        <div className="max-w-2xl">
          <Reveal>
            <p className="t-meta text-muted">Traceability</p>
            <h2 id="chain" className="t-h1 mt-6">
              From field to front door.
            </h2>
            <p className="mt-6 max-w-lg text-charcoal">
              Follow the {tee.name} through every stage of its life before it reaches you. Select a stage to see who was involved and when they were last audited.
            </p>
          </Reveal>
        </div>
        <div className="mt-16">
          <SupplyChain stages={tee.supplyChain} productName={tee.name} />
        </div>
      </section>

      {/* Factories */}
      <section aria-labelledby="factories" className="container-x">
        <div className="flex items-end justify-between border-b border-ink pb-6">
          <h2 id="factories" className="t-h2">
            Our factories
          </h2>
          <Link href="/factories" className="text-[13px] link-underline">
            All profiles
          </Link>
        </div>
        <ul>
          {factories.map((f) => (
            <li key={f.slug} className="border-b border-line">
              <Link href={`/factories/${f.slug}`} className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-6 transition-colors md:grid-cols-[1.4fr_1fr_1fr_120px_32px] md:py-7">
                <span className="text-[17px] font-medium tracking-[-0.01em]">{f.name}</span>
                <span className="text-[13px] text-muted md:order-none md:text-[15px] md:text-ink">
                  {f.city}, {f.country}
                </span>
                <span className="hidden text-[15px] text-muted md:block">{f.specialty}</span>
                <span className="hidden text-right text-[13px] text-muted t-num md:block">{f.workers} people</span>
                <span className="hidden justify-self-end text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink md:block" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[12px] text-muted">
          {products.length} products · {factories.length} factories · 100% of tier-one suppliers published
        </p>
      </section>

      {/* Journal */}
      <section aria-labelledby="journal" className="container-x pt-32">
        <div className="flex items-end justify-between border-b border-line pb-6">
          <h2 id="journal" className="t-h2">
            Journal
          </h2>
          <Link href="/journal" className="text-[13px] link-underline">
            Read more
          </Link>
        </div>
        <ul className="mt-10 grid gap-12 md:grid-cols-3 md:gap-8">
          {journal.map((j, i) => (
            <Reveal as="li" key={j.slug} delay={i * 0.06}>
              <Link href={`/journal/${j.slug}`} className="group block">
                <p className="t-meta text-muted">
                  {formatDate(j.date)} · {j.readingMinutes} min
                </p>
                <h3 className="mt-4 text-[22px] font-medium leading-tight tracking-[-0.02em] group-hover:underline group-hover:underline-offset-4">{j.title}</h3>
                <p className="mt-3 text-muted">{j.excerpt}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>
    </>
  );
}
