/**
 * Typed client for the THREAD API (FastAPI). Session auth uses an httpOnly
 * cookie, so every request is sent with credentials.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const UNREACHABLE = "We couldn't reach THREAD. Check your connection and try again.";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const method = (rest.method ?? "GET").toUpperCase();
  const csrf = method !== "GET" ? readCookie("thread_csrf") : undefined;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...rest,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // A 5xx with no API body means the proxy couldn't reach the API at all.
    if (res.status >= 500 && body === null) throw new ApiError(res.status, UNREACHABLE);
    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? (detail[0]?.msg ?? "Please check the highlighted fields.")
          : res.status === 429
            ? "Too many requests. Please wait a moment."
            : "Something went wrong. Please try again.";
    throw new ApiError(res.status, message, detail);
  }
  return body as T;
}

// ---- Shared API types ----

export interface User {
  id: number;
  email: string;
  name: string;
  role: "customer" | "admin";
}

export interface Address {
  id: number;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface OrderItem {
  sku: string;
  product_slug: string;
  product_name: string;
  color: string;
  size: string;
  unit_price_cents: number;
  quantity: number;
  batch: string;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderEvent {
  status: OrderStatus;
  note: string | null;
  location: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  email: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  shipping_method: string;
  shipping_address: Omit<Address, "id" | "is_default">;
  items: OrderItem[];
  events: OrderEvent[];
  created_at: string;
  payment_mode: "stripe" | "test";
}

export interface Measurements {
  height_cm: number | null;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  preferred_fit: "fitted" | "regular" | "relaxed";
}

export interface InventoryLevel {
  sku: string;
  available: number;
}
