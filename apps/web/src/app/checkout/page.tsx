import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" className="text-[17px] font-semibold tracking-[0.28em]" aria-label="THREAD home">
            THREAD
          </Link>
          <Link href="/bag" className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
            Back to bag
          </Link>
        </div>
      </header>
      <main id="main" className="container-x max-w-[1200px] py-10 md:py-16">
        <CheckoutFlow />
      </main>
    </div>
  );
}
