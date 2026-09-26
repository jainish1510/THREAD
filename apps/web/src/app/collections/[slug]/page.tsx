import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { GridSkeleton } from "@/components/shop/GridSkeleton";
import { getCollection, getCollections, productsInCollection } from "@/lib/catalog";
import { shopProps } from "@/lib/shop";

export function generateStaticParams() {
  return getCollections().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const c = getCollection((await params).slug);
  return c ? { title: c.name, description: c.description } : {};
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const c = getCollection((await params).slug);
  if (!c) notFound();
  return (
    <Suspense fallback={<GridSkeleton />}>
      <ShopBrowser {...shopProps(productsInCollection(c.slug))} title={c.name} />
    </Suspense>
  );
}
