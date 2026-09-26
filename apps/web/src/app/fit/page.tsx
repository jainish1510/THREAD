import type { Metadata } from "next";
import { FitPage } from "@/components/fit/FitPage";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Find your size", description: "Personalised size recommendations from your measurements." };

export default function Page() {
  const options = catalog.products.map((p) => ({ slug: p.slug, name: p.name, block: p.block }));
  return <FitPage options={options} blocks={catalog.blocks} />;
}
