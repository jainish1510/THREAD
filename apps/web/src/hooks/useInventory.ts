"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Live inventory for a product. Seeds from the static catalog, then
 * reconciles with the API and subscribes to server-sent events so stock
 * changes (e.g. 42 → 41 when someone checks out) appear without a refresh.
 */
export function useLiveInventory(slug: string, initial: Record<string, number>) {
  const [levels, setLevels] = useState<Record<string, number>>(initial);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [changed, setChanged] = useState<{ sku: string; from: number; to: number } | null>(null);
  const levelsRef = useRef(levels);
  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/inventory/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: { sku: string; available: number }[]) => {
        if (cancelled) return;
        setLevels((prev) => {
          const next = { ...prev };
          for (const row of rows) next[row.sku] = row.available;
          return next;
        });
      })
      .catch(() => !cancelled && setStatus("offline"));

    if (typeof EventSource === "undefined") return;
    const es = new EventSource(`${API_URL}/inventory/stream?product=${encodeURIComponent(slug)}`);
    es.addEventListener("open", () => !cancelled && setStatus("live"));
    es.addEventListener("error", () => !cancelled && setStatus(es.readyState === EventSource.CLOSED ? "offline" : "connecting"));
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    es.addEventListener("inventory", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as { sku: string; available: number };
      const from = levelsRef.current[data.sku];
      if (from !== undefined && from !== data.available) {
        setChanged({ sku: data.sku, from, to: data.available });
        clearTimeout(clearTimer);
        clearTimer = setTimeout(() => setChanged(null), 4000);
      }
      setLevels((prev) => ({ ...prev, [data.sku]: data.available }));
    });
    return () => {
      cancelled = true;
      clearTimeout(clearTimer);
      es.close();
    };
  }, [slug]);

  return { levels, status, changed };
}
