import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { recommendSize, validateBody } from "./fit";

const tee = catalog.blocks["tee-regular"]!;
const jean = catalog.blocks["bottom-regular"]!;

describe("recommendSize", () => {
  it("recommends M for an average build in a regular tee", () => {
    const r = recommendSize("tee-regular", tee, { heightCm: 178, weightKg: 75, chestCm: 98, preference: "regular" });
    expect(r.size).toBe("M");
    expect(r.confidence).toBeGreaterThan(0.75);
    expect(r.reasons.map((x) => x.label)).toEqual(["Chest", "Shoulder", "Length"]);
  });

  it("sizes up for a relaxed preference", () => {
    const regular = recommendSize("tee-regular", tee, { heightCm: 178, weightKg: 75, chestCm: 98, preference: "regular" });
    const relaxed = recommendSize("tee-regular", tee, { heightCm: 178, weightKg: 75, chestCm: 98, preference: "relaxed" });
    expect(tee.sizes.indexOf(relaxed.size)).toBeGreaterThanOrEqual(tee.sizes.indexOf(regular.size));
  });

  it("is less confident when measurements are estimated", () => {
    const measured = recommendSize("tee-regular", tee, { heightCm: 178, weightKg: 75, chestCm: 100, preference: "regular" });
    const estimated = recommendSize("tee-regular", tee, { heightCm: 178, weightKg: 75, preference: "regular" });
    expect(estimated.estimated).toContain("chest");
    expect(estimated.confidence).toBeLessThan(measured.confidence);
  });

  it("uses waist for bottoms", () => {
    const r = recommendSize("bottom-regular", jean, { heightCm: 180, weightKg: 78, waistCm: 83, preference: "regular" });
    expect(r.size).toBe("32");
  });
});

describe("validateBody", () => {
  it("rejects implausible input", () => {
    expect(validateBody({ heightCm: 90, weightKg: 70 })).toMatch(/height/i);
    expect(validateBody({ heightCm: 180, weightKg: 75 })).toBeNull();
  });
});
