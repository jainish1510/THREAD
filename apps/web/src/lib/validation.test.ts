import { describe, expect, it } from "vitest";
import { cardBrand, formatCardNumber, formatExpiry, luhn, validateAddress, validateCard, validateEmail } from "./validation";

describe("checkout validation", () => {
  it("validates email", () => {
    expect(validateEmail("")).toMatch(/enter/i);
    expect(validateEmail("nope")).toMatch(/valid/i);
    expect(validateEmail("ada@example.com")).toBeUndefined();
  });

  it("validates US addresses", () => {
    const base = { name: "Ada", line1: "1 Main", line2: "", city: "Nashville", region: "TN", postal_code: "37203", country: "US" };
    expect(validateAddress(base)).toEqual({});
    expect(validateAddress({ ...base, postal_code: "ABC" }).postal_code).toMatch(/ZIP/);
  });

  it("checks cards with Luhn, expiry and CVC", () => {
    expect(luhn("4242424242424242")).toBe(true);
    expect(luhn("4242424242424241")).toBe(false);
    const now = new Date(2026, 8, 1);
    expect(validateCard({ number: "4242 4242 4242 4242", expiry: "12 / 30", cvc: "123", name: "Ada" }, now)).toEqual({});
    expect(validateCard({ number: "4242 4242 4242 4242", expiry: "01 / 26", cvc: "123", name: "Ada" }, now).expiry).toMatch(/expired/);
    expect(validateCard({ number: "378282246310005", expiry: "12 / 30", cvc: "123", name: "Ada" }, now).cvc).toMatch(/4-digit/);
  });

  it("formats input", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatExpiry("1230")).toBe("12 / 30");
    expect(cardBrand("5555")).toBe("Mastercard");
  });
});
