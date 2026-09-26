import type { ReactNode } from "react";
import { ErrorState, Skeleton } from "../ui/States";

type Row = Record<string, unknown>;

export function DataTable({
  rows,
  columns,
  loading,
  error,
  onRetry,
  empty,
  rowKey = (r, i) => String(r.sku ?? r.number ?? r.slug ?? r.code ?? r.id ?? i),
}: {
  rows: Row[] | undefined;
  columns: { key: string; label: string; align?: "right"; render?: (r: Row) => ReactNode }[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty: string;
  rowKey?: (r: Row, i: number) => string;
}) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return <ErrorState title="We couldn't load this data." onRetry={onRetry} />;
  if (!rows?.length) return <p className="border-y border-line py-16 text-center text-[13px] text-muted">{empty}</p>;
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="border-b border-ink text-left">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`t-meta whitespace-nowrap pb-3 pr-4 text-[10px] font-medium text-muted ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="border-b border-line transition-colors hover:bg-surface/50">
              {columns.map((c) => (
                <td key={c.key} className={`py-3 pr-4 align-middle ${c.align === "right" ? "t-num text-right" : ""}`}>
                  {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
