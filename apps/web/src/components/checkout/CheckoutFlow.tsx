"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/store/cart";
import { api, ApiError, type Address, type Order } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { moneyCents } from "@/lib/format";
import {
  cardBrand,
  formatCardNumber,
  formatExpiry,
  validateAddress,
  validateCard,
  validateEmail,
  type AddressForm,
  type CardForm,
  type Errors,
} from "@/lib/validation";
import { TextField } from "../ui/TextField";
import { EmptyState } from "../ui/States";
import { OrderSummary, type Totals } from "./OrderSummary";
import { StripePayment, type StripeHandle } from "./StripePayment";
import { rememberOrder } from "./recentOrders";

type Step = "information" | "shipping" | "payment" | "review" | "confirmation";
const STEPS: { id: Exclude<Step, "confirmation">; label: string }[] = [
  { id: "information", label: "Information" },
  { id: "shipping", label: "Shipping" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

interface CheckoutResult {
  order: Order;
  access_token: string;
  payment_mode: "stripe" | "test";
  client_secret: string | null;
  reserved_until: string;
}

const COUNTRIES = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["PT", "Portugal"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["AU", "Australia"],
] as const;

const emptyAddress: AddressForm = { name: "", line1: "", line2: "", city: "", region: "", postal_code: "", country: "US" };
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function CheckoutFlow() {
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [step, setStep] = useState<Step>("information");
  const [emailInput, setEmail] = useState<string | null>(null);
  const [infoAttempted, setInfoAttempted] = useState(false);
  const [addressInput, setAddress] = useState<AddressForm | null>(null);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [saveAddress, setSaveAddress] = useState(true);
  const [card, setCard] = useState<CardForm>({ number: "", expiry: "", cvc: "", name: "" });
  const [cardAttempted, setCardAttempted] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const stripeRef = useRef<StripeHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);


  const saved = useQuery({
    queryKey: ["account", "addresses"],
    queryFn: () => api<Address[]>("/me/addresses"),
    enabled: !!user,
  });
  // Until the shopper edits them, contact and address default to their account.
  const email = emailInput ?? user?.email ?? "";
  const defaultAddress = saved.data?.find((a) => a.is_default);
  const address: AddressForm =
    addressInput ??
    (defaultAddress
      ? { name: defaultAddress.name, line1: defaultAddress.line1, line2: defaultAddress.line2 ?? "", city: defaultAddress.city, region: defaultAddress.region, postal_code: defaultAddress.postal_code, country: defaultAddress.country }
      : emptyAddress);
  // Errors appear after the first submit, then update live as fields are corrected.
  const emailError = infoAttempted ? validateEmail(email) : undefined;
  const addressErrors: Errors<keyof AddressForm> = infoAttempted ? validateAddress(address) : {};
  const cardErrors: Errors<keyof CardForm> = cardAttempted ? validateCard(card) : {};

  const items = useMemo(() => lines.map((l) => ({ sku: l.sku, quantity: l.quantity })), [lines]);
  const quote = useQuery({
    queryKey: ["quote", items, method],
    queryFn: () => api<Totals & { lines: { sku: string; available: number; quantity: number }[] }>("/checkout/quote", { method: "POST", json: { items, shipping_method: method } }),
    enabled: items.length > 0 && !paidOrder,
  });
  const shortages = quote.data?.lines.filter((l) => l.available < l.quantity) ?? [];

  // Move focus to the step heading on every step change (screen readers + keyboard).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const cancelPending = useCallback(async () => {
    if (result && !paidOrder) {
      await api(`/checkout/${result.order.number}/cancel?token=${result.access_token}`, { method: "POST" }).catch(() => undefined);
      setResult(null);
    }
  }, [result, paidOrder]);

  const goTo = async (target: Step) => {
    setFormError(null);
    const order: Step[] = ["information", "shipping", "payment", "review"];
    // Editing details before payment releases the held stock; a fresh hold is taken on the way back.
    if (order.indexOf(target) < order.indexOf("payment") && result) await cancelPending();
    setStep(target);
  };

  const submitInformation = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoAttempted(true);
    if (validateEmail(email) || Object.keys(validateAddress(address)).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    goTo("shipping");
  };

  const submitShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await api<CheckoutResult>("/checkout", {
        method: "POST",
        json: {
          email,
          items,
          shipping_method: method,
          save_address: !!user && saveAddress,
          shipping_address: { ...address, line2: address.line2 || null },
        },
      });
      setResult(res);
      setStep("payment");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
      quote.refetch();
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (result?.payment_mode === "test") {
      setCardAttempted(true);
      if (Object.keys(validateCard(card)).length) {
        setFormError("Please check your card details.");
        return;
      }
    }
    setFormError(null);
    setStep("review");
  };

  const placeOrder = async () => {
    if (!result) return;
    setBusy(true);
    setFormError(null);
    try {
      let order: Order;
      if (result.payment_mode === "test") {
        order = await api<Order>(`/checkout/${result.order.number}/pay-test`, {
          method: "POST",
          json: { access_token: result.access_token, card_number: card.number },
        });
      } else {
        const error = await stripeRef.current?.confirm(`${window.location.origin}/orders/${result.order.number}?token=${result.access_token}`);
        if (error) throw new ApiError(402, error);
        order = await waitForPaid(result.order.number, result.access_token);
      }
      rememberOrder(order.number, result.access_token);
      setPaidOrder(order);
      clear();
      setStep("confirmation");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Payment failed. Please try again.");
      if (result.payment_mode === "test") setStep("payment");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) return <div className="min-h-[60vh]" />;
  if (!lines.length && step !== "confirmation") {
    return <EmptyState title="Your bag is empty." body="Add something to check out." action={{ href: "/shop", label: "Explore collection" }} />;
  }

  const totals: Totals | null = result ? result.order : quote.data ?? null;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-20">
      <div>
        {step !== "confirmation" && (
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]" aria-label="Checkout progress">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3">
                {i < stepIndex ? (
                  <button type="button" onClick={() => goTo(s.id)} className="text-ink underline-offset-4 hover:underline">
                    {s.label}
                  </button>
                ) : (
                  <span className={i === stepIndex ? "font-medium text-ink" : "text-muted"} aria-current={i === stepIndex ? "step" : undefined}>
                    {s.label}
                  </span>
                )}
                {i < STEPS.length - 1 && <span className="text-line-strong" aria-hidden="true">—</span>}
              </li>
            ))}
          </ol>
        )}

        {result && !paidOrder && <ReservationTimer until={result.reserved_until} onExpire={() => { setResult(null); setStep("shipping"); setFormError("Your reservation expired. Please continue to hold your items again."); }} />}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="mt-10">
            {formError && (
              <div role="alert" className="mb-8 border-l-2 border-danger bg-danger/5 px-4 py-3 text-[14px] text-danger">
                {formError}
              </div>
            )}
            {shortages.length > 0 && step !== "confirmation" && (
              <div role="alert" className="mb-8 border-l-2 border-warn px-4 py-3 text-[14px]">
                Some items have less stock than you&apos;ve selected. <Link href="/bag" className="underline">Update your bag</Link>.
              </div>
            )}

            {step === "information" && (
              <form onSubmit={submitInformation} noValidate>
                <StepHeading ref={headingRef}>Information</StepHeading>
                {!user && (
                  <p className="mt-2 text-[13px] text-muted">
                    Have an account? <Link href="/login?next=/checkout" className="text-ink underline underline-offset-4">Sign in</Link> for faster checkout.
                  </p>
                )}
                <TextField id="email" label="Email" type="email" autoComplete="email" required className="mt-8" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} hint="For your receipt and order updates." />
                <h3 className="t-meta mt-12">Shipping address</h3>
                {saved.data && saved.data.length > 1 && (
                  <label className="mt-4 block">
                    <span className="field-label">Saved addresses</span>
                    <select
                      className="field-input"
                      onChange={(e) => {
                        const a = saved.data!.find((x) => x.id === Number(e.target.value));
                        if (a) setAddress({ name: a.name, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region, postal_code: a.postal_code, country: a.country });
                      }}
                    >
                      {saved.data.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.line1}, {a.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <AddressFields value={address} onChange={setAddress} errors={addressErrors} />
                <button type="submit" className="btn btn-primary btn-block mt-10 md:w-auto">
                  Continue to shipping
                </button>
              </form>
            )}

            {step === "shipping" && (
              <form onSubmit={submitShipping} noValidate>
                <StepHeading ref={headingRef}>Shipping</StepHeading>
                <Recap
                  rows={[
                    ["Contact", email, "information"],
                    ["Ship to", `${address.line1}, ${address.city}, ${address.region} ${address.postal_code}`, "information"],
                  ]}
                  onEdit={goTo}
                />
                <fieldset className="mt-10">
                  <legend className="t-meta mb-4">Method</legend>
                  <div className="divide-y divide-line border border-line-strong">
                    {[
                      { id: "standard" as const, label: "Standard", eta: "4–6 business days", price: quote.data ? (quote.data.subtotal_cents >= 10000 ? "Free" : "$8") : "" },
                      { id: "express" as const, label: "Express", eta: "1–2 business days", price: "$20" },
                    ].map((m) => (
                      <label key={m.id} className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors ${method === m.id ? "bg-surface/60" : ""}`}>
                        <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4 accent-[#1b1b19]" />
                        <span className="flex-1">
                          <span className="block text-[14px] font-medium">{m.label}</span>
                          <span className="block text-[12px] text-muted">{m.eta} · Carbon-neutral</span>
                        </span>
                        <span className="t-num text-[14px]">{m.price}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {user && (
                  <label className="mt-6 flex items-center gap-3 text-[14px]">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-[#1b1b19]" />
                    Save this address to my account
                  </label>
                )}
                <button type="submit" disabled={busy || shortages.length > 0} className="btn btn-primary btn-block mt-10 md:w-auto">
                  {busy ? "Reserving your items…" : "Continue to payment"}
                </button>
              </form>
            )}

            {step === "payment" && result && (
              <form onSubmit={submitPayment} noValidate>
                <StepHeading ref={headingRef}>Payment</StepHeading>
                <Recap
                  rows={[
                    ["Contact", email, "information"],
                    ["Ship to", `${address.line1}, ${address.city}`, "information"],
                    ["Method", method === "express" ? "Express · 1–2 days" : "Standard · 4–6 days", "shipping"],
                  ]}
                  onEdit={goTo}
                />
                {result.payment_mode === "stripe" && stripeKey && result.client_secret ? (
                  <div className="mt-10">
                    <StripePayment ref={stripeRef} publishableKey={stripeKey} clientSecret={result.client_secret} email={email} />
                    <p className="mt-4 text-[12px] text-muted">Cards, Apple Pay and Google Pay are offered where your device supports them. Payments are processed by Stripe.</p>
                  </div>
                ) : (
                  <TestCardFields card={card} setCard={setCard} errors={cardErrors} />
                )}
                <button type="submit" className="btn btn-primary btn-block mt-10 md:w-auto">
                  Review order
                </button>
              </form>
            )}

            {step === "review" && result && (
              <div>
                <StepHeading ref={headingRef}>Review</StepHeading>
                <Recap
                  rows={[
                    ["Contact", email, "information"],
                    ["Ship to", `${address.name}, ${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.city}, ${address.region} ${address.postal_code}`, "information"],
                    ["Method", method === "express" ? "Express · 1–2 days" : "Standard · 4–6 days", "shipping"],
                    ["Payment", result.payment_mode === "test" ? `${cardBrand(card.number) ?? "Card"} ending ${card.number.replace(/\D/g, "").slice(-4)} (test mode)` : "Stripe", "payment"],
                  ]}
                  onEdit={goTo}
                />
                <button type="button" onClick={placeOrder} disabled={busy} className="btn btn-primary btn-block mt-10 h-14">
                  {busy ? "Placing order…" : `Place order · ${moneyCents(result.order.total_cents)}`}
                </button>
                <p className="mt-4 text-[12px] text-muted">By placing your order you agree to our terms. You can return anything within 30 days.</p>
              </div>
            )}

            {step === "confirmation" && paidOrder && result && (
              <div>
                <p className="t-meta text-muted">Order {paidOrder.number}</p>
                <h1 ref={headingRef} tabIndex={-1} className="t-h1 mt-4 outline-none">
                  Thank you. <span className="t-serif italic">It&apos;s on its way.</span>
                </h1>
                <p className="mt-6 max-w-md text-charcoal">
                  A confirmation has been recorded for {paidOrder.email}. Every piece in your order has its own digital passport — you&apos;ll find them in your account.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link href={`/orders/${paidOrder.number}?token=${result.access_token}`} className="btn btn-primary">
                    Track order
                  </Link>
                  <Link href="/shop" className="btn btn-secondary">
                    Continue shopping
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {step !== "confirmation" && (
        <aside className="order-first border-b border-line pb-10 lg:order-none lg:border-b-0 lg:border-l lg:pb-0 lg:pl-12">
          <OrderSummary lines={lines} totals={totals} pending={quote.isFetching} />
        </aside>
      )}
    </div>
  );
}

async function waitForPaid(number: string, token: string): Promise<Order> {
  // The webhook marks the order paid; poll briefly for it.
  for (let i = 0; i < 20; i++) {
    const o = await api<Order>(`/orders/${number}?token=${token}`);
    if (o.status !== "pending_payment") return o;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return api<Order>(`/orders/${number}?token=${token}`);
}

const StepHeading = forwardRef<HTMLHeadingElement, { children: React.ReactNode }>(function StepHeading({ children }, ref) {
  return (
    <h1 ref={ref} tabIndex={-1} className="t-h2 outline-none">
      {children}
    </h1>
  );
});

function Recap({ rows, onEdit }: { rows: [string, string, Step][]; onEdit: (s: Step) => void }) {
  return (
    <dl className="mt-8 divide-y divide-line border border-line text-[14px]">
      {rows.map(([k, v, target]) => (
        <div key={k} className="grid grid-cols-[88px_1fr_auto] items-baseline gap-4 px-5 py-3">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 truncate">{v}</dd>
          <dd>
            <button type="button" onClick={() => onEdit(target)} className="text-[12px] underline underline-offset-4">
              Change<span className="sr-only"> {k.toLowerCase()}</span>
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AddressFields({ value, onChange, errors }: { value: AddressForm; onChange: (a: AddressForm) => void; errors: Errors<keyof AddressForm> }) {
  const set = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      <TextField id="name" label="Full name" autoComplete="name" required className="col-span-2" value={value.name} onChange={set("name")} error={errors.name} />
      <TextField id="line1" label="Address" autoComplete="address-line1" required className="col-span-2" value={value.line1} onChange={set("line1")} error={errors.line1} />
      <TextField id="line2" label="Apartment, suite (optional)" autoComplete="address-line2" className="col-span-2" value={value.line2} onChange={set("line2")} />
      <TextField id="city" label="City" autoComplete="address-level2" required className="col-span-2 md:col-span-1" value={value.city} onChange={set("city")} error={errors.city} />
      <TextField id="region" label={value.country === "US" ? "State" : "Region"} autoComplete="address-level1" required className="md:col-span-1" value={value.region} onChange={set("region")} error={errors.region} />
      <TextField id="postal" label={value.country === "US" ? "ZIP code" : "Postal code"} autoComplete="postal-code" required inputMode={value.country === "US" ? "numeric" : "text"} value={value.postal_code} onChange={set("postal_code")} error={errors.postal_code} />
      <div className="col-span-2">
        <label htmlFor="country" className="field-label">Country</label>
        <select id="country" autoComplete="country" className="field-input" value={value.country} onChange={set("country")} aria-invalid={errors.country ? true : undefined}>
          {COUNTRIES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TestCardFields({ card, setCard, errors }: { card: CardForm; setCard: (c: CardForm) => void; errors: Errors<keyof CardForm> }) {
  const brand = cardBrand(card.number);
  return (
    <div className="mt-10">
      <div className="mb-6 border border-dashed border-line-strong px-4 py-3 text-[13px]">
        <p className="t-meta text-[10px] text-accent">Test mode · prototype payment</p>
        <p className="mt-1 text-muted">
          Stripe isn&apos;t configured for this environment, so no real payment is taken. Use <span className="font-mono text-ink">4242 4242 4242 4242</span>, any future
          date and any CVC. <span className="font-mono text-ink">4000 0000 0000 0002</span> simulates a decline.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField id="cc-number" label="Card number" inputMode="numeric" autoComplete="cc-number" required className="col-span-2" value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} error={errors.number} trailing={brand ?? undefined} />
        <TextField id="cc-exp" label="Expiry" placeholder="MM / YY" inputMode="numeric" autoComplete="cc-exp" required value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} error={errors.expiry} />
        <TextField id="cc-cvc" label="Security code" inputMode="numeric" autoComplete="cc-csc" required value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} error={errors.cvc} />
        <TextField id="cc-name" label="Name on card" autoComplete="cc-name" required className="col-span-2" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} error={errors.name} />
      </div>
    </div>
  );
}

function ReservationTimer({ until, onExpire }: { until: string; onExpire: () => void }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(until).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [until, onExpire]);
  const m = Math.max(0, Math.floor(left / 60000));
  const s = Math.max(0, Math.floor((left % 60000) / 1000));
  return (
    <p className="mt-6 flex items-center gap-2 text-[12px] text-muted" role="timer" aria-live="off">
      <span className="h-1.5 w-1.5 rounded-full bg-ok live-dot" aria-hidden="true" />
      Your items are reserved for <span className="t-num text-ink">{m}:{String(s).padStart(2, "0")}</span>
    </p>
  );
}
