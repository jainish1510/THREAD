import type { SVGProps } from "react";

/** A deliberately small, consistent 1.25px-stroke icon set. */
const paths = {
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.6-1.9L20 20",
  bag: "M5 8h14l-1 12H6L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5",
  menu: "M4 8h16M4 16h16",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  arrowDown: "M12 5v14m-5-5 5 5 5-5",
  check: "M5 12.5 10 17l9-10",
  chevron: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  qr: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z",
  filter: "M4 7h10m4 0h2M4 17h2m4 0h10M14 5v4M6 15v4",
  ruler: "M3 15 15 3l6 6L9 21l-6-6Zm4-1 2 2m1-5 2 2m1-5 2 2",
  pin: "M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      <path d={paths[name]} fill={name === "qr" ? "currentColor" : "none"} stroke={name === "qr" ? "none" : "currentColor"} />
    </svg>
  );
}
