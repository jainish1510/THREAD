import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage } from "@/components/search/SearchPage";
import { toCard } from "@/components/product/toCard";
import { getProducts, getSummaries } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search" };

export default function Page() {
  const products = getProducts();
  return (
    <Suspense>
      <SearchPage summaries={getSummaries()} cards={products.map(toCard)} />
    </Suspense>
  );
}
