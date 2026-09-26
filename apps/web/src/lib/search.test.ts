import { describe, expect, it } from "vitest";
import { getSummaries } from "./catalog";
import { interpret, parseQuery, search } from "./search";

describe("parseQuery", () => {
  it("interprets the canonical example", () => {
    const q = parseQuery("black shirt under $60 for hot weather");
    expect(q.colors).toEqual(["black"]);
    expect(q.categories).toEqual(["shirts"]);
    expect(q.priceMax).toBe(60);
    expect(q.weather).toBe("hot");
    expect(q.terms).toEqual([]);
  });

  it("reads price ranges", () => {
    const q = parseQuery("tees between 30 and 50");
    expect(q.priceMin).toBe(30);
    expect(q.priceMax).toBe(50);
    expect(q.categories).toEqual(["tees"]);
  });

  it("does not confuse 'light blue' with lightweight", () => {
    const q = parseQuery("light blue oxford");
    expect(q.colors).toEqual(["sky"]);
    expect(q.weather).toBeNull();
    expect(q.categories).toEqual(["shirts"]);
  });

  it("maps broad colours and groups", () => {
    const q = parseQuery("blue tops");
    expect(q.colors).toEqual(expect.arrayContaining(["navy", "sky"]));
    expect(q.categories).toEqual(expect.arrayContaining(["tees", "shirts"]));
  });

  it("maps cold-weather words", () => {
    expect(parseQuery("warm knit for winter").weather).toBe("cold");
    expect(parseQuery("something for warm weather").weather).toBe("hot");
  });

  it("produces readable chips", () => {
    const chips = interpret(parseQuery("black shirt under $60 for hot weather"));
    expect(chips.map((c) => `${c.label}=${c.value}`)).toEqual(["color=black", "category=shirt", "price=< $60", "weather=hot"]);
  });
});

describe("search", () => {
  const products = getSummaries();

  it("finds the black linen camp shirt", () => {
    const results = search(products, parseQuery("black shirt under $60 for hot weather"));
    expect(results[0]?.product.slug).toBe("camp-shirt");
    expect(results[0]?.color).toBe("black");
    expect(results.every((r) => r.product.price < 60 || r.product.price === 60)).toBe(true);
  });

  it("filters by material", () => {
    const results = search(products, parseQuery("linen"));
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.product.materialName.toLowerCase().includes("linen"))).toBe(true);
  });

  it("returns nothing for nonsense", () => {
    expect(search(products, parseQuery("zzqx"))).toEqual([]);
  });
});
