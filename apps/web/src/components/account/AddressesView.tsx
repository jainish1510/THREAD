"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type Address } from "@/lib/api";
import { validateAddress, type AddressForm, type Errors } from "@/lib/validation";
import { TextField } from "../ui/TextField";
import { EmptyState, ErrorState, Skeleton } from "../ui/States";
import { SectionTitle } from "./AccountShell";

const empty: AddressForm = { name: "", line1: "", line2: "", city: "", region: "", postal_code: "", country: "US" };

export function AddressesView() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["account", "addresses"], queryFn: () => api<Address[]>("/me/addresses") });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddressForm>(empty);
  const [errors, setErrors] = useState<Errors<keyof AddressForm>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["account", "addresses"] });

  const add = useMutation({
    mutationFn: () => api<Address>("/me/addresses", { method: "POST", json: { ...form, line2: form.line2 || null } }),
    onSuccess: () => {
      setAdding(false);
      setForm(empty);
      refresh();
    },
    onError: (e) => setServerError(e instanceof ApiError ? e.message : "Couldn't save."),
  });
  const remove = useMutation({ mutationFn: (id: number) => api(`/me/addresses/${id}`, { method: "DELETE" }), onSettled: refresh });
  const makeDefault = useMutation({ mutationFn: (id: number) => api(`/me/addresses/${id}/default`, { method: "POST" }), onSettled: refresh });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) add.mutate();
  };
  const set = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section>
      <SectionTitle action={!adding && <button type="button" onClick={() => setAdding(true)} className="text-[13px] link-underline">Add address</button>}>Addresses</SectionTitle>
      {adding && (
        <form onSubmit={submit} noValidate className="mt-8 grid grid-cols-2 gap-4 border-b border-line pb-10">
          {serverError && <p role="alert" className="field-error col-span-2">{serverError}</p>}
          <TextField id="a-name" label="Full name" className="col-span-2" value={form.name} onChange={set("name")} error={errors.name} required autoComplete="name" />
          <TextField id="a-line1" label="Address" className="col-span-2" value={form.line1} onChange={set("line1")} error={errors.line1} required autoComplete="address-line1" />
          <TextField id="a-line2" label="Apartment, suite (optional)" className="col-span-2" value={form.line2} onChange={set("line2")} autoComplete="address-line2" />
          <TextField id="a-city" label="City" value={form.city} onChange={set("city")} error={errors.city} required autoComplete="address-level2" />
          <TextField id="a-region" label="State" value={form.region} onChange={set("region")} error={errors.region} required autoComplete="address-level1" />
          <TextField id="a-postal" label="ZIP code" value={form.postal_code} onChange={set("postal_code")} error={errors.postal_code} required autoComplete="postal-code" />
          <div className="col-span-2 mt-2 flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={add.isPending}>{add.isPending ? "Saving…" : "Save address"}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}
      {q.isLoading ? (
        <Skeleton className="mt-8 h-32 w-full" />
      ) : q.error ? (
        <ErrorState title="We couldn't load your addresses." onRetry={() => q.refetch()} />
      ) : !q.data?.length && !adding ? (
        <EmptyState title="No saved addresses." body="Addresses you save at checkout appear here." className="py-16" />
      ) : (
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {q.data?.map((a) => (
            <li key={a.id} className="border border-line p-6">
              {a.is_default && <p className="t-meta mb-3 text-[10px] text-muted">Default</p>}
              <address className="text-[14px] not-italic leading-relaxed">
                {a.name}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{a.city}, {a.region} {a.postal_code}<br />{a.country}
              </address>
              <div className="mt-5 flex gap-5 text-[12px]">
                {!a.is_default && <button type="button" onClick={() => makeDefault.mutate(a.id)} className="underline underline-offset-4">Make default</button>}
                <button type="button" onClick={() => remove.mutate(a.id)} className="text-muted underline underline-offset-4 hover:text-ink">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
