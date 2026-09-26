export type ColorId = string;

export interface Color {
  id: ColorId;
  name: string;
  code: string;
  hex: string;
}

export interface CostBreakdown {
  materials: number;
  labor: number;
  transport: number;
  operations: number;
  brand: number;
}

export interface Variant {
  sku: string;
  color: ColorId;
  size: string;
  inventory: number;
}

export type SupplyStageId = "material" | "mill" | "dyehouse" | "factory" | "warehouse" | "customer";

export interface SupplyStage {
  stage: SupplyStageId;
  label: string;
  name: string;
  place: string;
  country: string;
  lat: number | null;
  lng: number | null;
  ref?: string;
  facts: [string, string][];
}

export type Garment =
  | "tee"
  | "longsleeve"
  | "tank"
  | "shirt"
  | "campshirt"
  | "sweater"
  | "trouser"
  | "jean"
  | "jacket"
  | "parka"
  | "hoodie"
  | "sweatpant"
  | "short";

export type Fit = "slim" | "regular" | "relaxed";
export type Weather = "hot" | "mild" | "cold";

export interface Product {
  id: number;
  slug: string;
  styleCode: string;
  name: string;
  category: string;
  garment: Garment;
  price: number;
  costBreakdown: CostBreakdown;
  materialSlug: string;
  factorySlug: string;
  fit: Fit;
  fitLabel: string;
  block: string;
  colors: ColorId[];
  sizes: string[];
  weather: Weather[];
  collections: string[];
  tagline: string;
  description: string;
  details: string[];
  batch: string;
  manufactured: string;
  variants: Variant[];
  supplyChain: SupplyStage[];
}

export interface Material {
  slug: string;
  name: string;
  composition: { fibre: string; percent: number }[];
  origin: string;
  originRegion: string;
  lat: number;
  lng: number;
  certification: string;
  feel: string[];
  weight: string;
  durability: number;
  breathability: number;
  warmth: number;
  stretch: number;
  care: string;
  description: string;
}

export interface Factory {
  slug: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  founded: number;
  workers: number;
  lastAudit: string;
  auditor: string;
  auditScore: number;
  specialty: string;
  certifications: string[];
  story: string;
  process: { step: string; detail: string }[];
  wages: string;
  history: { year: number; event: string }[];
}

export interface Collection {
  slug: string;
  name: string;
  description: string;
  season: string;
}

export interface JournalEntry {
  slug: string;
  title: string;
  date: string;
  readingMinutes: number;
  excerpt: string;
  body: string[];
}

export type TopMeasure = { chest: number; length: number; shoulder: number; sleeve: number };
export type BottomMeasure = { waist: number; hip: number; inseam: number; rise: number };

export interface Block {
  sizes: string[];
  kind: "top" | "bottom";
  measurements: Record<string, TopMeasure | BottomMeasure>;
}

export interface Catalog {
  currency: string;
  freeShippingThreshold: number;
  flatShipping: number;
  colors: Color[];
  collections: Collection[];
  materials: Material[];
  factories: Factory[];
  warehouse: { id: string; name: string; city: string; country: string; lat: number; lng: number };
  blocks: Record<string, Block>;
  products: Product[];
  journal: JournalEntry[];
}

/** A slim projection of a product, safe to ship to the client in bulk. */
export interface ProductSummary {
  slug: string;
  name: string;
  category: string;
  garment: Garment;
  price: number;
  fit: Fit;
  colors: ColorId[];
  sizes: string[];
  weather: Weather[];
  collections: string[];
  materialName: string;
  materialFibres: string[];
  /** color -> total units across sizes */
  stockByColor: Record<ColorId, number>;
  /** "color:size" keys that are in stock */
  inStock: string[];
}
