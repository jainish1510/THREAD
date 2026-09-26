import type { ProductSummary, Weather } from "./types";

/**
 * Natural-language search. Deterministic, instant and explainable: every
 * token either maps to a structured filter or falls through to free text.
 *
 *   "black shirt under $60 for hot weather"
 *     → color=black, category=shirts, price<60, weather=hot
 */

export interface ParsedQuery {
  colors: string[];
  categories: string[];
  materials: string[];
  fits: string[];
  weather: Weather | null;
  priceMin: number | null;
  priceMax: number | null;
  terms: string[];
}

export interface Interpretation {
  key: string;
  label: string;
  value: string;
}

const COLOR_WORDS: Record<string, string[]> = {
  black: ["black", "noir"],
  white: ["white"],
  ecru: ["ecru", "cream", "off-white", "offwhite", "natural"],
  heather: ["grey", "gray", "heather"],
  navy: ["navy", "dark blue"],
  stone: ["stone", "beige", "khaki"],
  sand: ["sand", "tan"],
  olive: ["olive", "green", "khaki green"],
  charcoal: ["charcoal", "dark grey", "dark gray"],
  camel: ["camel", "brown"],
  sky: ["pale blue", "light blue", "sky"],
  indigo: ["indigo", "raw", "rinse", "dark denim"],
  washed: ["washed", "light wash", "mid blue"],
  clay: ["clay", "rust", "terracotta"],
  forest: ["forest", "dark green"],
};

// "blue" is intentionally broad.
const BROAD_COLORS: Record<string, string[]> = {
  blue: ["navy", "sky", "indigo", "washed"],
  green: ["olive", "forest"],
  neutral: ["ecru", "stone", "sand", "white"],
};

const CATEGORY_WORDS: Record<string, string[]> = {
  tees: ["tee", "tees", "t-shirt", "t-shirts", "tshirt", "tshirts", "t shirt", "tank", "tanks", "vest"],
  shirts: ["shirt", "shirts", "button-down", "button down", "oxford", "camp shirt"],
  knitwear: ["sweater", "sweaters", "jumper", "jumpers", "knit", "knits", "knitwear", "crew", "crewneck"],
  sweats: ["hoodie", "hoodies", "sweatshirt", "sweatshirts", "sweatpant", "sweatpants", "joggers", "sweats", "loungewear"],
  trousers: ["trouser", "trousers", "pants", "pant", "chinos"],
  denim: ["jean", "jeans", "denim"],
  shorts: ["short", "shorts"],
  outerwear: ["jacket", "jackets", "coat", "coats", "parka", "outerwear", "layer"],
};

const GROUP_WORDS: Record<string, string[]> = {
  tops: ["tees", "shirts", "knitwear", "sweats"],
  top: ["tees", "shirts", "knitwear", "sweats"],
  bottoms: ["trousers", "denim", "shorts"],
};

const MATERIAL_WORDS: Record<string, string[]> = {
  linen: ["linen", "flax"],
  cotton: ["cotton", "organic cotton"],
  merino: ["merino", "wool"],
  cashmere: ["cashmere"],
  denim: [],
  nylon: ["nylon", "recycled"],
  fleece: ["fleece"],
};

const FIT_WORDS: Record<string, string[]> = {
  slim: ["slim", "fitted", "close", "tight"],
  regular: ["regular", "classic"],
  relaxed: ["relaxed", "loose", "oversized", "boxy", "baggy", "wide"],
};

const WEATHER_WORDS: Record<Weather, string[]> = {
  hot: ["hot", "summer", "heat", "warm weather", "hot weather", "humid", "beach", "breathable", "lightweight", "light"],
  mild: ["spring", "autumn", "fall", "transitional", "mild"],
  cold: ["cold", "winter", "warm", "freezing", "snow", "cosy", "cozy", "chilly"],
};

const STOP = new Set([
  "a", "an", "the", "for", "in", "on", "with", "and", "or", "of", "to", "me", "i", "want", "need", "looking",
  "something", "some", "weather", "days", "day", "that", "is", "are", "my", "under", "below", "less", "than",
  "over", "above", "more", "between", "around", "about", "cheap", "usd", "dollars", "dollar", "size", "fit",
]);

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove a phrase from the working string, returning whether it matched. */
function take(state: { text: string }, phrase: string): boolean {
  const re = new RegExp(`(^|\\s)${escape(phrase)}(?=\\s|$)`, "i");
  if (re.test(state.text)) {
    state.text = state.text.replace(re, " ");
    return true;
  }
  return false;
}

function byLongestPhrase<T extends string>(dict: Record<T, string[]>): [T, string][] {
  const pairs: [T, string][] = [];
  for (const key of Object.keys(dict) as T[]) for (const phrase of dict[key]) pairs.push([key, phrase]);
  return pairs.sort((a, b) => b[1].length - a[1].length);
}

const colorPairs = byLongestPhrase(COLOR_WORDS);
const categoryPairs = byLongestPhrase(CATEGORY_WORDS);
const materialPairs = byLongestPhrase(MATERIAL_WORDS);
const fitPairs = byLongestPhrase(FIT_WORDS);
const weatherPairs = byLongestPhrase(WEATHER_WORDS);

export function parseQuery(input: string): ParsedQuery {
  const state = { text: ` ${input.toLowerCase().replace(/[,!?]/g, " ").replace(/\s+/g, " ")} ` };
  const q: ParsedQuery = { colors: [], categories: [], materials: [], fits: [], weather: null, priceMin: null, priceMax: null, terms: [] };

  // Price: "under $60", "less than 60", "below 60", "$40-$80", "between 40 and 80", "over 100"
  const num = String.raw`\$?\s?(\d+(?:\.\d+)?)`;
  const range = new RegExp(String.raw`(?:between\s+)?${num}\s*(?:-|to|and)\s*${num}`, "i");
  const max = new RegExp(String.raw`(?:under|below|less than|cheaper than|max|up to|<)\s*${num}`, "i");
  const min = new RegExp(String.raw`(?:over|above|more than|at least|min|>)\s*${num}`, "i");
  let m = state.text.match(max);
  if (m) {
    q.priceMax = Number(m[1]);
    state.text = state.text.replace(m[0], " ");
  }
  m = state.text.match(min);
  if (m) {
    q.priceMin = Number(m[1]);
    state.text = state.text.replace(m[0], " ");
  }
  if (q.priceMax === null && q.priceMin === null) {
    m = state.text.match(range);
    if (m && (m[0].includes("$") || /between|to|and/.test(m[0]))) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      q.priceMin = Math.min(a, b);
      q.priceMax = Math.max(a, b);
      state.text = state.text.replace(m[0], " ");
    }
  }

  // Multi-word weather phrases first ("warm weather" must not read as "warm"),
  // then colours ("light blue" must not read as "light"), then single words.
  for (const [key, phrase] of weatherPairs) if (phrase.includes(" ") && take(state, phrase)) q.weather ??= key;
  for (const [key, phrase] of colorPairs) if (take(state, phrase) && !q.colors.includes(key)) q.colors.push(key);
  for (const [key, phrase] of weatherPairs) if (take(state, phrase)) q.weather ??= key;
  for (const [broad, list] of Object.entries(BROAD_COLORS)) {
    if (take(state, broad)) for (const c of list) if (!q.colors.includes(c)) q.colors.push(c);
  }
  for (const [key, phrase] of categoryPairs) if (take(state, phrase) && !q.categories.includes(key)) q.categories.push(key);
  for (const [group, list] of Object.entries(GROUP_WORDS)) {
    if (take(state, group)) for (const c of list) if (!q.categories.includes(c)) q.categories.push(c);
  }
  // "denim" as a word already maps to the denim category; don't double-count.
  for (const [key, phrase] of materialPairs) if (take(state, phrase) && !q.materials.includes(key)) q.materials.push(key);
  for (const [key, phrase] of fitPairs) if (take(state, phrase) && !q.fits.includes(key)) q.fits.push(key);

  q.terms = state.text
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9-]/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
  return q;
}

const COLOR_LABEL: Record<string, string> = {
  heather: "grey",
  sky: "pale blue",
  washed: "washed blue",
};

const CATEGORY_LABEL: Record<string, string> = {
  tees: "tee",
  shirts: "shirt",
  knitwear: "knitwear",
  sweats: "sweats",
  trousers: "trousers",
  denim: "denim",
  shorts: "shorts",
  outerwear: "outerwear",
};

/** Human-readable chips describing how the query was understood. */
export function interpret(q: ParsedQuery): Interpretation[] {
  const out: Interpretation[] = [];
  if (q.colors.length) out.push({ key: "color", label: "color", value: q.colors.map((c) => COLOR_LABEL[c] ?? c).join(" / ") });
  if (q.categories.length) out.push({ key: "category", label: "category", value: q.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(" / ") });
  if (q.materials.length) out.push({ key: "material", label: "material", value: q.materials.join(" / ") });
  if (q.fits.length) out.push({ key: "fit", label: "fit", value: q.fits.join(" / ") });
  if (q.priceMin !== null && q.priceMax !== null) out.push({ key: "price", label: "price", value: `$${q.priceMin}–$${q.priceMax}` });
  else if (q.priceMax !== null) out.push({ key: "price", label: "price", value: `< $${q.priceMax}` });
  else if (q.priceMin !== null) out.push({ key: "price", label: "price", value: `> $${q.priceMin}` });
  if (q.weather) out.push({ key: "weather", label: "weather", value: q.weather });
  if (q.terms.length) out.push({ key: "text", label: "text", value: `"${q.terms.join(" ")}"` });
  return out;
}

function materialMatches(p: ProductSummary, m: string): boolean {
  const hay = `${p.materialName} ${p.materialFibres.join(" ")}`.toLowerCase();
  if (m === "merino") return hay.includes("merino");
  if (m === "cotton") return hay.includes("cotton");
  return hay.includes(m);
}

export interface SearchResult {
  product: ProductSummary;
  score: number;
  /** Colour to show for this result — the first requested colour it comes in. */
  color: string;
}

/**
 * Hard filters for category, price and material; soft (ranked) matching for
 * colour, fit, weather and free text so a strict query still returns the
 * closest pieces rather than nothing.
 */
export function search(products: ProductSummary[], q: ParsedQuery): SearchResult[] {
  const results: SearchResult[] = [];
  for (const p of products) {
    if (q.categories.length && !q.categories.includes(p.category)) continue;
    if (q.priceMax !== null && p.price > q.priceMax) continue;
    if (q.priceMin !== null && p.price < q.priceMin) continue;
    if (q.materials.length && !q.materials.some((m) => materialMatches(p, m))) continue;
    if (q.colors.length && !p.colors.some((c) => q.colors.includes(c))) continue;

    let score = 1;
    const color = p.colors.find((c) => q.colors.includes(c)) ?? p.colors[0]!;
    if (q.colors.length) score += 3;
    if (q.fits.length && q.fits.includes(p.fit)) score += 2;
    if (q.weather) {
      if (p.weather[0] === q.weather) score += 3;
      else if (p.weather.includes(q.weather)) score += 1.5;
      else score -= 2;
    }
    if (q.terms.length) {
      const hay = `${p.name} ${p.materialName} ${p.category} ${p.collections.join(" ")}`.toLowerCase();
      const hits = q.terms.filter((t) => hay.includes(t)).length;
      if (hits === 0 && !q.categories.length && !q.colors.length && !q.materials.length) continue;
      score += hits * 2;
    }
    if ((p.stockByColor[color] ?? 0) === 0) score -= 1;
    results.push({ product: p, score, color });
  }
  return results.sort((a, b) => b.score - a.score || a.product.price - b.product.price);
}

export const EXAMPLE_QUERIES = [
  "black shirt under $60 for hot weather",
  "relaxed linen for summer",
  "warm knit for winter",
  "navy tops under $100",
  "jeans",
];
