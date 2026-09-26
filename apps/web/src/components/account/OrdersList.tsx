"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type Order } from "@/lib/api";
import { formatDate, moneyCents } from "@/lib/format";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Confirmed",
  preparing: "Being prepared",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function useOrders() {
  return useQuery({ queryKey: ["account", "orders"], queryFn: () => api<Order[]>("/me/orders") });
}

export function OrdersList({ limit }: { limit?: number }) {
  const q = useOrders();
  if (q.isLoading) return <div className="space-y-3 pt-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (q.error) return <ErrorState title="We couldn't load your orders." onRetry={() => q.refetch()} />;
  const orders = (q.data ?? []).slice(0, limit);
  if (!orders.length) return <EmptyState title="No orders yet." body="When you place an order, it will appear here." action={{ href: "/shop", label: "Explore collection" }} className="py-16" />;
  return (
    <ul className="divide-y divide-line">
      {orders.map((o) => (
        <li key={o.number}>
          <Link href={`/orders/${o.number}`} className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 md:grid-cols-[140px_1fr_160px_100px]">
            <span className="font-mono text-[13px]">{o.number}</span>
            <span className="t-num text-right text-[14px] md:order-last">{moneyCents(o.total_cents)}</span>
            <span className="text-[13px] text-muted">
              {o.items.map((i) => i.product_name).join(", ")}
            </span>
            <span className="flex items-center gap-2 text-[13px]">
              <span className={`h-1.5 w-1.5 rounded-full ${o.status === "delivered" ? "bg-ink" : o.status === "cancelled" || o.status === "refunded" ? "bg-line-strong" : "bg-ok"}`} aria-hidden="true" />
              {STATUS_LABEL[o.status]} <span className="text-muted">· {formatDate(o.created_at)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
