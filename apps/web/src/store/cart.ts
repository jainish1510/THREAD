"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Garment } from "@/lib/types";

export interface CartLine {
  sku: string;
  slug: string;
  name: string;
  garment: Garment;
  materialSlug: string;
  colorId: string;
  colorName: string;
  hex: string;
  size: string;
  price: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  open: boolean;
  lastAdded: string | null;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const MAX_PER_LINE = 10;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      lastAdded: null,
      add: (line, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.sku === line.sku);
          const lines = existing
            ? s.lines.map((l) => (l.sku === line.sku ? { ...l, quantity: Math.min(MAX_PER_LINE, l.quantity + quantity) } : l))
            : [...s.lines, { ...line, quantity }];
          return { lines, open: true, lastAdded: line.sku };
        }),
      setQuantity: (sku, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.sku !== sku)
              : s.lines.map((l) => (l.sku === sku ? { ...l, quantity: Math.min(MAX_PER_LINE, quantity) } : l)),
        })),
      remove: (sku) => set((s) => ({ lines: s.lines.filter((l) => l.sku !== sku) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "thread-bag",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);

export const FREE_SHIPPING_THRESHOLD = 100;
export const FLAT_SHIPPING = 8;

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  return { subtotal, count, shipping, total: subtotal + shipping, remainingForFree };
}
