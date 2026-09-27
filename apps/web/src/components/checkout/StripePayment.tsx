"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
// The "pure" entry defers loading js.stripe.com until loadStripe() is called.
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";
import { useImperativeHandle, useMemo, type RefObject } from "react";

export interface StripeHandle {
  /** Confirms the PaymentIntent. Returns an error message, or null on success. */
  confirm: (returnUrl: string) => Promise<string | null>;
}

const cache = new Map<string, Promise<Stripe | null>>();
function stripeFor(key: string) {
  if (!cache.has(key)) cache.set(key, loadStripe(key));
  return cache.get(key)!;
}

const appearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#1b1b19",
    colorBackground: "#f7f5f0",
    colorText: "#1b1b19",
    colorDanger: "#9b3b2f",
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
    borderRadius: "2px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #cfc8bb", boxShadow: "none", padding: "14px 16px" },
    ".Input:focus": { border: "1px solid #1b1b19", boxShadow: "none" },
    ".Label": { textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "11px", fontWeight: "500" },
  },
};

/** Stripe Payment Element: cards plus Apple Pay / Google Pay where available. */
export function StripePayment({
  publishableKey,
  clientSecret,
  email,
  handleRef,
}: {
  publishableKey: string;
  clientSecret: string;
  email: string;
  /** Passed as a plain prop (not `ref`) so it survives next/dynamic code-splitting. */
  handleRef: RefObject<StripeHandle | null>;
}) {
  const stripe = useMemo(() => stripeFor(publishableKey), [publishableKey]);
  return (
    <Elements stripe={stripe} options={{ clientSecret, appearance }}>
      <Inner handleRef={handleRef} email={email} />
    </Elements>
  );
}

function Inner({ email, handleRef }: { email: string; handleRef: RefObject<StripeHandle | null> }) {
  const stripe = useStripe();
  const elements = useElements();
  useImperativeHandle(handleRef, () => ({
    confirm: async (returnUrl) => {
      if (!stripe || !elements) return "Payment is still loading. Please try again.";
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl, receipt_email: email },
        redirect: "if_required",
      });
      return error ? (error.message ?? "Your payment could not be completed.") : null;
    },
  }));
  return <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />;
}
