"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type Measurements } from "@/lib/api";
import { OrdersList, useOrders } from "./OrdersList";
import { SectionTitle } from "./AccountShell";

export function AccountOverview() {
  const orders = useOrders();
  const garments = useQuery({ queryKey: ["account", "garments"], queryFn: () => api<unknown[]>("/me/garments") });
  const wishlist = useQuery({ queryKey: ["account", "wishlist"], queryFn: () => api<unknown[]>("/me/wishlist") });
  const measurements = useQuery({ queryKey: ["account", "measurements"], queryFn: () => api<Measurements>("/me/measurements") });
  const hasFit = !!measurements.data?.height_cm;

  const stats = [
    { label: "Orders", value: orders.data?.length, href: "/account/orders" },
    { label: "Garments owned", value: garments.data?.length, href: "/account/passports" },
    { label: "Saved", value: wishlist.data?.length, href: "/account/wishlist" },
  ];

  return (
    <div className="space-y-16">
      <dl className="grid grid-cols-3 border-y border-line">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-6 ${i > 0 ? "border-l border-line pl-6" : ""}`}>
            <dt className="t-meta text-[10px] text-muted">{s.label}</dt>
            <dd className="mt-2 text-[32px] font-medium leading-none tracking-[-0.03em] t-num">
              <Link href={s.href}>{s.value ?? "—"}</Link>
            </dd>
          </div>
        ))}
      </dl>
      <section>
        <SectionTitle action={<Link href="/account/orders" className="text-[13px] link-underline">All orders</Link>}>Recent orders</SectionTitle>
        <OrdersList limit={3} />
      </section>
      <section>
        <SectionTitle>Your fit</SectionTitle>
        <p className="mt-6 max-w-md text-muted">
          {hasFit
            ? `Saved: ${measurements.data!.height_cm} cm, ${measurements.data!.weight_kg} kg, ${measurements.data!.preferred_fit} fit. Every product page will recommend a size.`
            : "Save your measurements once and every product page will recommend your size."}
        </p>
        <Link href="/account/measurements" className="btn btn-secondary mt-6">
          {hasFit ? "Update measurements" : "Add measurements"}
        </Link>
      </section>
    </div>
  );
}
