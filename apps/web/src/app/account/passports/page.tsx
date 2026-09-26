import { PassportsView } from "@/components/account/PassportsView";
import { catalog, getColor } from "@/lib/catalog";
import { textureFor } from "@/lib/texture";

export default function Page() {
  const products = Object.fromEntries(catalog.products.map((p) => [p.slug, { garment: p.garment, texture: textureFor(p.materialSlug) }]));
  const colors = Object.fromEntries(catalog.colors.map((c) => [c.id, { name: c.name, hex: getColor(c.id).hex }]));
  return <PassportsView products={products} colors={colors} />;
}
