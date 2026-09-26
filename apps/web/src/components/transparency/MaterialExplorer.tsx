import Link from "next/link";
import type { Material } from "@/lib/types";

function Meter({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-4 text-[14px]">
      <dt className="text-muted">{label}</dt>
      <dd className="flex gap-1" aria-label={`${value} out of ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`h-1 flex-1 ${i < value ? "bg-ink" : "bg-line-strong"}`} aria-hidden="true" />
        ))}
      </dd>
      <span className="t-num w-8 text-right text-[12px] text-muted" aria-hidden="true">
        {value}/{max}
      </span>
    </div>
  );
}

/** WHAT IS IT MADE FROM? — composition, origin, certification and feel. */
export function MaterialExplorer({ material, compact = false }: { material: Material; compact?: boolean }) {
  return (
    <div className="grid gap-12 md:grid-cols-2 md:gap-16">
      <div>
        <p className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.03em]">
          {material.composition.map((c) => (
            <span key={c.fibre} className="block">
              {c.percent}% {c.fibre}
            </span>
          ))}
        </p>
        <div className="mt-8 flex h-1.5 w-full" aria-hidden="true">
          {material.composition.map((c, i) => (
            <span key={c.fibre} style={{ width: `${c.percent}%` }} className={i === 0 ? "bg-ink" : i === 1 ? "bg-accent" : "bg-muted"} />
          ))}
        </div>
        <p className="mt-8 max-w-md text-charcoal">{material.description}</p>
        {!compact && (
          <Link href={`/materials#${material.slug}`} className="btn btn-ghost link-underline mt-8 text-[11px]">
            All materials
          </Link>
        )}
      </div>
      <div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <dt className="t-meta text-[10px] text-muted">Origin</dt>
            <dd className="mt-1 text-[15px]">
              {material.originRegion}, {material.origin}
            </dd>
          </div>
          <div>
            <dt className="t-meta text-[10px] text-muted">Certification</dt>
            <dd className="mt-1 text-[15px]">{material.certification}</dd>
          </div>
          <div>
            <dt className="t-meta text-[10px] text-muted">Feel</dt>
            <dd className="mt-1 text-[15px]">{material.feel.join(" / ")}</dd>
          </div>
          <div>
            <dt className="t-meta text-[10px] text-muted">Weight</dt>
            <dd className="mt-1 text-[15px]">{material.weight}</dd>
          </div>
        </dl>
        <dl className="mt-10 space-y-4 border-t border-line pt-8">
          <Meter label="Durability" value={material.durability} />
          <Meter label="Breathability" value={material.breathability} />
          <Meter label="Warmth" value={material.warmth} />
          <Meter label="Stretch" value={material.stretch} />
        </dl>
        <p className="mt-8 text-[13px] text-muted">
          <span className="t-meta mr-2 text-[10px]">Care</span>
          {material.care}
        </p>
      </div>
    </div>
  );
}
