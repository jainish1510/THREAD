import { getColor, getMaterial } from "@/lib/catalog";
import { textureFor } from "@/lib/texture";
import type { Product } from "@/lib/types";
import type { ProductCardData } from "./ProductCard";

/** Server-side projection of a product into the small shape a card needs. */
export function toCard(p: Product): ProductCardData {
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    materialName: getMaterial(p.materialSlug)?.name ?? "",
    garment: p.garment,
    texture: textureFor(p.materialSlug),
    colors: p.colors.map((id) => {
      const c = getColor(id);
      return {
        id,
        name: c.name,
        hex: c.hex,
        stock: p.variants.filter((v) => v.color === id).reduce((n, v) => n + v.inventory, 0),
      };
    }),
  };
}
