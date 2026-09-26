"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type Measurements } from "@/lib/api";
import { recommendSize, validateBody, type FitPreference } from "@/lib/fit";
import type { Block } from "@/lib/types";
import { TextField } from "../ui/TextField";
import { Skeleton } from "../ui/States";
import { SectionTitle } from "./AccountShell";

export function MeasurementsForm({ teeBlock, jeanBlock }: { teeBlock: Block; jeanBlock: Block }) {
  const q = useQuery({ queryKey: ["account", "measurements"], queryFn: () => api<Measurements>("/me/measurements") });
  if (q.isLoading || !q.data) return <Skeleton className="h-80 w-full" />;
  return <MeasurementsEditor initial={q.data} teeBlock={teeBlock} jeanBlock={jeanBlock} />;
}

function MeasurementsEditor({ initial, teeBlock, jeanBlock }: { initial: Measurements; teeBlock: Block; jeanBlock: Block }) {
  const qc = useQueryClient();
  const [v, setV] = useState({
    height: initial.height_cm?.toString() ?? "",
    weight: initial.weight_kg?.toString() ?? "",
    chest: initial.chest_cm?.toString() ?? "",
    waist: initial.waist_cm?.toString() ?? "",
    pref: initial.preferred_fit as FitPreference,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const num = (s: string) => (s.trim() ? Number(s) : null);
  const body = { heightCm: num(v.height) ?? undefined, weightKg: num(v.weight) ?? undefined, chestCm: num(v.chest), waistCm: num(v.waist) };
  const valid = !validateBody(body);
  const tee = valid ? recommendSize("tee-regular", teeBlock, { heightCm: body.heightCm!, weightKg: body.weightKg!, chestCm: body.chestCm, waistCm: body.waistCm, preference: v.pref }) : null;
  const jean = valid ? recommendSize("bottom-regular", jeanBlock, { heightCm: body.heightCm!, weightKg: body.weightKg!, chestCm: body.chestCm, waistCm: body.waistCm, preference: v.pref }) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateBody(body);
    if (problem) return setError(problem);
    setError(null);
    try {
      const data = await api<Measurements>("/me/measurements", {
        method: "PUT",
        json: { height_cm: body.heightCm, weight_kg: body.weightKg, chest_cm: body.chestCm, waist_cm: body.waistCm, preferred_fit: v.pref },
      });
      qc.setQueryData(["account", "measurements"], data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save.");
    }
  };

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <section>
      <SectionTitle>Measurements</SectionTitle>
      <div className="mt-8 grid gap-12 md:grid-cols-[1fr_280px]">
        <form onSubmit={submit} noValidate className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <TextField id="m-height" label="Height" inputMode="numeric" trailing="cm" value={v.height} onChange={set("height")} required />
            <TextField id="m-weight" label="Weight" inputMode="numeric" trailing="kg" value={v.weight} onChange={set("weight")} required />
            <TextField id="m-chest" label="Chest" inputMode="numeric" trailing="cm" value={v.chest} onChange={set("chest")} hint="Optional" />
            <TextField id="m-waist" label="Waist" inputMode="numeric" trailing="cm" value={v.waist} onChange={set("waist")} hint="Optional" />
          </div>
          <fieldset>
            <legend className="field-label">Preferred fit</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["fitted", "regular", "relaxed"] as const).map((p) => (
                <label key={p} className={`grid h-11 cursor-pointer place-items-center border text-[13px] capitalize has-[:focus-visible]:outline has-[:focus-visible]:outline-1 ${v.pref === p ? "border-ink bg-ink text-paper" : "border-line-strong"}`}>
                  <input type="radio" className="sr-only" name="pref" checked={v.pref === p} onChange={() => setV((x) => ({ ...x, pref: p }))} />
                  {p}
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" className="btn btn-primary">{saved ? "Saved" : "Save measurements"}</button>
        </form>
        <aside className="border-t border-line pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <p className="t-meta text-muted">Your sizes</p>
          {tee && jean ? (
            <dl className="mt-6 space-y-6">
              <div>
                <dt className="text-[13px] text-muted">Tees & shirts</dt>
                <dd className="mt-1 flex items-baseline gap-3"><span className="text-[40px] font-medium leading-none tracking-[-0.03em]">{tee.size}</span><span className="t-num text-[13px] text-muted">{Math.round(tee.confidence * 100)}% confidence</span></dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Denim waist</dt>
                <dd className="mt-1 flex items-baseline gap-3"><span className="text-[40px] font-medium leading-none tracking-[-0.03em]">{jean.size}</span><span className="t-num text-[13px] text-muted">{Math.round(jean.confidence * 100)}% confidence</span></dd>
              </div>
            </dl>
          ) : (
            <p className="mt-6 text-[13px] text-muted">Enter your height and weight to see your sizes.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
