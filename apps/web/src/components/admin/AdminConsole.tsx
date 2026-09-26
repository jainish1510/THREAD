"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Skeleton, ErrorState } from "../ui/States";
import { useAdminLive } from "./useAdmin";
import { Overview } from "./Overview";
import { OrdersTable } from "./OrdersTable";
import { InventoryTable } from "./InventoryTable";
import { DataTable } from "./DataTable";
import { moneyCents, formatDate } from "@/lib/format";

const SECTIONS = [
  { id: "", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "inventory", label: "Inventory" },
  { id: "products", label: "Products" },
  { id: "customers", label: "Customers" },
  { id: "shipping", label: "Shipping" },
  { id: "returns", label: "Returns" },
  { id: "factories", label: "Factories" },
  { id: "materials", label: "Materials" },
  { id: "batches", label: "Production batches" },
];

export function AdminConsole({ section }: { section: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=/admin${section ? `/${section}` : ""}`);
  }, [loading, user, router, section]);

  if (loading || !user) {
    return <div className="p-10"><Skeleton className="h-10 w-48" /><Skeleton className="mt-8 h-64 w-full" /></div>;
  }
  if (user.role !== "admin") {
    return <ErrorState title="Admin access required." body="Your account doesn't have access to the THREAD console." />;
  }

  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="border-b border-line bg-surface/50 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-[0.28em]">THREAD</span>
            <span className="t-meta text-[10px] text-muted">Ops</span>
          </Link>
          <button type="button" className="text-[13px] lg:hidden" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen} aria-controls="admin-nav">
            {current.label} ▾
          </button>
        </div>
        <nav id="admin-nav" aria-label="Admin" className={`${navOpen ? "block" : "hidden"} px-3 pb-4 lg:block`}>
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin${s.id ? `/${s.id}` : ""}`}
                  onClick={() => setNavOpen(false)}
                  aria-current={s.id === current.id ? "page" : undefined}
                  className={`block rounded-[2px] px-3 py-2 text-[13px] transition-colors ${s.id === current.id ? "bg-ink text-paper" : "text-charcoal hover:bg-line/60"}`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t border-line px-3 pt-4 text-[12px] text-muted">
            <p>{user.email}</p>
            <Link href="/" className="mt-2 inline-block underline underline-offset-4 hover:text-ink">View storefront</Link>
          </div>
        </nav>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 md:px-10 md:py-10">
        <Section id={current.id} title={current.label} />
      </main>
    </div>
  );
}

function Section({ id, title }: { id: string; title: string }) {
  const { feed, live } = useAdminLive();
  const header = (right?: ReactNode) => (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="t-h2">{title}</h1>
      <div className="flex items-center gap-6">
        {right}
        <span className="flex items-center gap-2 text-[12px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-ok live-dot" : "bg-line-strong"}`} aria-hidden="true" />
          {live ? "Live" : "Connecting"}
        </span>
      </div>
    </div>
  );

  switch (id) {
    case "":
      return <Overview header={header} feed={feed} />;
    case "orders":
      return <>{header()}<OrdersTable /></>;
    case "inventory":
      return <>{header()}<InventoryTable /></>;
    case "shipping":
      return <>{header()}<OrdersTable pipeline /></>;
    default:
      return <>{header()}<Generic id={id} /></>;
  }
}

type Row = Record<string, unknown>;

const GENERIC: Record<string, { path: string; columns: { key: string; label: string; align?: "right"; render?: (r: Row) => ReactNode }[]; note?: string }> = {
  products: {
    path: "/admin/products",
    columns: [
      { key: "name", label: "Product", render: (r) => <Link href={`/products/${r.slug}`} className="underline-offset-4 hover:underline">{String(r.name)}</Link> },
      { key: "category", label: "Category" },
      { key: "price_cents", label: "Price", align: "right", render: (r) => moneyCents(Number(r.price_cents)) },
      { key: "available", label: "Available", align: "right" },
      { key: "sold_out_variants", label: "Sold-out SKUs", align: "right" },
      { key: "units_sold", label: "Units sold", align: "right" },
      { key: "batch", label: "Batch", render: (r) => <span className="font-mono text-[12px]">{String(r.batch)}</span> },
    ],
  },
  customers: {
    path: "/admin/customers",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "orders", label: "Orders", align: "right" },
      { key: "lifetime_cents", label: "Lifetime value", align: "right", render: (r) => moneyCents(Number(r.lifetime_cents)) },
      { key: "joined", label: "Joined", render: (r) => formatDate(String(r.joined)) },
    ],
    note: "Registered accounts. Simulated historical orders are guest checkouts and don't appear here.",
  },
  returns: {
    path: "/admin/returns",
    columns: [
      { key: "number", label: "Order", render: (r) => <span className="font-mono text-[12px]">{String(r.number)}</span> },
      { key: "email", label: "Customer" },
      { key: "items", label: "Items", render: (r) => (r.items as string[]).join(", ") },
      { key: "total_cents", label: "Refunded", align: "right", render: (r) => moneyCents(Number(r.total_cents)) },
      { key: "updated_at", label: "Date", render: (r) => formatDate(String(r.updated_at)) },
    ],
    note: "Refunded items are restocked automatically.",
  },
  factories: {
    path: "/admin/factories",
    columns: [
      { key: "name", label: "Factory", render: (r) => <Link href={`/factories/${r.slug}`} className="underline-offset-4 hover:underline">{String(r.name)}</Link> },
      { key: "city", label: "Location", render: (r) => `${r.city}, ${r.country}` },
      { key: "workers", label: "Workers", align: "right" },
      { key: "audit_score", label: "Audit", align: "right" },
      { key: "audit_age_days", label: "Last audit", align: "right", render: (r) => <span className={Number(r.audit_age_days) > 300 ? "text-warn" : ""}>{String(r.audit_age_days)} days ago</span> },
      { key: "products", label: "Products", align: "right" },
      { key: "units_sold", label: "Units sold", align: "right" },
    ],
  },
  materials: {
    path: "/admin/materials",
    columns: [
      { key: "name", label: "Material" },
      { key: "origin", label: "Origin" },
      { key: "certification", label: "Certification" },
      { key: "products", label: "Products", align: "right" },
    ],
  },
  batches: {
    path: "/admin/batches",
    columns: [
      { key: "code", label: "Batch", render: (r) => <span className="font-mono text-[12px]">{String(r.code)}</span> },
      { key: "product", label: "Product" },
      { key: "factory", label: "Factory" },
      { key: "units", label: "Units", align: "right" },
      { key: "manufactured", label: "Manufactured" },
      { key: "qc_pass_rate", label: "QC pass", align: "right", render: (r) => `${(Number(r.qc_pass_rate) * 100).toFixed(1)}%` },
      { key: "status", label: "Status" },
    ],
  },
};

function Generic({ id }: { id: string }) {
  const cfg = GENERIC[id];
  const q = useQuery({ queryKey: ["admin", id], queryFn: () => api<Row[]>(cfg!.path), enabled: !!cfg });
  if (!cfg) return <ErrorState title="Unknown section." />;
  return (
    <>
      {cfg.note && <p className="-mt-4 mb-6 text-[13px] text-muted">{cfg.note}</p>}
      <DataTable rows={q.data} loading={q.isLoading} error={!!q.error} onRetry={() => q.refetch()} columns={cfg.columns} empty="Nothing here yet." />
    </>
  );
}
