"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

export interface FeedItem {
  kind: "order" | "inventory";
  text: string;
  at: number;
}

/** Subscribes the console to live orders and stock changes. */
export function useAdminLive() {
  const qc = useQueryClient();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const orders = new EventSource(`${API_URL}/admin/stream`, { withCredentials: true });
    const stock = new EventSource(`${API_URL}/inventory/stream`);
    const push = (item: FeedItem) => setFeed((f) => [item, ...f].slice(0, 12));
    orders.onopen = () => setLive(true);
    orders.onerror = () => setLive(false);
    orders.addEventListener("order", (e) => {
      const d = JSON.parse((e as MessageEvent).data) as { number: string; status: string; total_cents: number };
      push({ kind: "order", text: `${d.number} → ${d.status.replaceAll("_", " ")}`, at: Date.now() });
      qc.invalidateQueries({ queryKey: ["admin"] });
    });
    stock.addEventListener("inventory", (e) => {
      const d = JSON.parse((e as MessageEvent).data) as { sku: string; available: number };
      push({ kind: "inventory", text: `${d.sku} · ${d.available} available`, at: Date.now() });
      qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
    });
    return () => {
      orders.close();
      stock.close();
    };
  }, [qc]);

  return { feed, live };
}
