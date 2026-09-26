/** Checkout validation. Messages are written to be read aloud by screen readers. */

export type Errors<K extends string> = Partial<Record<K, string>>;

export interface AddressForm {
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

export interface CardForm {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Enter your email address.";
  if (!EMAIL.test(email.trim())) return "Enter a valid email address, like name@example.com.";
  return undefined;
}

export function validateAddress(a: AddressForm): Errors<keyof AddressForm> {
  const e: Errors<keyof AddressForm> = {};
  if (!a.name.trim()) e.name = "Enter the recipient's full name.";
  if (!a.line1.trim()) e.line1 = "Enter a street address.";
  if (!a.city.trim()) e.city = "Enter a city.";
  if (!a.region.trim()) e.region = a.country === "US" ? "Enter a state." : "Enter a region.";
  if (a.country === "US" && !/^\d{5}(-\d{4})?$/.test(a.postal_code.trim())) e.postal_code = "Enter a 5-digit ZIP code.";
  else if (a.postal_code.trim().length < 3) e.postal_code = "Enter a postal code.";
  if (!/^[A-Z]{2}$/.test(a.country)) e.country = "Choose a country.";
  return e;
}

export function luhn(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(number: string): string | null {
  const n = number.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  if (/^6(011|5)/.test(n)) return "Discover";
  return null;
}

export function formatCardNumber(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 19);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

export function formatExpiry(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

export function validateCard(c: CardForm, now = new Date()): Errors<keyof CardForm> {
  const e: Errors<keyof CardForm> = {};
  const digits = c.number.replace(/\D/g, "");
  if (!digits) e.number = "Enter your card number.";
  else if (!luhn(digits)) e.number = "That card number isn't valid. Check the digits and try again.";
  const m = c.expiry.replace(/\s/g, "").match(/^(\d{2})\/(\d{2})$/);
  if (!m) e.expiry = "Enter the expiry date as MM / YY.";
  else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const end = new Date(year, month, 1);
    if (month < 1 || month > 12) e.expiry = "Enter a month between 01 and 12.";
    else if (end <= now) e.expiry = "This card has expired.";
  }
  const cvcLen = cardBrand(digits) === "American Express" ? 4 : 3;
  if (!new RegExp(`^\\d{${cvcLen}}$`).test(c.cvc)) e.cvc = `Enter the ${cvcLen}-digit security code.`;
  if (!c.name.trim()) e.name = "Enter the name on the card.";
  return e;
}
