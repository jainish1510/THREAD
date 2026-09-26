import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductView, type ProductViewData } from "@/components/product/ProductView";
import { ProductCard } from "@/components/product/ProductCard";
import { toCard } from "@/components/product/toCard";
import { PriceBreakdown } from "@/components/transparency/PriceBreakdown";
import { MaterialExplorer } from "@/components/transparency/MaterialExplorer";
import { FactorySummary } from "@/components/transparency/FactorySummary";
import { SupplyChain } from "@/components/transparency/SupplyChain";
import { Collapsible } from "@/components/ui/Collapsible";
import { Reveal } from "@/components/ui/Reveal";
import { passportBase } from "@/components/passport/build";
import { catalog, getColor, getFactory, getMaterial, getProduct, getProducts } from "@/lib/catalog";
import { textureFor } from "@/lib/texture";
import { money } from "@/lib/format";
import ProductLoading from "./loading";

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return { title: p.name, description: `${p.tagline} ${money(p.price)} — see exactly what it costs to make.` };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const material = getMaterial(product.materialSlug)!;
  const factory = getFactory(product.factorySlug)!;

  const data: ProductViewData = {
    slug: product.slug,
    name: product.name,
    price: product.price,
    garment: product.garment,
    texture: textureFor(product.materialSlug),
    materialSlug: product.materialSlug,
    materialName: material.name,
    madeIn: `${factory.city}, ${factory.country}`,
    fitLabel: product.fitLabel,
    tagline: product.tagline,
    colors: product.colors.map((id) => {
      const c = getColor(id);
      return { id, name: c.name, hex: c.hex };
    }),
    sizes: product.sizes,
    variants: product.variants,
    blockId: product.block,
    block: catalog.blocks[product.block]!,
    passport: passportBase(product),
  };

  const related = getProducts()
    .filter((p) => p.slug !== product.slug && (p.category === product.category || p.collections.some((c) => product.collections.includes(c))))
    .slice(0, 4)
    .map(toCard);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.styleCode,
    brand: { "@type": "Brand", name: "THREAD" },
    material: material.name,
    countryOfOrigin: factory.country,
    offers: { "@type": "Offer", priceCurrency: "USD", price: product.price, availability: "https://schema.org/InStock" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="container-x pt-6 text-[12px] text-muted">
        <ol className="flex gap-2">
          <li><a href="/shop" className="hover:text-ink">Shop</a></li>
          <li aria-hidden="true">/</li>
          <li><a href={`/shop?category=${product.category}`} className="capitalize hover:text-ink">{product.category}</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <Suspense fallback={<ProductLoading />}>
        <ProductView product={data} />
      </Suspense>

      {/* Details */}
      <section className="container-x mt-24 md:mt-32" aria-labelledby="details">
        <div className="grid gap-8 border-t border-ink pt-8 md:grid-cols-[1fr_2fr]">
          <h2 id="details" className="t-meta">Details</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <p className="text-[17px] leading-relaxed">{product.description}</p>
            <ul className="space-y-2 text-[14px] text-charcoal">
              {product.details.map((d) => (
                <li key={d} className="flex gap-3 border-b border-line pb-2">
                  <span className="text-muted">—</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Transparency — collapsible on mobile, open on desktop */}
      <div className="container-x mt-24 space-y-0 md:mt-32 md:space-y-32">
        <Collapsible id="why" title={`Why ${money(product.price)}?`} eyebrow="Pricing">
          <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
            <div className="hidden md:block">
              <p className="t-meta text-muted">Pricing</p>
              <h2 className="t-h2 mt-4">Why {money(product.price)}?</h2>
              <p className="mt-6 max-w-xs text-muted">What it costs us to make the {product.name}, and what we keep. Hover a line to see what it covers.</p>
            </div>
            <Reveal>
              <PriceBreakdown price={product.price} cost={product.costBreakdown} factoryName={factory.name} factoryCity={factory.city} heading={false} />
            </Reveal>
          </div>
        </Collapsible>

        <Collapsible id="who" title="Who made it?" eyebrow="Factory">
          <div className="mb-12 hidden md:block">
            <p className="t-meta text-muted">Factory</p>
            <h2 className="t-h2 mt-4">Who made it?</h2>
          </div>
          <FactorySummary factory={factory} hex={getColor(product.colors[0]!).hex} />
        </Collapsible>

        <Collapsible id="material" title="What is it made from?" eyebrow="Material">
          <div className="mb-12 hidden md:block">
            <p className="t-meta text-muted">Material</p>
            <h2 className="t-h2 mt-4">What is it made from?</h2>
          </div>
          <MaterialExplorer material={material} />
        </Collapsible>

        <Collapsible id="journey" title="Where has it been?" eyebrow="Supply chain">
          <div className="mb-12 hidden md:block">
            <p className="t-meta text-muted">Supply chain</p>
            <h2 className="t-h2 mt-4">Where has it been?</h2>
          </div>
          <SupplyChain stages={product.supplyChain} productName={product.name} />
        </Collapsible>
      </div>

      {related.length > 0 && (
        <section className="container-x mt-32" aria-labelledby="related">
          <h2 id="related" className="t-h2 border-b border-line pb-6">Pairs well with</h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.slug}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
