// Generates catalog.json — the single source of truth for THREAD's fictional
// catalog. Both the Next.js app and the FastAPI seed read the output.
// All costs, audits, headcounts and partners are simulated data for a fictional brand.
//
//   node packages/catalog/build.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Deterministic PRNG so every build produces identical inventory numbers.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260426);

const colors = {
  black: { id: "black", name: "Black", code: "BLK", hex: "#1d1d1b" },
  white: { id: "white", name: "White", code: "WHT", hex: "#f3f1ec" },
  ecru: { id: "ecru", name: "Ecru", code: "ECR", hex: "#e4dccb" },
  heather: { id: "heather", name: "Heather Grey", code: "HGR", hex: "#a7a6a1" },
  navy: { id: "navy", name: "Navy", code: "NVY", hex: "#252c3a" },
  stone: { id: "stone", name: "Stone", code: "STN", hex: "#c9bfae" },
  sand: { id: "sand", name: "Sand", code: "SND", hex: "#d8c7a8" },
  olive: { id: "olive", name: "Olive", code: "OLV", hex: "#5e5f47" },
  charcoal: { id: "charcoal", name: "Charcoal", code: "CHR", hex: "#3b3b3a" },
  camel: { id: "camel", name: "Camel", code: "CML", hex: "#a8835a" },
  sky: { id: "sky", name: "Pale Blue", code: "SKY", hex: "#b9c6d3" },
  indigo: { id: "indigo", name: "Rinse Indigo", code: "IND", hex: "#2b3548" },
  washed: { id: "washed", name: "Washed Blue", code: "WSB", hex: "#6f829a" },
  clay: { id: "clay", name: "Clay", code: "CLY", hex: "#9a6b53" },
  forest: { id: "forest", name: "Forest", code: "FOR", hex: "#2f3a30" },
};

const warehouse = {
  id: "nashville",
  name: "THREAD Fulfillment",
  city: "Nashville",
  country: "United States",
  lat: 36.16,
  lng: -86.78,
};

const factories = [
  {
    slug: "porto-manufacturing",
    name: "Porto Manufacturing Co.",
    city: "Porto",
    country: "Portugal",
    lat: 41.15,
    lng: -8.61,
    founded: 1987,
    workers: 240,
    lastAudit: "2026-03-12",
    auditor: "Independent social audit (SA8000 framework)",
    auditScore: 94,
    specialty: "T-shirts / Knitwear",
    certifications: ["SA8000", "GOTS", "OEKO-TEX Standard 100"],
    story:
      "A second-generation, family-run cut-and-sew workshop on the northern edge of Porto. Three floors: cutting, sewing, and finishing. The founder's daughter now runs production; many of the sewing team have been here for more than fifteen years.",
    process: [
      { step: "Cutting", detail: "Fabric is relaxed for 24 hours before being cut on an automated table to minimise waste." },
      { step: "Sewing", detail: "Teams of eight work in modular cells; each garment passes through 11 operations." },
      { step: "Finishing", detail: "Every piece is steamed, measured against spec, and hand-inspected." },
      { step: "Packing", detail: "Recycled paper sleeves. No single-use plastic polybags." },
    ],
    wages: "Average wage 34% above the regional minimum",
    history: [
      { year: 1987, event: "Founded as a four-person knitting workshop." },
      { year: 2004, event: "Moved to current three-floor facility." },
      { year: 2019, event: "Achieved GOTS certification." },
      { year: 2023, event: "Began producing for THREAD." },
      { year: 2025, event: "Installed 180 kW rooftop solar array." },
    ],
  },
  {
    slug: "ege-denim-works",
    name: "Ege Denim Works",
    city: "Izmir",
    country: "Turkey",
    lat: 38.42,
    lng: 27.14,
    founded: 1996,
    workers: 410,
    lastAudit: "2026-01-28",
    auditor: "Independent social audit (amfori BSCI framework)",
    auditScore: 91,
    specialty: "Denim / Trousers",
    certifications: ["GOTS", "OCS", "OEKO-TEX Standard 100"],
    story:
      "A vertically integrated denim and bottoms factory near the Aegean coast, a short drive from the cotton fields that supply it. Water from laundry is treated and 60% recirculated on site.",
    process: [
      { step: "Weaving", detail: "Rope-dyed yarn is woven on shuttle-less looms." },
      { step: "Cutting", detail: "Computer-nested markers reduce cutting waste to under 12%." },
      { step: "Sewing", detail: "Chain-stitched hems and bar-tacked stress points." },
      { step: "Laundry", detail: "Ozone and laser finishing replace most stone washing." },
    ],
    wages: "Average wage 28% above the regional minimum",
    history: [
      { year: 1996, event: "Founded as a trouser subcontractor." },
      { year: 2011, event: "Opened in-house laundry with closed-loop water system." },
      { year: 2021, event: "Achieved OCS certification." },
      { year: 2024, event: "Began producing for THREAD." },
    ],
  },
  {
    slug: "saigon-outerwear",
    name: "Saigon Outerwear Co.",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    lat: 10.82,
    lng: 106.63,
    founded: 2002,
    workers: 620,
    lastAudit: "2026-02-18",
    auditor: "Independent social audit (SA8000 framework)",
    auditScore: 89,
    specialty: "Outerwear",
    certifications: ["SA8000", "GRS", "bluesign® system partner"],
    story:
      "A technical outerwear specialist with seam-taping and down-filling lines. The factory runs an on-site clinic and a subsidised canteen for all workers.",
    process: [
      { step: "Cutting", detail: "Laser cutting for technical fabrics to seal edges cleanly." },
      { step: "Sewing", detail: "Specialist lines for canvas, quilting and taped seams." },
      { step: "Filling", detail: "Recycled insulation is weighed per panel for consistent warmth." },
      { step: "Inspection", detail: "Seam strength and zipper cycle testing on every batch." },
    ],
    wages: "Average wage 41% above the regional minimum",
    history: [
      { year: 2002, event: "Founded with 60 workers." },
      { year: 2014, event: "Added seam-taping line for technical outerwear." },
      { year: 2020, event: "Achieved GRS certification." },
      { year: 2024, event: "Began producing for THREAD." },
    ],
  },
  {
    slug: "lanificio-biella",
    name: "Lanificio Alta Biella",
    city: "Biella",
    country: "Italy",
    lat: 45.56,
    lng: 8.05,
    founded: 1952,
    workers: 130,
    lastAudit: "2026-04-02",
    auditor: "Independent social audit (SMETA framework)",
    auditScore: 97,
    specialty: "Merino / Cashmere knitwear",
    certifications: ["RWS", "OEKO-TEX Standard 100", "ISO 14001"],
    story:
      "A knitwear house in the foothills of the Alps, where the soft local water has been used to finish wool for centuries. Garments are fully-fashioned — knitted to shape — so there is almost no cutting waste.",
    process: [
      { step: "Knitting", detail: "Fully-fashioned panels knitted to shape on 12-gauge machines." },
      { step: "Linking", detail: "Panels are joined stitch by stitch by hand." },
      { step: "Washing", detail: "Washed in soft Alpine water to bloom the fibre." },
      { step: "Pressing", detail: "Hand-pressed and measured before packing." },
    ],
    wages: "Collective agreement wages (CCNL Tessile)",
    history: [
      { year: 1952, event: "Founded as a family spinning mill." },
      { year: 1978, event: "Began knitting finished garments." },
      { year: 2018, event: "Converted to 100% renewable electricity." },
      { year: 2023, event: "Began producing for THREAD." },
    ],
  },
  {
    slug: "kutch-shirting",
    name: "Kutch Shirting Co.",
    city: "Ahmedabad",
    country: "India",
    lat: 23.02,
    lng: 72.57,
    founded: 1991,
    workers: 350,
    lastAudit: "2026-03-20",
    auditor: "Independent social audit (SA8000 framework)",
    auditScore: 90,
    specialty: "Woven shirts",
    certifications: ["SA8000", "GOTS", "Fair Trade Certified™ factory"],
    story:
      "A shirting specialist in Gujarat's textile district. Collars and cuffs are still turned and pressed by hand; the factory funds a worker-run savings cooperative.",
    process: [
      { step: "Cutting", detail: "Stripes and checks are matched by hand at the cutting table." },
      { step: "Sewing", detail: "Single-needle stitching at 18 stitches per inch." },
      { step: "Collars", detail: "Collars turned and pressed by hand for a clean point." },
      { step: "Finishing", detail: "Mother-of-pearl-free, corozo nut buttons sewn with a shank." },
    ],
    wages: "Average wage 37% above the regional minimum",
    history: [
      { year: 1991, event: "Founded as a tailoring workshop." },
      { year: 2009, event: "Moved to purpose-built facility with daylight floors." },
      { year: 2022, event: "Achieved Fair Trade factory certification." },
      { year: 2024, event: "Began producing for THREAD." },
    ],
  },
  {
    slug: "vernon-cut-sew",
    name: "Vernon Cut & Sew",
    city: "Los Angeles",
    country: "United States",
    lat: 34.0,
    lng: -118.23,
    founded: 2009,
    workers: 85,
    lastAudit: "2026-02-05",
    auditor: "Independent social audit (WRAP framework)",
    auditScore: 92,
    specialty: "Fleece / Sweats",
    certifications: ["WRAP", "OEKO-TEX Standard 100"],
    story:
      "A small, highly skilled fleece and loungewear workshop in Los Angeles. Every sewer is paid hourly, never by the piece.",
    process: [
      { step: "Cutting", detail: "Fleece is cut in small lays to keep grain lines true." },
      { step: "Sewing", detail: "Flatlock seams for comfort against the skin." },
      { step: "Garment dye", detail: "Selected colours are garment dyed for depth." },
      { step: "Inspection", detail: "Every piece is measured and checked for pilling." },
    ],
    wages: "Hourly pay, 45% above the LA County minimum",
    history: [
      { year: 2009, event: "Founded by two former pattern makers." },
      { year: 2017, event: "Moved to a larger space in Vernon." },
      { year: 2024, event: "Began producing for THREAD." },
    ],
  },
];

const materials = [
  {
    slug: "organic-cotton-jersey",
    name: "Organic Cotton Jersey",
    composition: [
      { fibre: "Organic Cotton", percent: 98 },
      { fibre: "Elastane", percent: 2 },
    ],
    origin: "Turkey",
    originRegion: "Aegean region",
    lat: 38.7,
    lng: 27.9,
    certification: "OCS",
    feel: ["Soft", "Breathable", "Structured"],
    weight: "180 gsm",
    durability: 4,
    breathability: 5,
    warmth: 2,
    stretch: 2,
    care: "Machine wash cold. Line dry.",
    description:
      "Grown without synthetic pesticides and knitted tight so the fabric holds its shape wash after wash. A touch of elastane keeps the collar from sagging.",
  },
  {
    slug: "heavyweight-cotton",
    name: "Heavyweight Organic Cotton",
    composition: [{ fibre: "Organic Cotton", percent: 100 }],
    origin: "Turkey",
    originRegion: "Aegean region",
    lat: 38.7,
    lng: 27.9,
    certification: "GOTS",
    feel: ["Dense", "Dry", "Substantial"],
    weight: "260 gsm",
    durability: 5,
    breathability: 3,
    warmth: 3,
    stretch: 1,
    care: "Machine wash cold. Line dry.",
    description: "An open-end yarn knitted into a dense, dry-handed jersey with the drape of vintage workwear.",
  },
  {
    slug: "cotton-rib",
    name: "Organic Cotton Rib",
    composition: [
      { fibre: "Organic Cotton", percent: 95 },
      { fibre: "Elastane", percent: 5 },
    ],
    origin: "Turkey",
    originRegion: "Aegean region",
    lat: 38.7,
    lng: 27.9,
    certification: "GOTS",
    feel: ["Stretchy", "Close", "Soft"],
    weight: "210 gsm",
    durability: 4,
    breathability: 4,
    warmth: 2,
    stretch: 4,
    care: "Machine wash cold. Lay flat to dry.",
    description: "A 2x2 rib with memory, made to sit close to the body without clinging.",
  },
  {
    slug: "long-staple-poplin",
    name: "Long-Staple Cotton Oxford",
    composition: [{ fibre: "Organic Cotton", percent: 100 }],
    origin: "India",
    originRegion: "Madhya Pradesh",
    lat: 22.9,
    lng: 78.6,
    certification: "GOTS",
    feel: ["Crisp", "Smooth", "Softens with wear"],
    weight: "140 gsm",
    durability: 5,
    breathability: 4,
    warmth: 2,
    stretch: 1,
    care: "Machine wash warm. Hang to dry. Iron while damp.",
    description: "Long-staple fibres spun into a two-ply yarn and woven into a basketweave oxford that gets better with every wash.",
  },
  {
    slug: "european-linen",
    name: "European Flax Linen",
    composition: [{ fibre: "Linen", percent: 100 }],
    origin: "France",
    originRegion: "Normandy",
    lat: 49.4,
    lng: 0.8,
    certification: "OEKO-TEX Standard 100",
    feel: ["Airy", "Textured", "Cool"],
    weight: "150 gsm",
    durability: 4,
    breathability: 5,
    warmth: 1,
    stretch: 1,
    care: "Machine wash cold. Line dry. Embrace the creases.",
    description: "Flax grown on the Normandy coast with rainfall alone — no irrigation — then garment washed for a lived-in softness from day one.",
  },
  {
    slug: "extra-fine-merino",
    name: "Extra-Fine Merino",
    composition: [{ fibre: "Merino Wool", percent: 100 }],
    origin: "Australia",
    originRegion: "New South Wales",
    lat: -32.2,
    lng: 147.4,
    certification: "RWS",
    feel: ["Fine", "Warm", "Temperature-regulating"],
    weight: "12 gauge",
    durability: 4,
    breathability: 4,
    warmth: 4,
    stretch: 3,
    care: "Hand wash cold or dry clean. Lay flat to dry.",
    description: "18.5 micron merino from mulesing-free, RWS-certified farms. Naturally odour resistant and warm without bulk.",
  },
  {
    slug: "grade-a-cashmere",
    name: "Grade-A Cashmere",
    composition: [{ fibre: "Cashmere", percent: 100 }],
    origin: "Mongolia",
    originRegion: "Gobi-Altai",
    lat: 46.4,
    lng: 96.3,
    certification: "Good Cashmere Standard®",
    feel: ["Lofty", "Soft", "Very warm"],
    weight: "7 gauge",
    durability: 3,
    breathability: 4,
    warmth: 5,
    stretch: 3,
    care: "Hand wash cold. Lay flat to dry. Store folded.",
    description: "Long, fine fibres combed — not sheared — from herds managed under grazing plans that protect the grassland.",
  },
  {
    slug: "organic-denim",
    name: "Organic Selvedge-Look Denim",
    composition: [
      { fibre: "Organic Cotton", percent: 99 },
      { fibre: "Elastane", percent: 1 },
    ],
    origin: "Turkey",
    originRegion: "Aegean region",
    lat: 38.7,
    lng: 27.9,
    certification: "OCS",
    feel: ["Firm", "Breaks in", "Structured"],
    weight: "13 oz",
    durability: 5,
    breathability: 3,
    warmth: 3,
    stretch: 1,
    care: "Wash inside out, rarely. Line dry.",
    description: "A 13 oz rope-dyed denim that fades honestly. Just enough give for comfort without losing structure.",
  },
  {
    slug: "cotton-twill",
    name: "Brushed Cotton Twill",
    composition: [{ fibre: "Organic Cotton", percent: 100 }],
    origin: "Turkey",
    originRegion: "Aegean region",
    lat: 38.7,
    lng: 27.9,
    certification: "GOTS",
    feel: ["Smooth", "Soft", "Hard-wearing"],
    weight: "280 gsm",
    durability: 5,
    breathability: 3,
    warmth: 3,
    stretch: 1,
    care: "Machine wash cold. Tumble dry low.",
    description: "A tightly woven twill, lightly brushed on the inside for a broken-in hand.",
  },
  {
    slug: "cotton-canvas",
    name: "Organic Cotton Canvas",
    composition: [{ fibre: "Organic Cotton", percent: 100 }],
    origin: "India",
    originRegion: "Madhya Pradesh",
    lat: 22.9,
    lng: 78.6,
    certification: "GOTS",
    feel: ["Stiff at first", "Breaks in", "Rugged"],
    weight: "10 oz",
    durability: 5,
    breathability: 3,
    warmth: 3,
    stretch: 1,
    care: "Machine wash cold. Line dry.",
    description: "A tight plain-weave canvas that starts crisp and moulds to you over years of wear.",
  },
  {
    slug: "recycled-nylon",
    name: "Recycled Nylon Ripstop",
    composition: [{ fibre: "Recycled Nylon", percent: 100 }],
    origin: "Taiwan",
    originRegion: "Taoyuan",
    lat: 24.99,
    lng: 121.3,
    certification: "GRS",
    feel: ["Light", "Wind-resistant", "Quiet"],
    weight: "40 gsm shell",
    durability: 4,
    breathability: 2,
    warmth: 5,
    stretch: 1,
    care: "Machine wash cold, gentle. Tumble dry low with dryer balls.",
    description: "Regenerated from post-industrial nylon waste and treated with a PFC-free water-repellent finish.",
  },
  {
    slug: "loopback-fleece",
    name: "Organic Loopback Fleece",
    composition: [{ fibre: "Organic Cotton", percent: 100 }],
    origin: "United States",
    originRegion: "Texas High Plains",
    lat: 33.58,
    lng: -101.85,
    certification: "OCS",
    feel: ["Soft", "Dense", "Cosy"],
    weight: "380 gsm",
    durability: 5,
    breathability: 3,
    warmth: 4,
    stretch: 2,
    care: "Machine wash cold. Tumble dry low.",
    description: "Unbrushed loopback fleece that breathes better than brushed fleece and never pills.",
  },
];

// Mills and dye houses keyed by material slug.
const upstream = {
  "organic-cotton-jersey": {
    mill: { name: "Aegean Spinning & Knitting", city: "Denizli", country: "Turkey", lat: 37.78, lng: 29.09, founded: 1979, workers: 320, lastAudit: "2026-02-10", certifications: ["OCS", "GOTS"] },
    dye: { name: "Tintas do Ave", city: "Guimarães", country: "Portugal", lat: 41.44, lng: -8.29, founded: 1983, workers: 95, lastAudit: "2026-03-01", certifications: ["OEKO-TEX Standard 100", "ZDHC Level 2"] },
  },
  "heavyweight-cotton": {
    mill: { name: "Aegean Spinning & Knitting", city: "Denizli", country: "Turkey", lat: 37.78, lng: 29.09, founded: 1979, workers: 320, lastAudit: "2026-02-10", certifications: ["OCS", "GOTS"] },
    dye: { name: "Tintas do Ave", city: "Guimarães", country: "Portugal", lat: 41.44, lng: -8.29, founded: 1983, workers: 95, lastAudit: "2026-03-01", certifications: ["OEKO-TEX Standard 100", "ZDHC Level 2"] },
  },
  "cotton-rib": {
    mill: { name: "Aegean Spinning & Knitting", city: "Denizli", country: "Turkey", lat: 37.78, lng: 29.09, founded: 1979, workers: 320, lastAudit: "2026-02-10", certifications: ["OCS", "GOTS"] },
    dye: { name: "Tintas do Ave", city: "Guimarães", country: "Portugal", lat: 41.44, lng: -8.29, founded: 1983, workers: 95, lastAudit: "2026-03-01", certifications: ["OEKO-TEX Standard 100", "ZDHC Level 2"] },
  },
  "long-staple-poplin": {
    mill: { name: "Narmada Weaving Mills", city: "Indore", country: "India", lat: 22.72, lng: 75.86, founded: 1968, workers: 540, lastAudit: "2026-01-15", certifications: ["GOTS"] },
    dye: { name: "Sabarmati Process House", city: "Ahmedabad", country: "India", lat: 23.05, lng: 72.6, founded: 1988, workers: 150, lastAudit: "2026-02-22", certifications: ["GOTS", "ZDHC Level 2"] },
  },
  "european-linen": {
    mill: { name: "Filature de la Côte", city: "Lille", country: "France", lat: 50.63, lng: 3.06, founded: 1924, workers: 110, lastAudit: "2025-12-04", certifications: ["OEKO-TEX Standard 100"] },
    dye: { name: "Tintas do Ave", city: "Guimarães", country: "Portugal", lat: 41.44, lng: -8.29, founded: 1983, workers: 95, lastAudit: "2026-03-01", certifications: ["OEKO-TEX Standard 100", "ZDHC Level 2"] },
  },
  "extra-fine-merino": {
    mill: { name: "Filatura Cervo", city: "Biella", country: "Italy", lat: 45.6, lng: 8.1, founded: 1931, workers: 140, lastAudit: "2026-03-18", certifications: ["RWS", "ISO 14001"] },
    dye: { name: "Tintoria Sessera", city: "Biella", country: "Italy", lat: 45.62, lng: 8.18, founded: 1960, workers: 60, lastAudit: "2026-03-18", certifications: ["ZDHC Level 3"] },
  },
  "grade-a-cashmere": {
    mill: { name: "Filatura Cervo", city: "Biella", country: "Italy", lat: 45.6, lng: 8.1, founded: 1931, workers: 140, lastAudit: "2026-03-18", certifications: ["Good Cashmere Standard®"] },
    dye: { name: "Tintoria Sessera", city: "Biella", country: "Italy", lat: 45.62, lng: 8.18, founded: 1960, workers: 60, lastAudit: "2026-03-18", certifications: ["ZDHC Level 3"] },
  },
  "organic-denim": {
    mill: { name: "Ege Denim Works — Weaving", city: "Izmir", country: "Turkey", lat: 38.46, lng: 27.2, founded: 1996, workers: 410, lastAudit: "2026-01-28", certifications: ["OCS"] },
    dye: { name: "Ege Denim Works — Rope Dye", city: "Izmir", country: "Turkey", lat: 38.46, lng: 27.2, founded: 1996, workers: 410, lastAudit: "2026-01-28", certifications: ["ZDHC Level 2"] },
  },
  "cotton-twill": {
    mill: { name: "Aegean Spinning & Knitting", city: "Denizli", country: "Turkey", lat: 37.78, lng: 29.09, founded: 1979, workers: 320, lastAudit: "2026-02-10", certifications: ["GOTS"] },
    dye: { name: "Menderes Dyeworks", city: "Denizli", country: "Turkey", lat: 37.8, lng: 29.05, founded: 1992, workers: 120, lastAudit: "2026-02-10", certifications: ["ZDHC Level 2"] },
  },
  "cotton-canvas": {
    mill: { name: "Narmada Weaving Mills", city: "Indore", country: "India", lat: 22.72, lng: 75.86, founded: 1968, workers: 540, lastAudit: "2026-01-15", certifications: ["GOTS"] },
    dye: { name: "Sabarmati Process House", city: "Ahmedabad", country: "India", lat: 23.05, lng: 72.6, founded: 1988, workers: 150, lastAudit: "2026-02-22", certifications: ["GOTS"] },
  },
  "recycled-nylon": {
    mill: { name: "Taoyuan Polymer Textiles", city: "Taoyuan", country: "Taiwan", lat: 24.99, lng: 121.3, founded: 1985, workers: 260, lastAudit: "2026-01-09", certifications: ["GRS", "bluesign®"] },
    dye: { name: "Taoyuan Polymer Textiles — Finishing", city: "Taoyuan", country: "Taiwan", lat: 24.99, lng: 121.3, founded: 1985, workers: 260, lastAudit: "2026-01-09", certifications: ["bluesign®"] },
  },
  "loopback-fleece": {
    mill: { name: "Carolina Knit Mill", city: "Burlington", country: "United States", lat: 36.1, lng: -79.44, founded: 1958, workers: 90, lastAudit: "2026-02-14", certifications: ["OCS"] },
    dye: { name: "Vernon Garment Dye", city: "Los Angeles", country: "United States", lat: 34.0, lng: -118.22, founded: 2001, workers: 40, lastAudit: "2026-02-05", certifications: ["OEKO-TEX Standard 100"] },
  },
};

// Garment measurement blocks in cm. Tops: chest circumference, body length,
// shoulder width, sleeve length. Bottoms: waist, hip, inseam, rise.
const blocks = {
  "tee-regular": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 94, length: 68, shoulder: 42, sleeve: 20 },
      S: { chest: 100, length: 70, shoulder: 44, sleeve: 21 },
      M: { chest: 106, length: 72, shoulder: 46, sleeve: 22 },
      L: { chest: 112, length: 74, shoulder: 48, sleeve: 23 },
      XL: { chest: 118, length: 76, shoulder: 50, sleeve: 24 },
    },
  },
  "tee-relaxed": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 104, length: 68, shoulder: 48, sleeve: 22 },
      S: { chest: 110, length: 70, shoulder: 50, sleeve: 23 },
      M: { chest: 116, length: 72, shoulder: 52, sleeve: 24 },
      L: { chest: 122, length: 74, shoulder: 54, sleeve: 25 },
      XL: { chest: 128, length: 76, shoulder: 56, sleeve: 26 },
    },
  },
  "tee-slim": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 86, length: 66, shoulder: 40, sleeve: 0 },
      S: { chest: 92, length: 68, shoulder: 42, sleeve: 0 },
      M: { chest: 98, length: 70, shoulder: 44, sleeve: 0 },
      L: { chest: 104, length: 72, shoulder: 46, sleeve: 0 },
      XL: { chest: 110, length: 74, shoulder: 48, sleeve: 0 },
    },
  },
  "shirt-regular": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 100, length: 72, shoulder: 43, sleeve: 61 },
      S: { chest: 106, length: 74, shoulder: 45, sleeve: 62 },
      M: { chest: 112, length: 76, shoulder: 47, sleeve: 63 },
      L: { chest: 118, length: 78, shoulder: 49, sleeve: 64 },
      XL: { chest: 124, length: 80, shoulder: 51, sleeve: 65 },
    },
  },
  "shirt-relaxed": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 108, length: 70, shoulder: 47, sleeve: 23 },
      S: { chest: 114, length: 72, shoulder: 49, sleeve: 24 },
      M: { chest: 120, length: 74, shoulder: 51, sleeve: 25 },
      L: { chest: 126, length: 76, shoulder: 53, sleeve: 26 },
      XL: { chest: 132, length: 78, shoulder: 55, sleeve: 27 },
    },
  },
  "knit-regular": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 98, length: 64, shoulder: 43, sleeve: 60 },
      S: { chest: 104, length: 66, shoulder: 45, sleeve: 61 },
      M: { chest: 110, length: 68, shoulder: 47, sleeve: 62 },
      L: { chest: 116, length: 70, shoulder: 49, sleeve: 63 },
      XL: { chest: 122, length: 72, shoulder: 51, sleeve: 64 },
    },
  },
  "outer-relaxed": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "top",
    measurements: {
      XS: { chest: 112, length: 70, shoulder: 46, sleeve: 62 },
      S: { chest: 118, length: 72, shoulder: 48, sleeve: 63 },
      M: { chest: 124, length: 74, shoulder: 50, sleeve: 64 },
      L: { chest: 130, length: 76, shoulder: 52, sleeve: 65 },
      XL: { chest: 136, length: 78, shoulder: 54, sleeve: 66 },
    },
  },
  "bottom-regular": {
    sizes: ["28", "30", "32", "34", "36"],
    kind: "bottom",
    measurements: {
      28: { waist: 74, hip: 96, inseam: 78, rise: 27 },
      30: { waist: 79, hip: 101, inseam: 79, rise: 28 },
      32: { waist: 84, hip: 106, inseam: 80, rise: 29 },
      34: { waist: 89, hip: 111, inseam: 81, rise: 30 },
      36: { waist: 94, hip: 116, inseam: 81, rise: 31 },
    },
  },
  "bottom-relaxed": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "bottom",
    measurements: {
      XS: { waist: 70, hip: 102, inseam: 74, rise: 29 },
      S: { waist: 76, hip: 108, inseam: 75, rise: 30 },
      M: { waist: 82, hip: 114, inseam: 76, rise: 31 },
      L: { waist: 88, hip: 120, inseam: 77, rise: 32 },
      XL: { waist: 94, hip: 126, inseam: 77, rise: 33 },
    },
  },
  "short-relaxed": {
    sizes: ["XS", "S", "M", "L", "XL"],
    kind: "bottom",
    measurements: {
      XS: { waist: 70, hip: 102, inseam: 16, rise: 29 },
      S: { waist: 76, hip: 108, inseam: 17, rise: 30 },
      M: { waist: 82, hip: 114, inseam: 18, rise: 31 },
      L: { waist: 88, hip: 120, inseam: 18, rise: 32 },
      XL: { waist: 94, hip: 126, inseam: 19, rise: 33 },
    },
  },
};

// price = materials + labor + transport + operations + brand
const products = [
  {
    slug: "everyday-tee", code: "TEE", num: "001", name: "Everyday Tee", category: "tees", garment: "tee",
    price: 48, cost: { materials: 14, labor: 9, transport: 4, operations: 7, brand: 14 },
    material: "organic-cotton-jersey", factory: "porto-manufacturing", fit: "regular", block: "tee-regular",
    colors: ["black", "white", "heather", "navy", "stone"], weather: ["hot", "mild"], collections: ["essentials"],
    tagline: "The tee we'd buy again. And again.",
    description: "A mid-weight crew in organic cotton jersey with a narrow ribbed collar that keeps its shape. Cut with a straight hem and a sleeve that hits mid-bicep.",
    details: ["Regular fit — true to size", "Narrow 1.5 cm ribbed collar", "Twin-needle hems", "Side-seamed for a straight hang"],
    batch: "PT-2026-041", manufactured: "2026-04",
  },
  {
    slug: "heavyweight-tee", code: "TEE", num: "002", name: "Heavyweight Tee", category: "tees", garment: "tee",
    price: 58, cost: { materials: 18, labor: 10, transport: 5, operations: 8, brand: 17 },
    material: "heavyweight-cotton", factory: "porto-manufacturing", fit: "relaxed", block: "tee-relaxed",
    colors: ["ecru", "black", "olive", "navy"], weather: ["mild"], collections: ["essentials", "workwear"],
    tagline: "Dense, dry and built to last a decade.",
    description: "A boxy tee in 260 gsm organic cotton with a dropped shoulder and a thick collar. Structured enough to wear on its own.",
    details: ["Relaxed, boxy fit", "Dropped shoulder", "Thick 2.5 cm collar", "Pre-washed to minimise shrinkage"],
    batch: "PT-2026-052", manufactured: "2026-05",
  },
  {
    slug: "long-sleeve-tee", code: "TEE", num: "003", name: "Long-Sleeve Tee", category: "tees", garment: "longsleeve",
    price: 56, cost: { materials: 16, labor: 10, transport: 4, operations: 8, brand: 18 },
    material: "organic-cotton-jersey", factory: "porto-manufacturing", fit: "regular", block: "tee-regular",
    colors: ["white", "black", "heather", "forest"], weather: ["mild", "cold"], collections: ["essentials"],
    tagline: "The everyday tee, with sleeves.",
    description: "Our organic jersey in a long-sleeve cut with ribbed cuffs. The layer you'll reach for from September to May.",
    details: ["Regular fit — true to size", "Ribbed cuffs", "Narrow ribbed collar", "Twin-needle hems"],
    batch: "PT-2026-047", manufactured: "2026-04",
  },
  {
    slug: "rib-tank", code: "TNK", num: "001", name: "Rib Tank", category: "tees", garment: "tank",
    price: 32, cost: { materials: 9, labor: 6, transport: 3, operations: 5, brand: 9 },
    material: "cotton-rib", factory: "porto-manufacturing", fit: "slim", block: "tee-slim",
    colors: ["white", "black", "ecru"], weather: ["hot"], collections: ["essentials", "summer"],
    tagline: "A close-fitting rib for the hottest days.",
    description: "A slim tank in stretch organic rib with clean bound edges. Lies flat under a shirt, stands up on its own.",
    details: ["Slim fit", "Bound neck and armholes", "2x2 rib with memory", "Longer length to stay tucked"],
    batch: "PT-2026-058", manufactured: "2026-05",
  },
  {
    slug: "oxford-shirt", code: "SHR", num: "001", name: "Oxford Shirt", category: "shirts", garment: "shirt",
    price: 88, cost: { materials: 22, labor: 16, transport: 6, operations: 12, brand: 32 },
    material: "long-staple-poplin", factory: "kutch-shirting", fit: "regular", block: "shirt-regular",
    colors: ["white", "sky", "ecru"], weather: ["mild"], collections: ["essentials"],
    tagline: "A button-down that softens with every wash.",
    description: "A classic button-down collar in a two-ply organic oxford. Single-needle stitched, with a box pleat and locker loop at the back.",
    details: ["Regular fit", "Button-down collar", "Single-needle stitching", "Corozo nut buttons"],
    batch: "IN-2026-019", manufactured: "2026-03",
  },
  {
    slug: "camp-shirt", code: "SHR", num: "002", name: "Linen Camp Shirt", category: "shirts", garment: "campshirt",
    price: 58, cost: { materials: 16, labor: 11, transport: 4, operations: 8, brand: 19 },
    material: "european-linen", factory: "kutch-shirting", fit: "relaxed", block: "shirt-relaxed",
    colors: ["black", "ecru", "olive", "clay"], weather: ["hot"], collections: ["summer"],
    tagline: "Short sleeves. Open collar. Nothing to prove.",
    description: "A boxy short-sleeve shirt in garment-washed European linen with a flat camp collar. Cool enough for August.",
    details: ["Relaxed, boxy fit", "Camp collar", "Straight hem to wear untucked", "Garment washed"],
    batch: "IN-2026-027", manufactured: "2026-04",
  },
  {
    slug: "linen-shirt", code: "SHR", num: "003", name: "Linen Shirt", category: "shirts", garment: "shirt",
    price: 98, cost: { materials: 26, labor: 17, transport: 6, operations: 13, brand: 36 },
    material: "european-linen", factory: "kutch-shirting", fit: "regular", block: "shirt-regular",
    colors: ["white", "sand", "black", "sky"], weather: ["hot", "mild"], collections: ["summer"],
    tagline: "Long sleeves, rolled or not.",
    description: "A long-sleeve linen shirt with a soft spread collar. Wears crisp in the morning and relaxed by evening.",
    details: ["Regular fit", "Soft spread collar", "Curved hem", "Garment washed"],
    batch: "IN-2026-031", manufactured: "2026-04",
  },
  {
    slug: "merino-crew", code: "KNT", num: "001", name: "Merino Crew", category: "knitwear", garment: "sweater",
    price: 120, cost: { materials: 34, labor: 22, transport: 6, operations: 16, brand: 42 },
    material: "extra-fine-merino", factory: "lanificio-biella", fit: "regular", block: "knit-regular",
    colors: ["charcoal", "navy", "camel", "ecru"], weather: ["cold", "mild"], collections: ["winter"],
    tagline: "Warm without the weight.",
    description: "A fully-fashioned crew neck in extra-fine RWS merino. Fine enough to layer under a jacket, warm enough to wear alone.",
    details: ["Regular fit", "Fully-fashioned — knitted to shape", "Hand-linked collar", "Ribbed cuffs and hem"],
    batch: "IT-2026-008", manufactured: "2026-02",
  },
  {
    slug: "cashmere-crew", code: "KNT", num: "002", name: "Cashmere Crew", category: "knitwear", garment: "sweater",
    price: 180, cost: { materials: 62, labor: 28, transport: 7, operations: 21, brand: 62 },
    material: "grade-a-cashmere", factory: "lanificio-biella", fit: "relaxed", block: "knit-regular",
    colors: ["camel", "heather", "black"], weather: ["cold"], collections: ["winter"],
    tagline: "Grade-A cashmere, priced honestly.",
    description: "A relaxed 7-gauge crew in Grade-A Mongolian cashmere. Lofty and warm, finished by hand in Biella.",
    details: ["Relaxed fit", "7-gauge knit", "Hand-linked seams", "Washed in soft Alpine water"],
    batch: "IT-2026-012", manufactured: "2026-03",
  },
  {
    slug: "relaxed-trouser", code: "TRS", num: "001", name: "Relaxed Trouser", category: "trousers", garment: "trouser",
    price: 98, cost: { materials: 24, labor: 18, transport: 6, operations: 14, brand: 36 },
    material: "cotton-twill", factory: "ege-denim-works", fit: "relaxed", block: "bottom-relaxed",
    colors: ["stone", "black", "olive"], weather: ["mild"], collections: ["essentials", "workwear"],
    tagline: "A wider leg with a clean drape.",
    description: "A pleated trouser in brushed organic twill with an elasticated back waist. Tailored in front, easy everywhere else.",
    details: ["Relaxed, straight leg", "Single front pleat", "Elasticated back waist", "Slant pockets"],
    batch: "TR-2026-022", manufactured: "2026-03",
  },
  {
    slug: "straight-jean", code: "DNM", num: "001", name: "Straight Jean", category: "denim", garment: "jean",
    price: 108, cost: { materials: 26, labor: 20, transport: 6, operations: 16, brand: 40 },
    material: "organic-denim", factory: "ege-denim-works", fit: "regular", block: "bottom-regular",
    colors: ["indigo", "washed", "black"], weather: ["mild", "cold"], collections: ["essentials", "workwear"],
    tagline: "13 oz organic denim that fades honestly.",
    description: "A mid-rise straight jean cut from rope-dyed organic denim. Finished with ozone and laser instead of stones.",
    details: ["Regular, straight leg", "Mid rise", "Chain-stitched hem", "Copper rivets, no rivets at back pockets"],
    batch: "TR-2026-015", manufactured: "2026-02",
  },
  {
    slug: "chore-jacket", code: "OUT", num: "001", name: "Chore Jacket", category: "outerwear", garment: "jacket",
    price: 168, cost: { materials: 38, labor: 32, transport: 9, operations: 23, brand: 66 },
    material: "cotton-canvas", factory: "saigon-outerwear", fit: "relaxed", block: "outer-relaxed",
    colors: ["clay", "navy", "black", "stone"], weather: ["mild"], collections: ["workwear"],
    tagline: "Four pockets. Built to be worn in.",
    description: "An unlined chore coat in 10 oz organic canvas with four patch pockets and a corduroy-lined collar.",
    details: ["Relaxed fit, sized for layering", "Four patch pockets", "Triple-stitched seams", "Corozo buttons"],
    batch: "VN-2026-006", manufactured: "2026-02",
  },
  {
    slug: "field-parka", code: "OUT", num: "002", name: "Field Parka", category: "outerwear", garment: "parka",
    price: 248, cost: { materials: 62, labor: 44, transport: 12, operations: 34, brand: 96 },
    material: "recycled-nylon", factory: "saigon-outerwear", fit: "relaxed", block: "outer-relaxed",
    colors: ["black", "olive", "navy"], weather: ["cold"], collections: ["winter"],
    tagline: "Recycled insulation for real winters.",
    description: "A hip-length parka in recycled ripstop with recycled synthetic insulation and a PFC-free water-repellent finish.",
    details: ["Relaxed fit", "Recycled insulation, 150 g/m²", "Two-way zip with storm flap", "Fixed hood"],
    batch: "VN-2026-011", manufactured: "2026-03",
  },
  {
    slug: "fleece-hoodie", code: "SWT", num: "001", name: "Fleece Hoodie", category: "sweats", garment: "hoodie",
    price: 98, cost: { materials: 22, labor: 24, transport: 3, operations: 13, brand: 36 },
    material: "loopback-fleece", factory: "vernon-cut-sew", fit: "relaxed", block: "tee-relaxed",
    colors: ["heather", "black", "navy", "ecru"], weather: ["mild", "cold"], collections: ["essentials"],
    tagline: "Heavy loopback, made in Los Angeles.",
    description: "A relaxed pullover hoodie in 380 gsm organic loopback fleece with a double-layer hood and flatlock seams.",
    details: ["Relaxed fit", "Double-layer hood, no drawcords", "Flatlock seams", "Kangaroo pocket"],
    batch: "US-2026-004", manufactured: "2026-03",
  },
  {
    slug: "fleece-sweatpant", code: "SWT", num: "002", name: "Fleece Sweatpant", category: "sweats", garment: "sweatpant",
    price: 88, cost: { materials: 20, labor: 22, transport: 3, operations: 12, brand: 31 },
    material: "loopback-fleece", factory: "vernon-cut-sew", fit: "relaxed", block: "bottom-relaxed",
    colors: ["heather", "black", "navy"], weather: ["mild", "cold"], collections: ["essentials"],
    tagline: "Tapered, heavy and quietly smart.",
    description: "A tapered sweatpant in organic loopback fleece with a flat drawcord waist and deep side pockets.",
    details: ["Relaxed, tapered leg", "Flat drawcord waist", "Ribbed cuffs", "Back patch pocket"],
    batch: "US-2026-005", manufactured: "2026-03",
  },
  {
    slug: "linen-short", code: "SHT", num: "001", name: "Linen Short", category: "shorts", garment: "short",
    price: 68, cost: { materials: 17, labor: 12, transport: 4, operations: 10, brand: 25 },
    material: "european-linen", factory: "porto-manufacturing", fit: "relaxed", block: "short-relaxed",
    colors: ["sand", "black", "ecru"], weather: ["hot"], collections: ["summer"],
    tagline: "An 18 cm inseam for long summer days.",
    description: "A relaxed drawstring short in garment-washed European linen. Hits just above the knee.",
    details: ["Relaxed fit", "18 cm inseam (size M)", "Drawstring waist", "Two side pockets, one back"],
    batch: "PT-2026-061", manufactured: "2026-05",
  },
];

const collections = [
  { slug: "essentials", name: "Essentials", description: "The pieces we'd keep if we could only keep ten.", season: "Permanent" },
  { slug: "summer", name: "Summer Linen", description: "European flax, garment washed. Made for heat.", season: "Summer 2026" },
  { slug: "winter", name: "Winter Knits", description: "Merino, cashmere and recycled insulation.", season: "Autumn / Winter 2026" },
  { slug: "workwear", name: "Workwear", description: "Canvas, twill and denim, built to be worn in.", season: "Permanent" },
];

const journal = [
  {
    slug: "why-we-publish-our-costs",
    title: "Why we publish our costs",
    date: "2026-05-14",
    readingMinutes: 4,
    excerpt: "Every product page shows what it costs to make. Here's how we calculate it — and what's left out.",
    body: [
      "Most clothing is priced by working backwards from what a shop thinks it can charge. We work forwards: materials, labour, transport and operations, then a brand margin we're willing to show you.",
      "The breakdown on each product page is an estimate at the batch level. Material prices move; exchange rates move. We update the figures whenever we produce a new batch.",
      "What's not in the number: marketing campaigns we don't run, wholesale markups we don't pay, and discounts we don't plan for. We don't run sales, so the price you see is the price everyone pays.",
      "THREAD is a fictional brand. The figures on this site are simulated to illustrate the model.",
    ],
  },
  {
    slug: "a-day-in-porto",
    title: "A day in Porto",
    date: "2026-04-02",
    readingMinutes: 6,
    excerpt: "Three floors, eleven operations, one tee. We spent a day at the workshop that makes our jersey.",
    body: [
      "At 7:30 the cutting floor is already warm. Fabric delivered yesterday has been left to relax overnight so it won't shrink after it's cut.",
      "Upstairs, eight-person cells work through the eleven operations that turn flat panels into a finished tee. Nobody is paid by the piece — the pace is steady rather than frantic.",
      "By late afternoon the finishing team is steaming and measuring. Anything more than half a centimetre out of spec goes back.",
    ],
  },
  {
    slug: "the-case-for-fewer-pieces",
    title: "The case for fewer, better pieces",
    date: "2026-02-20",
    readingMinutes: 3,
    excerpt: "The most sustainable garment is the one you already own. The second most is the one you'll wear for ten years.",
    body: [
      "We make a small number of things and try to make them very well. That means heavier fabrics, stronger seams, and fits that don't chase trends.",
      "Cost per wear is a better measure than price. A $48 tee worn 200 times costs 24 cents a wear.",
      "Every garment comes with a digital passport so you — or its next owner — can see where it came from and how to care for it.",
    ],
  },
];

function titleCaseFit(fit) {
  return fit[0].toUpperCase() + fit.slice(1);
}

const materialBySlug = Object.fromEntries(materials.map((m) => [m.slug, m]));
const factoryBySlug = Object.fromEntries(factories.map((f) => [f.slug, f]));

const builtProducts = products.map((p, index) => {
  const sum = Object.values(p.cost).reduce((a, b) => a + b, 0);
  if (sum !== p.price) throw new Error(`${p.slug}: cost breakdown ${sum} != price ${p.price}`);
  const material = materialBySlug[p.material];
  const factory = factoryBySlug[p.factory];
  if (!material || !factory) throw new Error(`${p.slug}: unknown material/factory`);
  const block = blocks[p.block];
  const up = upstream[p.material];

  const variants = [];
  for (const colorId of p.colors) {
    const color = colors[colorId];
    for (const size of block.sizes) {
      const middle = size === "M" || size === "L" || size === "32";
      let inventory = Math.floor(rand() * (middle ? 70 : 45));
      // Leave a few genuinely sold-out and low-stock variants.
      if (rand() < 0.07) inventory = 0;
      else if (rand() < 0.1) inventory = 1 + Math.floor(rand() * 4);
      variants.push({
        sku: `THR-${p.code}-${p.num}-${color.code}-${size}`,
        color: colorId,
        size,
        inventory,
      });
    }
  }

  const supplyChain = [
    {
      stage: "material",
      label: "Material",
      name: material.name,
      place: material.originRegion,
      country: material.origin,
      lat: material.lat,
      lng: material.lng,
      facts: [
        ["Fibre", material.composition.map((c) => `${c.percent}% ${c.fibre}`).join(" / ")],
        ["Certification", material.certification],
        ["Region", material.originRegion],
      ],
    },
    {
      stage: "mill",
      label: "Mill",
      name: up.mill.name,
      place: up.mill.city,
      country: up.mill.country,
      lat: up.mill.lat,
      lng: up.mill.lng,
      facts: [
        ["Founded", String(up.mill.founded)],
        ["Workers", String(up.mill.workers)],
        ["Last audit", up.mill.lastAudit],
        ["Certifications", up.mill.certifications.join(", ")],
      ],
    },
    {
      stage: "dyehouse",
      label: "Dye house",
      name: up.dye.name,
      place: up.dye.city,
      country: up.dye.country,
      lat: up.dye.lat,
      lng: up.dye.lng,
      facts: [
        ["Founded", String(up.dye.founded)],
        ["Workers", String(up.dye.workers)],
        ["Last audit", up.dye.lastAudit],
        ["Chemistry", up.dye.certifications.join(", ")],
      ],
    },
    {
      stage: "factory",
      label: "Factory",
      name: factory.name,
      place: factory.city,
      country: factory.country,
      lat: factory.lat,
      lng: factory.lng,
      ref: factory.slug,
      facts: [
        ["Founded", String(factory.founded)],
        ["Workers", String(factory.workers)],
        ["Last audit", factory.lastAudit],
        ["Production", factory.specialty],
      ],
    },
    {
      stage: "warehouse",
      label: "Warehouse",
      name: warehouse.name,
      place: warehouse.city,
      country: warehouse.country,
      lat: warehouse.lat,
      lng: warehouse.lng,
      facts: [
        ["Operated by", "THREAD"],
        ["Energy", "100% renewable tariff"],
        ["Packaging", "Recycled paper, no plastic"],
      ],
    },
    {
      stage: "customer",
      label: "You",
      name: "Your door",
      place: "Worldwide",
      country: "",
      lat: null,
      lng: null,
      facts: [
        ["Shipping", "Carbon-neutral ground"],
        ["Returns", "Free within 30 days"],
        ["Repairs", "Free for the first year"],
      ],
    },
  ];

  return {
    id: index + 1,
    slug: p.slug,
    styleCode: `THR-${p.code}-${p.num}`,
    name: p.name,
    category: p.category,
    garment: p.garment,
    price: p.price,
    costBreakdown: p.cost,
    materialSlug: p.material,
    factorySlug: p.factory,
    fit: p.fit,
    fitLabel: titleCaseFit(p.fit),
    block: p.block,
    colors: p.colors,
    sizes: block.sizes,
    weather: p.weather,
    collections: p.collections,
    tagline: p.tagline,
    description: p.description,
    details: p.details,
    batch: p.batch,
    manufactured: p.manufactured,
    variants,
    supplyChain,
  };
});

const catalog = {
  generatedFor: "THREAD — fictional brand. All figures are simulated.",
  currency: "USD",
  freeShippingThreshold: 100,
  flatShipping: 8,
  colors: Object.values(colors),
  collections,
  materials,
  factories,
  warehouse,
  blocks,
  products: builtProducts,
  journal,
};

writeFileSync(join(here, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog.json: ${builtProducts.length} products, ${builtProducts.reduce((a, p) => a + p.variants.length, 0)} variants`);
