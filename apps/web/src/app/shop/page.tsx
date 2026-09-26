import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { GridSkeleton } from "@/components/shop/GridSkeleton";
import { getProducts } from "@/lib/catalog";
import { shopProps } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Organic cotton tees, linen shirts, merino knitwear, denim and outerwear — each with a published cost breakdown.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <ShopBrowser {...shopProps(getProducts())} title="Shop all" />
    </Suspense>
  );
}
