"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { DataTable } from "./DataTable";

type Row = { sku: string; product: string; color: string; size: string; on_hand: number; reserved: number; available: number };

export function InventoryTable() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const dq = useDeferredValue(q);
  const key = ["admin", "inventory", dq, low];
  const inv = useQuery({ queryKey: key, queryFn: () => api<Row[]>(`/admin/inventory?low=${low}${dq ? `&q=${encodeURIComponent(dq)}` : ""}`) });

  // Optimistic stock edits: the table updates instantly and rolls back on error.
  const save = useMutation({
    mutationFn: ({ sku, on_hand }: { sku: string; on_hand: number }) => api<Row>(`/admin/variants/${sku}`, { method: "PATCH", json: { on_hand } }),
    onMutate: async ({ sku, on_hand }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Row[]>(key);
      qc.setQueryData<Row[]>(key, (rows) => rows?.map((r) => (r.sku === sku ? { ...r, on_hand, available: on_hand - r.reserved } : r)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      setError(e instanceof ApiError ? e.message : "Couldn't update stock.");
    },
    onSuccess: (_d, { sku }) => {
      setError(null);
      setEditing((s) => {
        const next = { ...s };
        delete next[sku];
        return next;
      });
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="w-64">
          <span className="field-label">Search</span>
          <input className="field-input h-10" placeholder="SKU or product" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="flex h-10 items-center gap-2 text-[13px]">
          <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} className="accent-[#1b1b19]" />
          Low stock only (&lt; 5)
        </label>
        {inv.data && <p className="ml-auto text-[12px] text-muted t-num">{inv.data.length} SKUs · updates live</p>}
      </div>
      {error && <p role="alert" className="mb-4 text-[13px] text-danger">{error}</p>}
      <DataTable
        rows={inv.data as unknown as Record<string, unknown>[]}
        loading={inv.isLoading}
        error={!!inv.error}
        onRetry={() => inv.refetch()}
        empty="No SKUs match."
        columns={[
          { key: "sku", label: "SKU", render: (r) => <span className="font-mono text-[12px]">{String(r.sku)}</span> },
          { key: "product", label: "Product" },
          { key: "color", label: "Color", render: (r) => <span className="capitalize">{String(r.color)}</span> },
          { key: "size", label: "Size" },
          { key: "reserved", label: "Reserved", align: "right" },
          {
            key: "available",
            label: "Available",
            align: "right",
            render: (r) => <span className={Number(r.available) === 0 ? "text-danger" : Number(r.available) < 5 ? "text-warn" : ""}>{String(r.available)}</span>,
          },
          {
            key: "on_hand",
            label: "On hand",
            align: "right",
            render: (r) => {
              const sku = String(r.sku);
              const value = editing[sku] ?? String(r.on_hand);
              return (
                <form
                  className="flex justify-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(value);
                    if (Number.isInteger(n) && n >= 0) save.mutate({ sku, on_hand: n });
                    else setError("On-hand must be a whole number.");
                  }}
                >
                  <label className="sr-only" htmlFor={`oh-${sku}`}>On hand for {sku}</label>
                  <input id={`oh-${sku}`} inputMode="numeric" value={value} onChange={(e) => setEditing((s) => ({ ...s, [sku]: e.target.value }))} className="t-num h-8 w-16 border border-line-strong bg-transparent px-2 text-right focus:border-ink focus:outline-none" />
                  {editing[sku] !== undefined && editing[sku] !== String(r.on_hand) && (
                    <button type="submit" className="border border-ink px-2 text-[11px] hover:bg-ink hover:text-paper">Save</button>
                  )}
                </form>
              );
            },
          },
        ]}
      />
    </div>
  );
}
