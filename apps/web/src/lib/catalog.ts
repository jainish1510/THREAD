import raw from "@catalog/catalog.json";
import type {
  Catalog,
  Collection,
  Color,
  Factory,
  JournalEntry,
  Material,
  Product,
  ProductSummary,
} from "./types";

export const catalog = raw as unknown as Catalog;

const colorById = new Map<string, Color>(catalog.colors.map((c) => [c.id, c]));
const materialBySlug = new Map<string, Material>(catalog.materials.map((m) => [m.slug, m]));
const factoryBySlug = new Map<string, Factory>(catalog.factories.map((f) => [f.slug, f]));
const productBySlug = new Map<string, Product>(catalog.products.map((p) => [p.slug, p]));

export const CATEGORIES: { id: string; label: string }[] = [
  { id: "tees", label: "Tees & Tanks" },
  { id: "shirts", label: "Shirts" },
  { id: "knitwear", label: "Knitwear" },
  { id: "sweats", label: "Sweats" },
  { id: "trousers", label: "Trousers" },
  { id: "denim", label: "Denim" },
  { id: "shorts", label: "Shorts" },
  { id: "outerwear", label: "Outerwear" },
];

export function getColor(id: string): Color {
  return colorById.get(id) ?? { id, name: id, code: id.toUpperCase(), hex: "#999" };
}

export function getProducts(): Product[] {
  return catalog.products;
}

export function getProduct(slug: string): Product | undefined {
  return productBySlug.get(slug);
}

export function getMaterial(slug: string): Material | undefined {
  return materialBySlug.get(slug);
}

export function getMaterials(): Material[] {
  return catalog.materials;
}

export function getFactory(slug: string): Factory | undefined {
  return factoryBySlug.get(slug);
}

export function getFactories(): Factory[] {
  return catalog.factories;
}

export function getCollections(): Collection[] {
  return catalog.collections;
}

export function getCollection(slug: string): Collection | undefined {
  return catalog.collections.find((c) => c.slug === slug);
}

export function getJournal(): JournalEntry[] {
  return catalog.journal;
}

export function getJournalEntry(slug: string): JournalEntry | undefined {
  return catalog.journal.find((j) => j.slug === slug);
}

export function productsByFactory(slug: string): Product[] {
  return catalog.products.filter((p) => p.factorySlug === slug);
}

export function productsByMaterial(slug: string): Product[] {
  return catalog.products.filter((p) => p.materialSlug === slug);
}

export function productsInCollection(slug: string): Product[] {
  return catalog.products.filter((p) => p.collections.includes(slug));
}

export function findVariantBySku(sku: string): { product: Product; variant: Product["variants"][number] } | undefined {
  for (const product of catalog.products) {
    const variant = product.variants.find((v) => v.sku === sku);
    if (variant) return { product, variant };
  }
  return undefined;
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function toSummary(p: Product): ProductSummary {
  const material = getMaterial(p.materialSlug);
  const stockByColor: Record<string, number> = {};
  const inStock: string[] = [];
  for (const v of p.variants) {
    stockByColor[v.color] = (stockByColor[v.color] ?? 0) + v.inventory;
    if (v.inventory > 0) inStock.push(`${v.color}:${v.size}`);
  }
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    garment: p.garment,
    price: p.price,
    fit: p.fit,
    colors: p.colors,
    sizes: p.sizes,
    weather: p.weather,
    collections: p.collections,
    materialName: material?.name ?? "",
    materialFibres: material?.composition.map((c) => c.fibre) ?? [],
    stockByColor,
    inStock,
  };
}

export function getSummaries(): ProductSummary[] {
  return catalog.products.map(toSummary);
}
