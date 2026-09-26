const KEY = "thread-orders";

export interface RecentOrder {
  number: string;
  token: string;
}

/** Guests track orders with a per-order access token kept on this device. */
export function rememberOrder(number: string, token: string) {
  try {
    const list: RecentOrder[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    localStorage.setItem(KEY, JSON.stringify([{ number, token }, ...list.filter((o) => o.number !== number)].slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

export function recentOrders(): RecentOrder[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
