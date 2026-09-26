import type { Texture } from "@/components/garment/GarmentArt";

const byMaterial: Record<string, Texture> = {
  "organic-cotton-jersey": "jersey",
  "heavyweight-cotton": "jersey",
  "cotton-rib": "rib",
  "long-staple-poplin": "woven",
  "european-linen": "linen",
  "extra-fine-merino": "knit",
  "grade-a-cashmere": "knit",
  "organic-denim": "denim",
  "cotton-twill": "twill",
  "cotton-canvas": "canvas",
  "recycled-nylon": "ripstop",
  "loopback-fleece": "fleece",
};

export function textureFor(materialSlug: string): Texture {
  return byMaterial[materialSlug] ?? "jersey";
}
