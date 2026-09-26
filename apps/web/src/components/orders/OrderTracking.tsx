"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api, API_URL, ApiError, type Order, type OrderStatus } from "@/lib/api";
import { formatDate, moneyCents } from "@/lib/format";
import { lookupPlace, PLACES } from "@/lib/places";
import { WorldMap, type MapPoint } from "../transparency/WorldMap";
import { ErrorState, Skeleton } from "../ui/States";
import { recentOrders } from "../checkout/recentOrders";
import { useHydrated } from "@/hooks/useHydrated";

const TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "paid", label: "Order confirmed" },
  { status: "preparing", label: "Being prepared" },
  { status: "shipped", label: "Shipped" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];
const RANK: Record<string, number> = { pending_payment: -1, paid: 0, preparing: 1, shipped: 2, out_for_delivery: 3, delivered: 4, refunded: 4, cancelled: -1 };

type Origin = { city: string; country: string; lat: number; lng: number };

export function OrderTracking({ number, origins }: { number: string; origins: Record<string, Origin> }) {
  const params = useSearchParams();
  const qc = useQueryClient();
  const hydrated = useHydrated();
  const token = params.get("token") ?? (hydrated ? (recentOrders().find((o) => o.number === number)?.token ?? null) : null);
  const [live, setLive] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const query = useQuery({
    queryKey: ["order", number, token],
    queryFn: () => api<Order>(`/orders/${number}${qs}`),
    retry: false,
  });

  // Real-time: server-sent events push each status change as it happens.
  useEffect(() => {
    if (!query.data || typeof EventSource === "undefined") return;
    const es = new EventSource(`${API_URL}/orders/${number}/stream${qs}`, { withCredentials: true });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.addEventListener("order", () => {
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2500);
      qc.invalidateQueries({ queryKey: ["order", number] });
    });
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!query.data, number, qs]);

  const order = query.data;

  const points = useMemo<MapPoint[]>(() => {
    if (!order) return [];
    const origin = origins[order.items[0]?.product_slug ?? ""];
    const pts: MapPoint[] = [];
    if (origin) pts.push({ id: "origin", lat: origin.lat, lng: origin.lng, label: origin.city });
    pts.push({ id: "port", lat: PLACES["new york"]![0], lng: PLACES["new york"]![1], label: "New York" });
    pts.push({ id: "warehouse", lat: PLACES.nashville![0], lng: PLACES.nashville![1], label: "Nashville" });
    const dest = lookupPlace(order.shipping_address.city);
    if (dest) pts.push({ id: "you", lat: dest[0], lng: dest[1], label: "You" });
    return pts;
  }, [order, origins]);

  if (query.isLoading) {
    return (
      <div className="container-x pt-16" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 w-72" />
        <Skeleton className="mt-12 h-80 w-full" />
      </div>
    );
  }
  if (query.error || !order) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="container-x">
        <ErrorState
          title={notFound ? "We couldn't find that order." : "We couldn't load this order."}
          body={notFound ? "Check the link in your confirmation, or sign in to see your orders." : "Please try again."}
          onRetry={notFound ? undefined : () => query.refetch()}
        />
      </div>
    );
  }

  const rank = RANK[order.status] ?? -1;
  const eventFor = (s: OrderStatus) => order.events.find((e) => e.status === s);
  const cancelled = order.status === "cancelled";
  const deliveredLeg = rank >= 4 ? 3 : rank >= 2 ? 2.5 : 2;

  return (
    <div className="container-x pt-12 md:pt-16">
      <p className="t-meta flex items-center gap-2 text-muted">
        Order #{order.number}
        <span className="text-line-strong">·</span>
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-ok live-dot" : "bg-line-strong"}`} aria-hidden="true" />
          {live ? "Live" : "Offline"}
        </span>
      </p>
      <h1 className="t-h1 mt-4">
        {cancelled ? "Cancelled" : order.status === "refunded" ? "Refunded" : TIMELINE[Math.max(0, rank)]?.label ?? "Awaiting payment"}
      </h1>
      <AnimatePresence>
        {justUpdated && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[13px] text-accent" role="status">
            Updated just now
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-12 grid gap-16 lg:grid-cols-[360px_1fr]">
        <div>
          <ol className="relative" aria-label="Order progress">
            {TIMELINE.map((t, i) => {
              const done = rank >= i && !cancelled;
              const current = rank === i && !cancelled && order.status !== "delivered";
              const ev = eventFor(t.status);
              return (
                <li key={t.status} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < TIMELINE.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-line-strong" aria-hidden="true">
                      <motion.span className="block w-px origin-top bg-ink" initial={false} animate={{ scaleY: rank > i && !cancelled ? 1 : 0 }} transition={{ duration: 0.5 }} style={{ height: "100%" }} />
                    </span>
                  )}
                  <span
                    className={`relative mt-1.5 grid h-[11px] w-[11px] shrink-0 place-items-center rounded-full border ${done ? "border-ink bg-ink" : "border-line-strong bg-paper"}`}
                    aria-hidden="true"
                  >
                    {current && <span className="absolute h-5 w-5 rounded-full border border-ink/40 live-dot" />}
                  </span>
                  <div>
                    <p className={`text-[15px] ${done ? "text-ink" : "text-muted"} ${current ? "font-medium" : ""}`}>
                      {t.label}
                      <span className="sr-only">{done ? " — complete" : " — pending"}</span>
                    </p>
                    {ev && (
                      <p className="mt-0.5 text-[12px] text-muted">
                        {new Date(ev.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {ev.location ? ` · ${ev.location}` : ""}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-12 border-t border-line pt-8">
            <p className="t-meta text-muted">Journey</p>
            <ol className="mt-4 space-y-1 text-[14px]">
              {points.map((p, i) => (
                <li key={p.id}>
                  <span className={i <= deliveredLeg ? "text-ink" : "text-muted"}>{p.label.toUpperCase()}</span>
                  {i < points.length - 1 && <span className="block pl-6 text-muted" aria-hidden="true">↓</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div>
          <div className="border border-line bg-[#f2efe8]">
            <WorldMap points={points} progress={Math.floor(deliveredLeg)} activeId={rank >= 4 ? "you" : rank >= 2 ? "warehouse" : "warehouse"} label="Map of your order's journey" />
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div>
              <p className="t-meta text-muted">Items</p>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {order.items.map((it) => (
                  <li key={it.sku} className="flex justify-between gap-4 py-3 text-[14px]">
                    <span>
                      <Link href={`/products/${it.product_slug}`} className="font-medium">{it.product_name}</Link>
                      <span className="block text-[12px] text-muted">
                        {it.color} / {it.size} × {it.quantity} ·{" "}
                        <Link href={`/passport/${it.sku}`} className="underline underline-offset-2">Passport</Link>
                      </span>
                    </span>
                    <span className="t-num">{moneyCents(it.unit_price_cents * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 text-[14px]">
                <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="t-num">{order.shipping_cents ? moneyCents(order.shipping_cents) : "Free"}</dd></div>
                <div className="flex justify-between font-medium"><dt>Total</dt><dd className="t-num">{moneyCents(order.total_cents)}</dd></div>
              </dl>
            </div>
            <div>
              <p className="t-meta text-muted">Shipping to</p>
              <address className="mt-4 text-[14px] not-italic leading-relaxed">
                {order.shipping_address.name}
                <br />
                {order.shipping_address.line1}
                {order.shipping_address.line2 && <><br />{order.shipping_address.line2}</>}
                <br />
                {order.shipping_address.city}, {order.shipping_address.region} {order.shipping_address.postal_code}
              </address>
              <p className="mt-6 text-[12px] text-muted">
                Placed {formatDate(order.created_at)} · {order.shipping_method === "express" ? "Express" : "Standard"} shipping
                {order.payment_mode === "test" && " · Test-mode payment"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
