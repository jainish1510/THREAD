import { SectionTitle } from "@/components/account/AccountShell";

export default function Page() {
  const stripe = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return (
    <section>
      <SectionTitle>Payment</SectionTitle>
      <div className="mt-8 max-w-lg space-y-4 text-[14px] text-charcoal">
        <p>THREAD never stores card numbers. Payments are processed and tokenised by Stripe; Apple Pay and Google Pay are offered at checkout on supported devices.</p>
        <div className="border border-dashed border-line-strong px-5 py-4">
          <p className="t-meta text-[10px] text-accent">Prototype</p>
          <p className="mt-1 text-muted">
            {stripe
              ? "Saved cards require a Stripe Customer to be attached at checkout, which this build does not yet do. Cards are entered securely at each checkout."
              : "Stripe is not configured in this environment, so checkout runs in test mode and no payment methods are saved."}
          </p>
        </div>
      </div>
    </section>
  );
}
