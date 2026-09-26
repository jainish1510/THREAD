import { CATEGORIES, catalog, getMaterials, toSummary } from "./catalog";
import { toCard } from "@/components/product/toCard";
import type { Product } from "./types";
import type { ShopItem } from "@/components/shop/ShopBrowser";

/** Everything the client-side shop browser needs, computed on the server. */
export function shopProps(products: Product[]) {
  const items: ShopItem[] = products.map((p) => ({ card: toCard(p), summary: toSummary(p) }));
  const usedColors = new Set(products.flatMap((p) => p.colors));
  const usedMaterials = new Set(products.map((p) => p.materialSlug));
  const usedCategories = new Set(products.map((p) => p.category));
  const sizes = ["XS", "S", "M", "L", "XL", "28", "30", "32", "34", "36"].filter((s) => products.some((p) => p.sizes.includes(s)));
  return {
    items,
    categories: CATEGORIES.filter((c) => usedCategories.has(c.id)),
    colors: catalog.colors.filter((c) => usedColors.has(c.id)).map(({ id, name, hex }) => ({ id, name, hex })),
    materials: getMaterials()
      .filter((m) => usedMaterials.has(m.slug))
      .map((m) => m.name),
    sizes,
  };
}
