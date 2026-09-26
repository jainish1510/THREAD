import Link from "next/link";
import type { Factory } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { GarmentArt } from "../garment/GarmentArt";

/** WHO MADE IT? — a compact factory profile for product pages. */
export function FactorySummary({ factory, hex }: { factory: Factory; hex: string }) {
  return (
    <div className="grid gap-12 md:grid-cols-2 md:gap-16">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#e3ddd1]">
        <FactoryIllustration hex={hex} />
        <p className="t-meta absolute bottom-4 left-4 text-[10px] text-charcoal">
          {factory.city}, {factory.country}
        </p>
      </div>
      <div>
        <p className="t-meta text-muted">{factory.country}</p>
        <p className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em]">{factory.name}</p>
        <p className="mt-4 max-w-md text-charcoal">{factory.story}</p>
        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-8 text-[15px]">
          {[
            ["City", factory.city],
            ["Founded", String(factory.founded)],
            ["Workers", String(factory.workers)],
            ["Specialty", factory.specialty],
            ["Last audit", formatDate(factory.lastAudit)],
            ["Audit score", `${factory.auditScore} / 100`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="t-meta text-[10px] text-muted">{k}</dt>
              <dd className="mt-1 t-num">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[13px] text-muted">{factory.certifications.join(" · ")}</p>
        <Link href={`/factories/${factory.slug}`} className="btn btn-secondary mt-8">
          Factory profile
        </Link>
      </div>
    </div>
  );
}

/**
 * A quiet architectural still: the workshop's sawtooth roof line with a
 * folded garment on the cutting table. Stands in for photography.
 */
export function FactoryIllustration({ hex, variant = 0 }: { hex: string; variant?: number }) {
  const teeth = 5 + (variant % 3);
  const w = 400 / teeth;
  let roof = "M0,150";
  for (let i = 0; i < teeth; i++) roof += ` L${i * w + w * 0.75},${95 + (variant % 2) * 8} L${(i + 1) * w},${95 + (variant % 2) * 8} L${(i + 1) * w},150`;
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`fl-${variant}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ece7dd" />
          <stop offset="1" stopColor="#d9d1c3" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#fl-${variant})`} />
      <path d={`${roof} L400,300 L0,300 Z`} fill="#cfc6b6" />
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x={i * w + w * 0.78} y={100 + (variant % 2) * 8} width={w * 0.18} height="40" fill="#f4f1ea" opacity={0.8} />
      ))}
      <rect x="0" y="210" width="400" height="90" fill="#c7bdab" />
      <rect x="70" y="196" width="260" height="10" fill="#8f8574" />
      <rect x="80" y="206" width="6" height="60" fill="#8f8574" />
      <rect x="314" y="206" width="6" height="60" fill="#8f8574" />
      <g transform="translate(150 130) scale(0.25)">
        <GarmentArt garment="tee" hex={hex} backdrop="none" />
      </g>
      <g transform="translate(196 138) scale(0.22) rotate(8 200 250)">
        <GarmentArt garment="tee" hex="#efe9dc" backdrop="none" />
      </g>
    </svg>
  );
}
