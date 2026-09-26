import type { Block, BottomMeasure, TopMeasure } from "./types";

/**
 * Personalised fit engine. Compares the customer's body (measured or
 * estimated from height/weight) with each size's garment measurements and
 * the ease the garment was designed to have, then scores every size.
 */

export type FitPreference = "fitted" | "regular" | "relaxed";

export interface BodyInput {
  heightCm: number;
  weightKg: number;
  chestCm?: number | null;
  waistCm?: number | null;
  preference: FitPreference;
}

export interface FitReason {
  label: string;
  verdict: string;
  tone: "ideal" | "near" | "off";
}

export interface ComparisonRow {
  label: string;
  body: number;
  garment: number;
  /** Ease = garment − body (cm). */
  ease: number;
  target: number;
}

export interface FitResult {
  size: string;
  confidence: number;
  reasons: FitReason[];
  comparison: ComparisonRow[];
  estimated: string[];
  alternative: { size: string; note: string } | null;
}

/** Designed ease at chest (tops) or waist (bottoms), in cm, per block. */
const DESIGN_EASE: Record<string, number> = {
  "tee-regular": 8,
  "tee-relaxed": 16,
  "tee-slim": -3,
  "shirt-regular": 12,
  "shirt-relaxed": 20,
  "knit-regular": 10,
  "outer-relaxed": 24,
  "bottom-regular": 1,
  "bottom-relaxed": -2,
  "short-relaxed": -2,
};

const PREFERENCE_SHIFT: Record<FitPreference, number> = { fitted: -4, regular: 0, relaxed: 6 };

export function estimateChest(heightCm: number, weightKg: number): number {
  return Math.round(0.25 * heightCm + 0.6 * weightKg + 11);
}

export function estimateWaist(heightCm: number, weightKg: number): number {
  return Math.round(0.15 * heightCm + 0.75 * weightKg + 6);
}

export function validateBody(input: Partial<BodyInput>): string | null {
  if (!input.heightCm || input.heightCm < 140 || input.heightCm > 215) return "Enter a height between 140 and 215 cm.";
  if (!input.weightKg || input.weightKg < 35 || input.weightKg > 180) return "Enter a weight between 35 and 180 kg.";
  if (input.chestCm && (input.chestCm < 60 || input.chestCm > 160)) return "Chest should be between 60 and 160 cm.";
  if (input.waistCm && (input.waistCm < 50 || input.waistCm > 150)) return "Waist should be between 50 and 150 cm.";
  return null;
}

function tone(dev: number, tol: number): FitReason["tone"] {
  const a = Math.abs(dev);
  return a <= tol ? "ideal" : a <= tol * 2.5 ? "near" : "off";
}

export function recommendSize(blockId: string, block: Block, input: BodyInput): FitResult {
  const estimated: string[] = [];
  const chest = input.chestCm ?? (estimated.push("chest"), estimateChest(input.heightCm, input.weightKg));
  const waist = input.waistCm ?? (estimated.push("waist"), estimateWaist(input.heightCm, input.weightKg));
  const shift = PREFERENCE_SHIFT[input.preference];
  const baseEase = DESIGN_EASE[blockId] ?? 8;

  type Scored = { size: string; cost: number; rows: ComparisonRow[]; reasons: FitReason[] };
  const scored: Scored[] = [];

  for (const size of block.sizes) {
    const m = block.measurements[size]!;
    if (block.kind === "top") {
      const g = m as TopMeasure;
      const target = baseEase + shift;
      const ease = g.chest - chest;
      const chestDev = ease - target;
      const bodyShoulder = 0.235 * input.heightCm;
      const shoulderEase = g.shoulder - bodyShoulder;
      const shoulderTarget = blockId.includes("relaxed") ? 7 : blockId.includes("slim") ? 0 : 3;
      const shoulderDev = shoulderEase - shoulderTarget;
      const idealLength = 0.405 * input.heightCm;
      const lengthDev = g.length - idealLength;
      const cost = (chestDev / 4) ** 2 + 0.5 * (shoulderDev / 3) ** 2 + 0.45 * (lengthDev / 4) ** 2;
      scored.push({
        size,
        cost,
        rows: [
          { label: "Chest", body: chest, garment: g.chest, ease, target },
          { label: "Shoulder", body: Math.round(bodyShoulder), garment: g.shoulder, ease: Math.round(shoulderEase), target: shoulderTarget },
          { label: "Length", body: Math.round(idealLength), garment: g.length, ease: Math.round(lengthDev), target: 0 },
        ],
        reasons: [
          {
            label: "Chest",
            verdict: Math.abs(chestDev) <= 3 ? "ideal" : chestDev < 0 ? (chestDev < -8 ? "tight" : "snug") : chestDev > 8 ? "roomy" : "relaxed",
            tone: tone(chestDev, 3),
          },
          {
            label: "Shoulder",
            verdict: Math.abs(shoulderDev) <= 1.5 ? "ideal" : shoulderDev > 0 ? "relaxed" : "narrow",
            tone: tone(shoulderDev, 1.5),
          },
          {
            label: "Length",
            verdict:
              Math.abs(lengthDev) <= 2 ? "ideal" : lengthDev > 0 ? (lengthDev > 5 ? "long" : "slightly long") : lengthDev < -5 ? "short" : "slightly short",
            tone: tone(lengthDev, 2),
          },
        ],
      });
    } else {
      const g = m as BottomMeasure;
      const target = baseEase + Math.round(shift / 2);
      const ease = g.waist - waist;
      const waistDev = ease - target;
      const isShort = blockId.startsWith("short");
      const idealInseam = isShort ? g.inseam : 0.45 * input.heightCm;
      const inseamDev = g.inseam - idealInseam;
      const cost = (waistDev / 2.5) ** 2 + (isShort ? 0 : 0.35 * (inseamDev / 4) ** 2);
      scored.push({
        size,
        cost,
        rows: [
          { label: "Waist", body: waist, garment: g.waist, ease, target },
          ...(isShort ? [] : [{ label: "Inseam", body: Math.round(idealInseam), garment: g.inseam, ease: Math.round(inseamDev), target: 0 }]),
          { label: "Hip", body: Math.round(waist * 1.13), garment: g.hip, ease: Math.round(g.hip - waist * 1.13), target: 8 },
        ],
        reasons: [
          {
            label: "Waist",
            verdict: Math.abs(waistDev) <= 2 ? "ideal" : waistDev < 0 ? "snug" : "loose",
            tone: tone(waistDev, 2),
          },
          ...(isShort
            ? []
            : [
                {
                  label: "Length",
                  verdict: Math.abs(inseamDev) <= 2.5 ? "ideal" : inseamDev > 0 ? "long — cuff or hem" : "slightly short",
                  tone: tone(inseamDev, 2.5),
                },
              ]),
          { label: "Seat", verdict: g.hip - waist * 1.13 > 12 ? "relaxed" : "clean", tone: "ideal" as const },
        ],
      });
    }
  }

  scored.sort((a, b) => a.cost - b.cost);
  const best = scored[0]!;
  const second = scored[1];
  const gap = second ? second.cost - best.cost : 5;
  let confidence = 0.97 - 0.07 * estimated.filter((e) => (block.kind === "top" ? e === "chest" : e === "waist")).length;
  confidence -= Math.min(0.25, 0.06 * Math.sqrt(best.cost));
  confidence -= 0.18 * Math.exp(-gap);
  confidence = Math.max(0.5, Math.min(0.97, confidence));

  let alternative: FitResult["alternative"] = null;
  if (second && gap < 1.2) {
    const idx = block.sizes.indexOf(second.size);
    const bestIdx = block.sizes.indexOf(best.size);
    alternative = { size: second.size, note: idx > bestIdx ? "for a roomier fit" : "for a closer fit" };
  }

  return {
    size: best.size,
    confidence: Math.round(confidence * 100) / 100,
    reasons: best.reasons,
    comparison: best.rows,
    estimated,
    alternative,
  };
}
