"use client";

import { geoEqualEarth, geoPath } from "d3-geo";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
}

const W = 960;
const H = 540;

let landCache: FeatureCollection<Geometry> | null = null;

/** Loads coastlines lazily so the map never blocks first paint. */
function useLand() {
  const [land, setLand] = useState<FeatureCollection<Geometry> | null>(landCache);
  useEffect(() => {
    if (landCache) return;
    let alive = true;
    import("world-atlas/land-110m.json").then((mod) => {
      const topo = (mod.default ?? mod) as unknown as Topology;
      const fc = feature(topo, topo.objects.land!) as unknown as FeatureCollection<Geometry>;
      landCache = fc;
      if (alive) setLand(fc);
    });
    return () => {
      alive = false;
    };
  }, []);
  return land;
}

/**
 * A quiet, token-free world map: land in stone, great-circle routes drawn in
 * sequence, and a highlighted active point. Fits itself to the points shown.
 */
export function WorldMap({
  points,
  route = true,
  activeId,
  onSelect,
  progress,
  className = "",
  label,
}: {
  points: MapPoint[];
  route?: boolean;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** Number of route legs completed (for order tracking). Undefined = all drawn. */
  progress?: number;
  className?: string;
  label: string;
}) {
  const land = useLand();
  const reduce = useReducedMotion();

  const { path, projection } = useMemo(() => {
    const projection = geoEqualEarth();
    const coords = points.map((p) => [p.lng, p.lat] as [number, number]);
    const fitTarget: GeoJSON.MultiPoint = { type: "MultiPoint", coordinates: coords.length ? coords : [[0, 20]] };
    projection.fitExtent(
      [
        [W * 0.14, H * 0.18],
        [W * 0.86, H * 0.82],
      ],
      fitTarget,
    );
    // Never zoom so far in that the map loses its context.
    const maxScale = 900;
    if (projection.scale() > maxScale) {
      const c = projection.invert!([W / 2, H / 2])!;
      projection.scale(maxScale).translate([W / 2, H / 2]).center(c);
    }
    return { path: geoPath(projection).digits(1), projection };
  }, [points]);

  const legs = useMemo(() => {
    const out: { d: string; key: string }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      if (a.lat === b.lat && a.lng === b.lng) continue;
      const d = path({ type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] });
      if (d) out.push({ d, key: `${a.id}-${b.id}` });
    }
    return out;
  }, [points, path]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full ${className}`} role="img" aria-label={label}>
      <rect width={W} height={H} fill="transparent" />
      {land ? (
        <motion.path d={path(land) ?? ""} fill="#e2dccf" stroke="#d6cfbf" strokeWidth={0.6} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      ) : (
        <rect x={0} y={0} width={W} height={H} className="skeleton" opacity={0.4} />
      )}

      {route &&
        legs.map((leg, i) => {
          const drawn = progress === undefined || i < progress;
          return (
            <g key={leg.key}>
              <path d={leg.d} fill="none" stroke="#1b1b19" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="2 4" />
              <motion.path
                d={leg.d}
                fill="none"
                stroke="#1b1b19"
                strokeWidth={1.25}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: drawn ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.3 + i * 0.25, ease: [0.65, 0, 0.35, 1] }}
              />
            </g>
          );
        })}

      {points.map((p, i) => {
        const xy = projection([p.lng, p.lat]);
        if (!xy) return null;
        const active = p.id === activeId;
        const reached = progress === undefined || i <= progress;
        const labelLeft = xy[0] > W * 0.7;
        return (
          <g
            key={p.id}
            transform={`translate(${xy[0].toFixed(1)},${xy[1].toFixed(1)})`}
            onClick={onSelect ? () => onSelect(p.id) : undefined}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            aria-hidden="true"
          >
            {active && (
              <motion.circle r={14} fill="none" stroke="#1b1b19" strokeOpacity={0.35} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} />
            )}
            <circle r={active ? 5 : 3.5} fill={reached ? "#1b1b19" : "#f7f5f0"} stroke="#1b1b19" strokeWidth={1.25} />
            {(active || (points.length <= 4 && !activeId)) && (
              <text
                x={labelLeft ? -12 : 12}
                y={4}
                textAnchor={labelLeft ? "end" : "start"}
                className="fill-ink"
                style={{ fontSize: 12, fontWeight: active ? 600 : 500, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
