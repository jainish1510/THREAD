import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { GarmentArt } from "@/components/garment/GarmentArt";
import { PassportBody } from "@/components/passport/PassportBody";
import { passportBase } from "@/components/passport/build";
import { SupplyChain } from "@/components/transparency/SupplyChain";
import { findVariantBySku, getColor } from "@/lib/catalog";
import { textureFor } from "@/lib/texture";

export async function generateMetadata({ params }: PageProps<"/passport/[sku]">): Promise<Metadata> {
  const found = findVariantBySku((await params).sku);
  return found ? { title: `Passport · ${found.product.name}`, robots: { index: false } } : {};
}

export default async function PassportPage({ params }: PageProps<"/passport/[sku]">) {
  const { sku } = await params;
  const found = findVariantBySku(sku);
  if (!found) notFound();
  const { product, variant } = found;
  const color = getColor(variant.color);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qr = await QRCode.toString(`${site}/passport/${sku}`, { type: "svg", margin: 0, color: { dark: "#1b1b19", light: "#00000000" } });
  const data = { ...passportBase(product), sku, colorName: color.name, size: variant.size };

  return (
    <div className="container-x pt-12 md:pt-16">
      <div className="mx-auto max-w-[1100px]">
        <p className="t-meta text-muted">THREAD Digital Passport</p>
        <div className="mt-6 grid gap-12 border-t border-ink pt-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="aspect-[4/5] bg-surface">
              <GarmentArt garment={product.garment} hex={color.hex} texture={textureFor(product.materialSlug)} className="h-full w-full" title={`${product.name} in ${color.name}`} />
            </div>
            <div className="mt-8 flex items-center gap-6">
              <div className="h-24 w-24 shrink-0" role="img" aria-label="QR code for this passport" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <p className="t-meta text-[10px] text-muted">SKU</p>
                <p className="mt-1 break-all font-mono text-[13px]">{sku}</p>
                <p className="mt-2 text-[12px] text-muted">This record travels with the garment — resale, repair and recycling included.</p>
              </div>
            </div>
          </div>
          <div>
            <h1 className="t-h1">{product.name}</h1>
            <p className="mt-2 text-muted">{color.name} / {variant.size}</p>
            <div className="-mx-6 mt-6">
              <PassportBody data={data} />
            </div>
            <Link href={`/products/${product.slug}?color=${variant.color}`} className="btn btn-secondary mt-6">View product</Link>
          </div>
        </div>
        <section className="mt-32" aria-labelledby="trace">
          <h2 id="trace" className="t-h2 border-b border-line pb-6">Trace</h2>
          <div className="mt-12">
            <SupplyChain stages={product.supplyChain} productName={product.name} />
          </div>
        </section>
      </div>
    </div>
  );
}
