import { useId, type ReactNode } from "react";
import type { Garment } from "@/lib/types";
import { shapes } from "./geometry";
import { mix, luminance } from "./color";

export type GarmentView = "front" | "back" | "detail" | "fabric";
export type Texture = "jersey" | "rib" | "woven" | "twill" | "denim" | "knit" | "fleece" | "ripstop" | "linen" | "canvas";

interface Props {
  garment: Garment;
  hex: string;
  view?: GarmentView;
  texture?: Texture;
  /** Background tone behind the garment, or "none" for a transparent cut-out. */
  backdrop?: string;
  className?: string;
  title?: string;
}

/**
 * Studio-style product imagery rendered as SVG: colour-accurate for every
 * variant, crisp at any density, and a few KB per image.
 */
export function GarmentArt({ garment, hex, view = "front", texture = "jersey", backdrop = "#ece8e0", className, title }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shape = shapes[garment];
  const light = luminance(hex) > 0.72;
  const seam = mix(hex, light ? "#000000" : "#000000", light ? 0.22 : 0.38);
  const highlight = mix(hex, "#ffffff", light ? 0.5 : 0.14);
  const inner = mix(hex, "#000000", light ? 0.14 : 0.32);
  const topstitch = garment === "jean" ? "#b7864a" : seam;
  const ids = {
    shade: `s${uid}`,
    tex: `t${uid}`,
    clip: `c${uid}`,
    shadow: `d${uid}`,
    vignette: `v${uid}`,
  };

  const viewBox = view === "detail" ? shape.detailBox : "0 0 400 500";
  const flip = view === "back" ? "translate(400 0) scale(-1 1)" : undefined;

  if (view === "fabric") {
    return (
      <svg viewBox="0 0 400 500" className={className} role="img" aria-label={title ?? "Fabric close-up"} preserveAspectRatio="xMidYMid slice">
        <defs>
          <TexturePattern id={ids.tex} texture={texture} hex={hex} scale={3} />
          <linearGradient id={ids.shade} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.16} />
            <stop offset="0.55" stopColor="#fff" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.22} />
          </linearGradient>
        </defs>
        <rect width="400" height="500" fill={hex} />
        <rect width="400" height="500" fill={`url(#${ids.tex})`} />
        {/* A soft fold catching the light. */}
        <path d="M-20,360 C120,300 240,330 420,220 L420,260 C250,370 120,340 -20,410 Z" fill="#000" opacity={0.1} />
        <path d="M-20,350 C120,290 240,320 420,210" stroke="#fff" strokeOpacity={0.18} strokeWidth={6} fill="none" />
        <rect width="400" height="500" fill={`url(#${ids.shade})`} />
      </svg>
    );
  }

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title ?? "Product image"} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={ids.shade} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={light ? 0.35 : 0.14} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={light ? 0.1 : 0.24} />
        </linearGradient>
        <radialGradient id={ids.vignette} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="1" stopColor="#000" stopOpacity={0.05} />
        </radialGradient>
        <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="9" />
          <feOffset dx="0" dy="8" result="blur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.16" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={ids.clip}>
          <path d={shape.body} />
        </clipPath>
        <TexturePattern id={ids.tex} texture={texture} hex={hex} scale={view === "detail" ? 1.2 : 1} />
      </defs>

      {backdrop !== "none" && (
        <>
          <rect x="-50" y="-50" width="500" height="600" fill={backdrop} />
          <rect x="-50" y="-50" width="500" height="600" fill={`url(#${ids.vignette})`} />
        </>
      )}

      <g transform={flip}>
        {shape.behind && <path d={shape.behind} fill={view === "back" ? hex : shape.stand ? mix(hex, "#000000", 0.14) : inner} />}
        <g filter={`url(#${ids.shadow})`}>
          <path d={shape.body} fill={hex} stroke={light ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.2)"} strokeWidth={1} />
        </g>
        <g clipPath={`url(#${ids.clip})`}>
          <rect width="400" height="500" fill={`url(#${ids.tex})`} />
          <Details garment={garment} view={view} seam={seam} topstitch={topstitch} highlight={highlight} inner={inner} hex={hex} />
          <rect width="400" height="500" fill={`url(#${ids.shade})`} />
        </g>
        <Overlays garment={garment} view={view} seam={seam} hex={hex} highlight={highlight} inner={inner} />
      </g>
    </svg>
  );
}

interface DetailProps {
  garment: Garment;
  view: GarmentView;
  seam: string;
  topstitch: string;
  highlight: string;
  inner: string;
  hex: string;
}

const stitch = { strokeDasharray: "3 3", strokeWidth: 1, fill: "none" } as const;

/** Seams, stitching and construction details drawn inside the garment. */
function Details({ garment, view, seam, topstitch, inner }: DetailProps): ReactNode {
  const back = view === "back";
  switch (garment) {
    case "tee":
    case "longsleeve":
      return (
        <g stroke={seam}>
          <path d="M112,108 L125,166 M288,108 L275,166" strokeOpacity={0.4} fill="none" />
          <path d="M129,408 Q165,412 200,412 Q235,412 271,408" {...stitch} strokeOpacity={0.55} />
          {garment === "tee" ? (
            <path d="M72,190 L104,207 M328,190 L296,207" {...stitch} strokeOpacity={0.55} />
          ) : (
            <g>
              <rect x="66" y="356" width="36" height="30" fill={inner} fillOpacity={0.25} stroke="none" transform="rotate(4 84 371)" />
              <rect x="298" y="356" width="36" height="30" fill={inner} fillOpacity={0.25} stroke="none" transform="rotate(-4 316 371)" />
            </g>
          )}
        </g>
      );
    case "tank":
      return (
        <g stroke={seam}>
          <path d="M128,420 Q165,424 200,424 Q235,424 272,420" {...stitch} strokeOpacity={0.5} />
        </g>
      );
    case "shirt":
    case "campshirt": {
      const top = garment === "shirt" ? 112 : 176;
      const bottom = garment === "shirt" ? 446 : 424;
      const buttons = [];
      for (let y = top + 40; y < bottom - 20; y += 52) buttons.push(y);
      return (
        <g>
          <path d={`M106,100 L124,168 M294,100 L276,168`} stroke={seam} strokeOpacity={0.35} fill="none" />
          {!back && (
            <g>
              <path d={`M192,${top} L192,${bottom} M208,${top} L208,${bottom}`} stroke={seam} {...stitch} strokeOpacity={0.5} />
              {buttons.map((y) => (
                <g key={y}>
                  <circle cx="200" cy={y} r="4.2" fill={mix("#efe8da", inner, 0.25)} stroke={seam} strokeOpacity={0.35} strokeWidth={0.8} />
                  <circle cx="199" cy={y - 0.8} r="0.7" fill={seam} opacity={0.6} />
                  <circle cx="201" cy={y + 0.8} r="0.7" fill={seam} opacity={0.6} />
                </g>
              ))}
              {garment === "shirt" && (
                <path d="M138,176 L176,176 L176,214 L157,222 L138,214 Z" stroke={seam} strokeOpacity={0.45} {...stitch} />
              )}
            </g>
          )}
          {back && <path d="M110,142 Q200,150 290,142" stroke={seam} strokeOpacity={0.4} fill="none" />}
          {garment === "shirt" ? (
            <g stroke={seam} strokeOpacity={0.4} fill="none">
              <path d="M64,356 L98,362 M336,356 L302,362" />
            </g>
          ) : (
            <path d="M78,198 L112,214 M322,198 L288,214" stroke={seam} {...stitch} strokeOpacity={0.5} />
          )}
        </g>
      );
    }
    case "sweater":
    case "hoodie": {
      const hemTop = garment === "sweater" ? 398 : 402;
      return (
        <g>
          <rect x="100" y={hemTop} width="200" height="40" fill={inner} fillOpacity={0.12} />
          <RibLines x1={124} x2={276} y1={hemTop} y2={hemTop + 36} color={seam} />
          <path d={`M106,106 L124,176 M294,106 L276,176`} stroke={seam} strokeOpacity={0.3} fill="none" />
          {garment === "hoodie" && !back && (
            <path d="M150,300 L250,300 L264,382 L136,382 Z" fill="none" stroke={seam} strokeOpacity={0.45} strokeWidth={1.2} />
          )}
          {garment === "hoodie" && !back && <path d="M150,300 L136,382 M250,300 L264,382" stroke={seam} {...stitch} strokeOpacity={0.4} />}
        </g>
      );
    }
    case "jacket":
      return (
        <g>
          <path d="M100,100 L120,174 M300,100 L280,174" stroke={seam} strokeOpacity={0.35} fill="none" />
          {!back && (
            <g>
              <path d="M200,124 L200,432" stroke={seam} strokeOpacity={0.5} />
              <path d="M206,124 L206,432" stroke={seam} {...stitch} strokeOpacity={0.45} />
              {[170, 230, 290, 350, 410].map((y) => (
                <circle key={y} cx="196" cy={y} r="4.6" fill={mix(hexOr(inner), "#3b2d22", 0.6)} opacity={0.85} />
              ))}
              {[
                [134, 168, 44, 50],
                [222, 168, 44, 50],
                [128, 298, 56, 66],
                [216, 298, 56, 66],
              ].map(([x, y, w, h]) => (
                <g key={`${x}-${y}`}>
                  <rect x={x} y={y} width={w} height={h} fill={inner} fillOpacity={0.08} stroke={seam} strokeOpacity={0.5} />
                  <rect x={x! + 3} y={y! + 3} width={w! - 6} height={h! - 6} stroke={seam} {...stitch} strokeOpacity={0.4} />
                </g>
              ))}
            </g>
          )}
          <path d="M122,420 L278,420" stroke={seam} {...stitch} strokeOpacity={0.4} />
        </g>
      );
    case "parka":
      return (
        <g>
          {[150, 200, 250, 300, 350, 400].map((y) => (
            <path key={y} d={`M40,${y} Q200,${y + 10} 360,${y}`} stroke={seam} strokeOpacity={0.35} fill="none" strokeWidth={1.2} />
          ))}
          {[150, 200, 250, 300, 350, 400].map((y) => (
            <path key={`h${y}`} d={`M40,${y + 4} Q200,${y + 14} 360,${y + 4}`} stroke="#fff" strokeOpacity={0.08} fill="none" strokeWidth={6} />
          ))}
          {!back && (
            <g>
              <path d="M200,110 L200,448" stroke={seam} strokeWidth={3} strokeOpacity={0.55} />
              <path d="M200,110 L200,448" stroke="#fff" strokeOpacity={0.15} strokeDasharray="1 3" />
              <path d="M128,300 L182,300 L182,316 L128,316 Z M218,300 L272,300 L272,316 L218,316 Z" fill={inner} fillOpacity={0.35} />
            </g>
          )}
        </g>
      );
    case "trouser":
    case "jean":
    case "sweatpant":
    case "short": {
      const top = garment === "short" ? 80 : garment === "sweatpant" ? 56 : garment === "jean" ? 60 : 58;
      const band = garment === "sweatpant" || garment === "short" ? 26 : 20;
      return (
        <g>
          <rect x="100" y={top} width="200" height={band} fill={inner} fillOpacity={0.14} />
          <path d={`M110,${top + band} L290,${top + band}`} stroke={topstitch} strokeOpacity={0.6} {...stitch} />
          {(garment === "sweatpant" || garment === "short") && (
            <g>
              {Array.from({ length: 30 }, (_, i) => 128 + i * 5).map((x) => (
                <path key={x} d={`M${x},${top + 3} L${x + 1},${top + band - 3}`} stroke={topstitch} strokeOpacity={0.18} />
              ))}
              {!back && <path d={`M196,${top + band - 4} Q192,${top + band + 40} 186,${top + band + 64} M204,${top + band - 4} Q210,${top + band + 36} 214,${top + band + 58}`} stroke={mix(hexOr(inner), "#f2eee6", 0.55)} strokeWidth={3} strokeLinecap="round" fill="none" />}
            </g>
          )}
          {(garment === "trouser" || garment === "jean") && (
            <g>
              {[134, 170, 230, 266].map((x) => (
                <rect key={x} x={x} y={top - 1} width="5" height={band + 6} fill={inner} fillOpacity={0.35} />
              ))}
              {!back && <path d={`M200,${top + band} L200,176 M212,${top + band} L212,160 Q212,172 200,178`} stroke={topstitch} strokeOpacity={0.6} {...stitch} />}
            </g>
          )}
          {garment === "trouser" && !back && (
            <g stroke={seam} strokeOpacity={0.45} fill="none">
              <path d="M126,80 L150,136 M274,80 L250,136" />
              <path d="M164,78 L160,210 M236,78 L240,210" strokeOpacity={0.25} />
              <path d="M150,230 L148,460 M250,230 L252,460" strokeOpacity={0.14} />
            </g>
          )}
          {garment === "jean" && !back && (
            <g fill="none">
              <path d="M126,82 Q140,128 172,82 M274,82 Q260,128 228,82" stroke={topstitch} strokeOpacity={0.7} {...stitch} />
              <path d="M240,86 L262,86 L262,104 L240,104" stroke={topstitch} strokeOpacity={0.6} {...stitch} />
              {[
                [172, 84],
                [228, 84],
                [128, 84],
                [272, 84],
              ].map(([x, y]) => (
                <circle key={`${x}`} cx={x} cy={y} r="2" fill="#b58a55" />
              ))}
            </g>
          )}
          {garment === "jean" && back && (
            <g stroke={topstitch} strokeOpacity={0.7} {...stitch}>
              <path d="M136,120 L186,120 L184,176 L161,188 L138,176 Z M264,120 L214,120 L216,176 L239,188 L262,176 Z" />
            </g>
          )}
          {garment !== "short" && garment !== "sweatpant" && (
            <path d="M110,452 L186,452 M214,452 L290,452" stroke={topstitch} strokeOpacity={0.55} {...stitch} />
          )}
          {garment === "sweatpant" && (
            <g>
              <rect x="120" y="436" width="66" height="30" fill={inner} fillOpacity={0.14} />
              <rect x="214" y="436" width="66" height="30" fill={inner} fillOpacity={0.14} />
              <RibLines x1={128} x2={182} y1={438} y2={464} color={seam} />
              <RibLines x1={218} x2={272} y1={438} y2={464} color={seam} />
            </g>
          )}
          {garment === "short" && <path d="M100,362 L188,376 M300,362 L212,376" stroke={seam} strokeOpacity={0.5} {...stitch} />}
        </g>
      );
    }
    default:
      return null;
  }
}

/** Collars, ribs and other pieces that sit on top of the body outline. */
function Overlays({ garment, view, seam, hex, inner }: Omit<DetailProps, "topstitch">): ReactNode {
  const back = view === "back";
  switch (garment) {
    case "tee":
    case "longsleeve":
    case "sweater":
      if (back) return <path d="M166,94 C180,104 220,104 234,94" stroke={seam} strokeOpacity={0.45} strokeWidth={garment === "sweater" ? 9 : 6} fill="none" />;
      return (
        <g fill="none">
          <path
            d={garment === "sweater" ? "M166,92 C170,116 230,116 234,92" : "M163,94 C168,121 232,121 237,94"}
            stroke={mix(hex, "#000", 0.08)}
            strokeWidth={garment === "sweater" ? 11 : 7}
          />
          <path
            d={garment === "sweater" ? "M166,92 C170,116 230,116 234,92" : "M163,94 C168,121 232,121 237,94"}
            stroke={seam}
            strokeOpacity={0.35}
            strokeWidth={garment === "sweater" ? 11 : 7}
            strokeDasharray={garment === "sweater" ? "1 2.2" : "0.6 1.6"}
          />
        </g>
      );
    case "tank":
      return (
        <g fill="none" stroke={mix(hex, "#000", 0.1)} strokeWidth={4}>
          <path d="M160,88 C164,126 178,150 200,150 C222,150 236,126 240,88" />
          <path d="M140,86 C140,130 132,170 124,186 M260,86 C260,130 268,170 276,186" />
        </g>
      );
    case "shirt":
      if (back) return <path d="M158,86 C178,76 222,76 242,86" stroke={seam} strokeOpacity={0.4} strokeWidth={10} fill="none" />;
      return (
        <g stroke={seam} strokeOpacity={0.45} strokeWidth={0.9}>
          <path d="M158,84 C174,96 190,104 200,112 L186,146 C176,124 164,108 150,100 Z" fill={mix(hex, "#fff", 0.04)} />
          <path d="M242,84 C226,96 210,104 200,112 L214,146 C224,124 236,108 250,100 Z" fill={mix(hex, "#fff", 0.04)} />
          <circle cx="182" cy="136" r="2.2" fill={inner} stroke="none" />
          <circle cx="218" cy="136" r="2.2" fill={inner} stroke="none" />
        </g>
      );
    case "campshirt":
      if (back) return <path d="M158,86 C178,78 222,78 242,86" stroke={seam} strokeOpacity={0.4} strokeWidth={8} fill="none" />;
      return (
        <g stroke={seam} strokeOpacity={0.45} strokeWidth={0.9}>
          <path d="M160,84 L198,176 L176,152 L144,106 Z" fill={mix(hex, "#fff", 0.05)} />
          <path d="M240,84 L202,176 L224,152 L256,106 Z" fill={mix(hex, "#fff", 0.05)} />
        </g>
      );
    case "hoodie":
      if (back) return <path d="M150,108 C140,46 176,28 200,28 C224,28 260,46 250,108" stroke={seam} strokeOpacity={0.35} fill="none" />;
      return (
        <g>
          <path d="M170,98 C168,78 182,62 200,62 C218,62 232,78 230,98 C222,116 178,116 170,98 Z" fill={inner} opacity={0.7} />
          <path d="M166,96 C170,122 230,122 234,96" stroke={mix(hex, "#000", 0.1)} strokeWidth={8} fill="none" />
          <path d="M150,108 C142,60 172,34 200,34 C228,34 258,60 250,108" stroke={seam} strokeOpacity={0.25} fill="none" />
        </g>
      );
    case "jacket":
      if (back) return <path d="M156,84 C178,74 222,74 244,84" stroke={seam} strokeOpacity={0.4} strokeWidth={10} fill="none" />;
      return (
        <g stroke={seam} strokeOpacity={0.45} strokeWidth={0.9}>
          <path d="M156,82 C172,96 190,110 200,124 L180,158 C168,134 154,112 140,102 Z" fill={mix(hex, "#000", 0.06)} />
          <path d="M244,82 C228,96 210,110 200,124 L220,158 C232,134 246,112 260,102 Z" fill={mix(hex, "#000", 0.06)} />
        </g>
      );
    case "parka":
      return (
        <g>
          <path d="M170,86 C168,66 182,52 200,52 C218,52 232,66 230,86 C222,102 178,102 170,86 Z" fill={inner} opacity={back ? 0 : 0.7} />
          <path d="M160,84 L164,112 L236,112 L240,84" fill={mix(hex, "#000", 0.08)} stroke={seam} strokeOpacity={0.35} />
        </g>
      );
    default:
      return null;
  }
}

function RibLines({ x1, x2, y1, y2, color }: { x1: number; x2: number; y1: number; y2: number; color: string }) {
  const xs = [];
  for (let x = x1 + 2; x < x2; x += 4) xs.push(x);
  return (
    <g stroke={color} strokeOpacity={0.22} strokeWidth={1}>
      {xs.map((x) => (
        <path key={x} d={`M${x},${y1 + 2} L${x},${y2 - 2}`} />
      ))}
    </g>
  );
}

function hexOr(v: string) {
  return v.startsWith("#") ? v : "#777777";
}

function TexturePattern({ id, texture, hex, scale }: { id: string; texture: Texture; hex: string; scale: number }) {
  const light = luminance(hex) > 0.72;
  const dark = light ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.2)";
  const lite = light ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.07)";
  const s = scale;
  switch (texture) {
    case "rib":
    case "knit":
      return (
        <pattern id={id} width={4 * s} height={6 * s} patternUnits="userSpaceOnUse">
          <path d={`M${1 * s},0 L${2 * s},${3 * s} L${3 * s},0 M${1 * s},${3 * s} L${2 * s},${6 * s} L${3 * s},${3 * s}`} stroke={dark} strokeWidth={0.7 * s} fill="none" />
          <path d={`M0,0 L0,${6 * s}`} stroke={lite} strokeWidth={0.6 * s} />
        </pattern>
      );
    case "twill":
    case "denim":
      return (
        <pattern id={id} width={5 * s} height={5 * s} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d={`M0,${2.5 * s} L${5 * s},${2.5 * s}`} stroke={texture === "denim" ? "rgba(255,255,255,0.13)" : dark} strokeWidth={1.1 * s} />
          <path d={`M0,${0.5 * s} L${5 * s},${0.5 * s}`} stroke={dark} strokeWidth={0.5 * s} />
        </pattern>
      );
    case "woven":
    case "canvas":
    case "linen":
      return (
        <pattern id={id} width={4 * s} height={4 * s} patternUnits="userSpaceOnUse">
          <path d={`M0,${1 * s} L${4 * s},${1 * s}`} stroke={dark} strokeWidth={(texture === "linen" ? 0.9 : 0.6) * s} />
          <path d={`M${3 * s},0 L${3 * s},${4 * s}`} stroke={lite} strokeWidth={0.6 * s} />
          {texture === "linen" && <path d={`M0,${3 * s} L${2 * s},${3 * s}`} stroke={dark} strokeWidth={1.2 * s} />}
        </pattern>
      );
    case "fleece":
      return (
        <pattern id={id} width={3 * s} height={3 * s} patternUnits="userSpaceOnUse">
          <circle cx={1 * s} cy={1 * s} r={0.55 * s} fill={dark} />
          <circle cx={2.4 * s} cy={2.2 * s} r={0.45 * s} fill={lite} />
        </pattern>
      );
    case "ripstop":
      return (
        <pattern id={id} width={8 * s} height={8 * s} patternUnits="userSpaceOnUse">
          <path d={`M0,0 L${8 * s},0 M0,0 L0,${8 * s}`} stroke={lite} strokeWidth={0.8 * s} />
        </pattern>
      );
    case "jersey":
    default:
      return (
        <pattern id={id} width={3 * s} height={4 * s} patternUnits="userSpaceOnUse">
          <path d={`M0,0 L${1.5 * s},${2 * s} L${3 * s},0`} stroke={dark} strokeWidth={0.45 * s} fill="none" />
        </pattern>
      );
  }
}
