"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "../ui/States";
import { SectionTitle } from "./AccountShell";

interface Prefs {
  newsletter: boolean;
  order_updates: boolean;
  units: "metric" | "imperial";
}

export function PreferencesForm() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["account", "preferences"], queryFn: () => api<Prefs>("/me/preferences") });
  // Optimistic: the toggle flips instantly and rolls back if the save fails.
  const m = useMutation({
    mutationFn: (p: Prefs) => api<Prefs>("/me/preferences", { method: "PUT", json: p }),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ["account", "preferences"] });
      const prev = qc.getQueryData<Prefs>(["account", "preferences"]);
      qc.setQueryData(["account", "preferences"], p);
      return { prev };
    },
    onError: (_e, _p, ctx) => ctx?.prev && qc.setQueryData(["account", "preferences"], ctx.prev),
  });
  if (q.isLoading || !q.data) return <Skeleton className="h-48 w-full" />;
  const p = q.data;
  const toggle = (k: "newsletter" | "order_updates") => m.mutate({ ...p, [k]: !p[k] });

  return (
    <section>
      <SectionTitle>Preferences</SectionTitle>
      <ul className="mt-4 divide-y divide-line">
        {[
          { k: "order_updates" as const, label: "Order updates", body: "Shipping and delivery notifications." },
          { k: "newsletter" as const, label: "The Journal", body: "A monthly note on new pieces and the people who make them." },
        ].map((row) => (
          <li key={row.k} className="flex items-center justify-between gap-6 py-5">
            <div>
              <p id={`${row.k}-label`} className="text-[15px]">{row.label}</p>
              <p className="text-[13px] text-muted">{row.body}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={p[row.k]}
              aria-labelledby={`${row.k}-label`}
              onClick={() => toggle(row.k)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${p[row.k] ? "bg-ink" : "bg-line-strong"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-transform duration-200 ${p[row.k] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </li>
        ))}
        <li className="flex items-center justify-between gap-6 py-5">
          <div>
            <p className="text-[15px]">Units</p>
            <p className="text-[13px] text-muted">For measurements and size guides.</p>
          </div>
          <div className="flex gap-4 text-[13px]" role="radiogroup" aria-label="Units">
            {(["metric", "imperial"] as const).map((u) => (
              <label key={u} className={`cursor-pointer pb-0.5 capitalize ${p.units === u ? "border-b border-ink" : "text-muted"}`}>
                <input type="radio" className="sr-only" checked={p.units === u} onChange={() => m.mutate({ ...p, units: u })} />
                {u}
              </label>
            ))}
          </div>
        </li>
      </ul>
    </section>
  );
}
