import type { Garment } from "@/lib/types";

/**
 * Garment silhouettes are authored as the LEFT half only (from the centre-front
 * top down to the centre-front bottom) and mirrored, which guarantees symmetry.
 * Canvas: 400 × 500 (4:5, the product image ratio).
 */
type Pt = readonly [number, number];
type Seg = { t: "L"; to: Pt } | { t: "Q"; c: Pt; to: Pt } | { t: "C"; c1: Pt; c2: Pt; to: Pt };

const mx = ([x, y]: Pt): Pt => [400 - x, y];
const p = ([x, y]: Pt) => `${x},${y}`;

export function mirrorPath(start: Pt, segs: Seg[]): string {
  const pts: Pt[] = [start];
  let d = `M${p(start)}`;
  for (const s of segs) {
    if (s.t === "L") d += ` L${p(s.to)}`;
    else if (s.t === "Q") d += ` Q${p(s.c)} ${p(s.to)}`;
    else d += ` C${p(s.c1)} ${p(s.c2)} ${p(s.to)}`;
    pts.push(s.to);
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i]!;
    const back = mx(pts[i]!);
    if (s.t === "L") d += ` L${p(back)}`;
    else if (s.t === "Q") d += ` Q${p(mx(s.c))} ${p(back)}`;
    else d += ` C${p(mx(s.c2))} ${p(mx(s.c1))} ${p(back)}`;
  }
  return d + " Z";
}

const L = (x: number, y: number): Seg => ({ t: "L", to: [x, y] });
const Q = (cx: number, cy: number, x: number, y: number): Seg => ({ t: "Q", c: [cx, cy], to: [x, y] });
const C = (a: number, b: number, c: number, d: number, x: number, y: number): Seg => ({
  t: "C",
  c1: [a, b],
  c2: [c, d],
  to: [x, y],
});

export interface GarmentShape {
  body: string;
  /** Optional shape drawn behind the body (hood, collar stand, back neck). */
  behind?: string;
  /** True when `behind` is a collar stand (garment colour) rather than the inside. */
  stand?: boolean;
  kind: "top" | "bottom";
  /** viewBox used for the close-up "detail" image. */
  detailBox: string;
}

const crewNeck = [C(186, 121, 168, 112, 163, 94)];

export const shapes: Record<Garment, GarmentShape> = {
  tee: {
    kind: "top",
    body: mirrorPath([200, 121], [...crewNeck, L(112, 108), L(64, 186), L(99, 205), L(125, 166), L(127, 418), Q(165, 422, 200, 422)]),
    behind: "M163,94 C176,104 224,104 237,94 C232,126 168,126 163,94 Z",
    detailBox: "100 50 200 250",
  },
  longsleeve: {
    kind: "top",
    body: mirrorPath([200, 121], [...crewNeck, L(112, 108), L(68, 380), L(100, 386), L(126, 170), L(127, 418), Q(165, 422, 200, 422)]),
    behind: "M163,94 C176,104 224,104 237,94 C232,126 168,126 163,94 Z",
    detailBox: "100 50 200 250",
  },
  tank: {
    kind: "top",
    body: mirrorPath([200, 150], [C(178, 150, 164, 126, 160, 88), L(140, 86), C(140, 130, 132, 170, 124, 186), L(128, 432), Q(165, 436, 200, 436)]),
    behind: "M160,88 C170,110 230,110 240,88 C238,154 162,154 160,88 Z",
    detailBox: "100 60 200 250",
  },
  shirt: {
    kind: "top",
    stand: true,
    body: mirrorPath([200, 112], [C(186, 106, 168, 96, 161, 86), L(108, 100), L(62, 378), L(96, 386), L(124, 168), L(126, 406), C(134, 438, 170, 446, 200, 446)]),
    behind: "M158,86 C178,72 222,72 242,86 L238,96 C220,88 180,88 162,96 Z",
    detailBox: "100 50 200 250",
  },
  campshirt: {
    kind: "top",
    body: mirrorPath([200, 176], [L(162, 86), L(106, 100), L(72, 196), L(110, 214), L(126, 170), L(128, 424), L(200, 424)]),
    behind: "M158,86 C178,76 222,76 242,86 L200,178 Z",
    detailBox: "100 50 200 250",
  },
  sweater: {
    kind: "top",
    body: mirrorPath([200, 120], [C(186, 120, 170, 110, 166, 92), L(106, 106), L(58, 376), L(96, 384), L(124, 176), L(124, 398), L(130, 430), Q(165, 432, 200, 432)]),
    behind: "M166,92 C178,102 222,102 234,92 C230,124 170,124 166,92 Z",
    detailBox: "100 50 200 250",
  },
  hoodie: {
    kind: "top",
    body: mirrorPath([200, 128], [C(184, 128, 170, 114, 166, 96), L(104, 110), L(56, 380), L(96, 388), L(124, 180), L(124, 402), L(130, 434), Q(165, 436, 200, 436)]),
    behind: "M150,108 C140,46 176,28 200,28 C224,28 260,46 250,108 C236,98 164,98 150,108 Z",
    detailBox: "100 20 200 250",
  },
  jacket: {
    kind: "top",
    stand: true,
    body: mirrorPath([200, 124], [C(188, 116, 170, 100, 160, 84), L(100, 100), L(52, 384), L(92, 392), L(120, 174), L(118, 432), L(200, 432)]),
    behind: "M156,84 C178,70 222,70 244,84 L240,96 C220,86 180,86 160,96 Z",
    detailBox: "96 50 208 260",
  },
  parka: {
    kind: "top",
    body: mirrorPath([200, 110], [C(186, 108, 172, 98, 164, 84), L(98, 104), L(48, 390), L(92, 400), L(118, 180), L(114, 448), L(200, 448)]),
    behind: "M146,98 C136,40 174,22 200,22 C226,22 264,40 254,98 C238,88 162,88 146,98 Z",
    detailBox: "96 20 208 260",
  },
  trouser: {
    kind: "bottom",
    body: mirrorPath([200, 58], [L(128, 58), L(120, 112), L(108, 300), L(108, 464), L(186, 464), L(200, 190)]),
    detailBox: "100 40 200 250",
  },
  jean: {
    kind: "bottom",
    body: mirrorPath([200, 60], [L(130, 60), L(122, 112), L(116, 300), L(118, 464), L(184, 464), L(200, 188)]),
    detailBox: "100 40 200 250",
  },
  sweatpant: {
    kind: "bottom",
    body: mirrorPath([200, 56], [L(126, 56), L(118, 112), L(114, 300), L(128, 436), L(128, 464), L(180, 464), L(182, 436), L(200, 190)]),
    detailBox: "100 36 200 250",
  },
  short: {
    kind: "bottom",
    body: mirrorPath([200, 80], [L(124, 80), L(114, 140), L(96, 372), L(190, 388), L(200, 250)]),
    detailBox: "96 60 208 260",
  },
};
