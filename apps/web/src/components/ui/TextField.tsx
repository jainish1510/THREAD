import type { InputHTMLAttributes, ReactNode } from "react";

/** Labelled input with an accessible, announced error message. */
export function TextField({
  id,
  label,
  error,
  hint,
  className = "",
  trailing,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  trailing?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input id={id} className="field-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
        {trailing && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">{trailing}</span>}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-[12px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
