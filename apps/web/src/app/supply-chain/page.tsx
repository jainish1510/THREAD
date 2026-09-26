import type { Metadata } from "next";
import { SupplyChainExplorer } from "@/components/transparency/SupplyChainExplorer";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Supply chain", description: "Trace every THREAD product from raw fibre to your door." };

export default function SupplyChainPage() {
  const products = getProducts().map((p) => ({ slug: p.slug, name: p.name, stages: p.supplyChain }));
  return (
    <div className="container-x pt-12 md:pt-16">
      <p className="t-meta text-muted">Traceability</p>
      <h1 className="t-h1 mt-4">Supply chain</h1>
      <p className="mt-4 max-w-lg text-muted">Material, mill, dye house, factory, warehouse, you. Choose a product and follow it.</p>
      <SupplyChainExplorer products={products} />
    </div>
  );
}
