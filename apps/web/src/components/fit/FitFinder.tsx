"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { recommendSize, validateBody, type FitPreference, type FitResult } from "@/lib/fit";
import type { Block } from "@/lib/types";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "thread-measurements";

interface FormState {
  unit: "metric" | "imperial";
  height: string;
  heightIn: string;
  weight: string;
  chest: string;
  waist: string;
  preference: FitPreference;
}

const empty: FormState = { unit: "metric", height: "", heightIn: "", weight: "", chest: "", waist: "", preference: "regular" };

function toMetric(f: FormState) {
  const n = (s: string) => (s.trim() === "" ? null : Number(s));
  if (f.unit === "metric") {
    return { heightCm: n(f.height), weightKg: n(f.weight), chestCm: n(f.chest), waistCm: n(f.waist) };
  }
  const ft = n(f.height) ?? 0;
  const inch = n(f.heightIn) ?? 0;
  const round = (v: number | null, k: number) => (v === null ? null : Math.round(v * k));
  return {
    heightCm: ft || inch ? Math.round((ft * 12 + inch) * 2.54) : null,
    weightKg: round(n(f.weight), 0.4536),
    chestCm: round(n(f.chest), 2.54),
    waistCm: round(n(f.waist), 2.54),
  };
}

/**
 * Personalised fit engine UI: measurements in, recommended size out, with
 * a transparent comparison of body vs garment measurements.
 */
export function FitFinder({
  blockId,
  block,
  productName,
  onSelectSize,
}: {
  blockId: string;
  block: Block;
  productName: string;
  onSelectSize?: (size: string) => void;
}) {
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FitResult | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage after hydration
      if (saved) setForm({ ...empty, ...JSON.parse(saved) });
    } catch {
      /* ignore */
    }
  }, []);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = toMetric(form);
    const problem = validateBody({ heightCm: m.heightCm ?? undefined, weightKg: m.weightKg ?? undefined, chestCm: m.chestCm, waistCm: m.waistCm });
    if (problem) {
      setError(problem);
      setResult(null);
      return;
    }
    setError(null);
    setResult(recommendSize(blockId, block, { heightCm: m.heightCm!, weightKg: m.weightKg!, chestCm: m.chestCm, waistCm: m.waistCm, preference: form.preference }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
    if (user) {
      api("/me/measurements", {
        method: "PUT",
        json: { height_cm: m.heightCm, weight_kg: m.weightKg, chest_cm: m.chestCm, waist_cm: m.waistCm, preferred_fit: form.preference },
      }).catch(() => undefined);
    }
  };

  const imperial = form.unit === "imperial";

  return (
    <div>
      <form onSubmit={submit} noValidate className="space-y-6" aria-describedby={error ? "fit-error" : undefined}>
        <div className="flex gap-6 text-[13px]" role="radiogroup" aria-label="Units">
          {(["metric", "imperial"] as const).map((u) => (
            <label key={u} className={`cursor-pointer pb-1 ${form.unit === u ? "border-b border-ink text-ink" : "text-muted"}`}>
              <input type="radio" name="unit" className="sr-only" checked={form.unit === u} onChange={() => setForm({ ...empty, unit: u, preference: form.preference })} />
              {u === "metric" ? "cm / kg" : "ft / lb"}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {imperial ? (
            <div>
              <span className="field-label">Height</span>
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="fit-ft">Feet</label>
                <input id="fit-ft" inputMode="numeric" className="field-input" placeholder="ft" value={form.height} onChange={set("height")} />
                <label className="sr-only" htmlFor="fit-in">Inches</label>
                <input id="fit-in" inputMode="numeric" className="field-input" placeholder="in" value={form.heightIn} onChange={set("heightIn")} />
              </div>
            </div>
          ) : (
            <Field id="fit-height" label="Height" unit="cm" value={form.height} onChange={set("height")} required />
          )}
          <Field id="fit-weight" label="Weight" unit={imperial ? "lb" : "kg"} value={form.weight} onChange={set("weight")} required />
          <Field id="fit-chest" label="Chest" unit={imperial ? "in" : "cm"} value={form.chest} onChange={set("chest")} hint="Optional" />
          <Field id="fit-waist" label="Waist" unit={imperial ? "in" : "cm"} value={form.waist} onChange={set("waist")} hint="Optional" />
        </div>

        <fieldset>
          <legend className="field-label">Preferred fit</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["fitted", "regular", "relaxed"] as const).map((p) => (
              <label
                key={p}
                className={`grid h-11 cursor-pointer place-items-center border text-[13px] capitalize transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 ${form.preference === p ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}
              >
                <input type="radio" name="pref" className="sr-only" checked={form.preference === p} onChange={() => setForm((f) => ({ ...f, preference: p }))} />
                {p}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p id="fit-error" role="alert" className="field-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block">
          Find my size
        </button>
      </form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.section
            key={`${result.size}-${result.confidence}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 border-t border-ink pt-8"
            aria-live="polite"
            aria-label="Size recommendation"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="t-meta text-muted">Your size</p>
                <p className="mt-2 text-[64px] font-medium leading-none tracking-[-0.04em]">{result.size}</p>
              </div>
              <div className="text-right">
                <p className="t-meta text-muted">Confidence</p>
                <p className="mt-2 text-[28px] font-medium leading-none tracking-[-0.02em] t-num">{Math.round(result.confidence * 100)}%</p>
              </div>
            </div>
            <div className="mt-4 h-px w-full bg-line">
              <motion.div className="h-px origin-left bg-ink" initial={{ scaleX: 0 }} animate={{ scaleX: result.confidence }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
            </div>

            <p className="t-meta mt-8 text-muted">Why?</p>
            <dl className="mt-3 divide-y divide-line">
              {result.reasons.map((r) => (
                <div key={r.label} className="flex justify-between py-2.5 text-[14px]">
                  <dt>{r.label}</dt>
                  <dd className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${r.tone === "ideal" ? "bg-ok" : r.tone === "near" ? "bg-warn" : "bg-danger"}`} aria-hidden="true" />
                    {r.verdict}
                  </dd>
                </div>
              ))}
            </dl>

            <FitComparison result={result} />

            {result.estimated.length > 0 && (
              <p className="mt-4 text-[12px] text-muted">
                We estimated your {result.estimated.join(" and ")} from height and weight. Add {result.estimated.length > 1 ? "them" : "it"} for a more confident match.
              </p>
            )}
            {result.alternative && (
              <p className="mt-2 text-[12px] text-muted">
                Between sizes — consider {result.alternative.size} {result.alternative.note}.
              </p>
            )}
            {onSelectSize && (
              <button type="button" onClick={() => onSelectSize(result.size)} className="btn btn-secondary btn-block mt-8">
                Select {result.size} for the {productName}
              </button>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  id,
  label,
  unit,
  value,
  onChange,
  hint,
  required,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label flex justify-between">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal text-muted">{hint}</span>}
      </label>
      <div className="relative">
        <input id={id} inputMode="decimal" className="field-input pr-12" value={value} onChange={onChange} required={required} aria-required={required} />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">{unit}</span>
      </div>
    </div>
  );
}

/**
 * YOUR MEASUREMENTS → GARMENT MEASUREMENTS → EXPECTED FIT, drawn as a
 * track per measurement: body marker, garment marker, and the ease between.
 */
function FitComparison({ result }: { result: FitResult }) {
  return (
    <div className="mt-8">
      <div className="t-meta grid grid-cols-3 gap-2 text-[10px] text-muted">
        <span>Your body</span>
        <span className="text-center">Garment</span>
        <span className="text-right">Expected fit</span>
      </div>
      <ul className="mt-3 space-y-5">
        {result.comparison.map((row) => {
          const min = Math.min(row.body, row.garment) - 6;
          const max = Math.max(row.body, row.garment) + 6;
          const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
          const reason = result.reasons.find((r) => r.label === row.label || (row.label === "Inseam" && r.label === "Length") || (row.label === "Hip" && r.label === "Seat"));
          return (
            <li key={row.label}>
              <div className="flex justify-between text-[13px]">
                <span className="t-num">
                  {row.label} <span className="text-muted">{row.body} cm</span>
                </span>
                <span className="t-num text-muted">{row.garment} cm</span>
                <span>{reason?.verdict}</span>
              </div>
              <div className="relative mt-2 h-4" aria-hidden="true">
                <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
                <motion.div
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-ink/15"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ left: pos(Math.min(row.body, row.garment)), width: `calc(${pos(Math.max(row.body, row.garment))} - ${pos(Math.min(row.body, row.garment))})` }}
                />
                <motion.span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-paper" initial={{ left: "50%" }} animate={{ left: pos(row.body) }} transition={{ duration: 0.6 }} />
                <motion.span className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-ink" initial={{ left: "50%" }} animate={{ left: pos(row.garment) }} transition={{ duration: 0.6, delay: 0.1 }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-ink" /> You</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-ink" /> Garment</span>
        <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 bg-ink/15" /> Ease</span>
      </p>
    </div>
  );
}
