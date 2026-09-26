import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracking } from "@/components/orders/OrderTracking";
import { getFactory, getProducts } from "@/lib/catalog";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "Order tracking", robots: { index: false } };

export default async function OrderPage({ params }: PageProps<"/orders/[number]">) {
  const { number } = await params;
  const origins = Object.fromEntries(
    getProducts().map((p) => {
      const f = getFactory(p.factorySlug)!;
      return [p.slug, { city: f.city, country: f.country, lat: f.lat, lng: f.lng }];
    }),
  );
  return (
    <Suspense fallback={<div className="container-x pt-16"><Skeleton className="h-12 w-72" /><Skeleton className="mt-10 h-80 w-full" /></div>}>
      <OrderTracking number={number} origins={origins} />
    </Suspense>
  );
}
