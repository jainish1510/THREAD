"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorldMap, type MapPoint } from "./WorldMap";

export function FactoriesMap({ factories }: { factories: MapPoint[] }) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  return (
    <div>
      <WorldMap points={factories} route={false} activeId={active} onSelect={(id) => router.push(`/factories/${id}`)} label="Map of THREAD factory locations" />
      <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-4 py-3 text-[12px]">
        {factories.map((f) => (
          <li key={f.id}>
            <button type="button" onMouseEnter={() => setActive(f.id)} onFocus={() => setActive(f.id)} onMouseLeave={() => setActive(null)} onClick={() => router.push(`/factories/${f.id}`)} className="text-muted hover:text-ink">
              {f.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
