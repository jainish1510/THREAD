import type { PassportData } from "./types";

function month(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The passport record itself — shared by the dialog and the public page. */
export function PassportBody({ data }: { data: PassportData }) {
  const rows: [string, string][] = [
    ["Product", data.product],
    ["Variant", `${data.colorName}${data.size ? ` / ${data.size}` : ""}`],
    ["Production batch", data.batch],
    ["Material", data.material],
    ["Composition", data.composition],
    ["Factory", `${data.factory}, ${data.factoryLocation}`],
    ["Manufactured", month(data.manufactured)],
    ["Certifications", data.certifications.join(" · ")],
    ["Care", data.care],
  ];
  return (
    <div className="px-6 py-6">
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[140px_1fr] gap-4 py-3 text-[14px]">
            <dt className="t-meta pt-0.5 text-[10px] text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[140px_1fr] gap-4 py-3 text-[14px]">
          <dt className="t-meta pt-0.5 text-[10px] text-muted">Quality checks</dt>
          <dd>
            <ul className="grid grid-cols-2 gap-1">
              {data.checks.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span aria-hidden="true">✓</span> {c}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] items-center gap-4 py-3 text-[14px]">
          <dt className="t-meta text-[10px] text-muted">Traceability</dt>
          <dd className="flex items-center gap-3">
            <span className="t-num font-medium">{data.traceability}%</span>
            <span className="h-px flex-1 bg-ink" aria-hidden="true" />
          </dd>
        </div>
      </dl>
    </div>
  );
}
