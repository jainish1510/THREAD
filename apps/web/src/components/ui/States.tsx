import Link from "next/link";
import type { ReactNode } from "react";

/** Deliberate empty / error states: one headline, one line, one action. */
export function EmptyState({
  title,
  body,
  action,
  className = "",
}: {
  title: string;
  body: string;
  action?: { href?: string; label: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center py-24 text-center ${className}`}>
      <h2 className="t-meta text-[13px] tracking-[0.1em]">{title}</h2>
      <p className="mt-4 text-muted">{body}</p>
      {action &&
        (action.href ? (
          <Link href={action.href} className="btn btn-primary mt-8">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="btn btn-primary mt-8">
            {action.label}
          </button>
        ))}
    </div>
  );
}

export function ErrorState({ title, body = "Please try again.", onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center py-24 text-center">
      <h2 className="t-meta text-[13px] tracking-[0.1em]">{title}</h2>
      <p className="mt-4 text-muted">{body}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-8">
          Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`t-meta text-muted ${className}`}>{children}</p>;
}
