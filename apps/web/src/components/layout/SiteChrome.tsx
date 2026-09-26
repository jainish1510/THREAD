"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { ProductSummary } from "@/lib/types";
import { SiteHeader } from "./SiteHeader";
import { Footer } from "./Footer";
import { CartDrawer } from "../cart/CartDrawer";

/** Storefront chrome. The admin console and checkout use their own. */
export function SiteChrome({ children, products, hex }: { children: ReactNode; products: ProductSummary[]; hex: Record<string, string> }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return <>{children}</>;
  return (
    <>
      <SiteHeader products={products} hex={hex} />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
