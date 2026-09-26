"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, moneyCents } from "@/lib/format";
import { DataTable } from "./DataTable";

const STATUSES = ["", "pending_payment", "paid", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];
const NEXT_LABEL: Record<string, string> = {
  paid: "Mark paid",
  preparing: "Prepare",
  shipped: "Ship",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancel",
  refunded: "Refund",
};

type Row = Record<string, unknown>;

export function OrdersTable({ pipeline = false }: { pipeline?: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [realOnly, setRealOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dq = useDeferredValue(q);

  const orders = useQuery({
    queryKey: ["admin", "orders", status, dq, realOnly],
    queryFn: () => api<{ total: number; orders: Row[] }>(`/admin/orders?limit=100&include_simulated=${!realOnly}${status ? `&status=${status}` : ""}${dq ? `&q=${encodeURIComponent(dq)}` : ""}`),
    enabled: !pipeline,
  });
  const shipping = useQuery({ queryKey: ["admin", "shipping"], queryFn: () => api<Row[]>("/admin/shipping"), enabled: pipeline });

  const advance = useMutation({
    mutationFn: ({ number, to }: { number: string; to: string }) => api(`/admin/orders/${number}/advance`, { method: "POST", json: { status: to } }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Update failed."),
  });

  const actions = (r: Row) => (
    <div className="flex justify-end gap-2">
      {(r.next as string[]).filter((n) => !(pipeline && (n === "cancelled" || n === "refunded"))).map((n) => (
        <button
          key={n}
          type="button"
          disabled={advance.isPending}
          onClick={() => advance.mutate({ number: String(r.number), to: n })}
          className={`whitespace-nowrap border px-2.5 py-1 text-[11px] transition-colors ${n === "cancelled" || n === "refunded" ? "border-line-strong text-muted hover:border-danger hover:text-danger" : "border-ink hover:bg-ink hover:text-paper"}`}
        >
          {NEXT_LABEL[n] ?? n}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {!pipeline && (
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <label className="w-64">
            <span className="field-label">Search</span>
            <input className="field-input h-10" placeholder="Order number or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            <span className="field-label">Status</span>
            <select className="field-input h-10 w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replaceAll("_", " ") : "All"}</option>)}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 text-[13px]">
            <input type="checkbox" checked={realOnly} onChange={(e) => setRealOnly(e.target.checked)} className="accent-[#1b1b19]" />
            Hide simulated history
          </label>
          {orders.data && <p className="ml-auto text-[12px] text-muted t-num">{orders.data.total.toLocaleString()} orders</p>}
        </div>
      )}
      {error && <p role="alert" className="mb-4 text-[13px] text-danger">{error}</p>}
      {pipeline ? (
        <DataTable
          rows={shipping.data}
          loading={shipping.isLoading}
          error={!!shipping.error}
          empty="Nothing waiting to ship."
          columns={[
            { key: "number", label: "Order", render: (r) => <span className="font-mono text-[12px]">{String(r.number)}</span> },
            { key: "status", label: "Status", render: (r) => String(r.status).replaceAll("_", " ") },
            { key: "method", label: "Method" },
            { key: "destination", label: "Destination" },
            { key: "age_hours", label: "Age", align: "right", render: (r) => `${r.age_hours}h` },
            { key: "next", label: "", align: "right", render: actions },
          ]}
        />
      ) : (
        <DataTable
          rows={orders.data?.orders}
          loading={orders.isLoading}
          error={!!orders.error}
          onRetry={() => orders.refetch()}
          empty="No orders match."
          columns={[
            { key: "number", label: "Order", render: (r) => <span className="font-mono text-[12px]">{String(r.number)}</span> },
            { key: "email", label: "Customer" },
            { key: "created_at", label: "Placed", render: (r) => formatDate(String(r.created_at)) },
            { key: "items", label: "Items", align: "right" },
            { key: "total_cents", label: "Total", align: "right", render: (r) => moneyCents(Number(r.total_cents)) },
            { key: "status", label: "Status", render: (r) => <span className="capitalize">{String(r.status).replaceAll("_", " ")}</span> },
            { key: "next", label: "", align: "right", render: actions },
          ]}
        />
      )}
    </div>
  );
}
