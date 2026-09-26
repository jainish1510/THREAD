import { getFactory, getMaterial } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import type { PassportData } from "./types";

export function passportBase(p: Product): Omit<PassportData, "sku" | "colorName" | "size"> {
  const material = getMaterial(p.materialSlug)!;
  const factory = getFactory(p.factorySlug)!;
  return {
    product: p.name,
    batch: p.batch,
    material: material.name,
    composition: material.composition.map((c) => `${c.percent}% ${c.fibre}`).join(", "),
    factory: factory.name,
    factoryLocation: `${factory.city}, ${factory.country}`,
    manufactured: p.manufactured,
    certifications: [material.certification, ...factory.certifications.slice(0, 2)],
    care: material.care,
    checks: ["Fabric", "Stitching", "Color", "Dimensions"],
    traceability: 100,
  };
}
