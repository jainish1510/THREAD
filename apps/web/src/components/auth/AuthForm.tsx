"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, API_URL, type User } from "@/lib/api";
import { validateEmail } from "@/lib/validation";
import { TextField } from "../ui/TextField";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/account";
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => api<{ google: boolean }>("/auth/providers"), staleTime: Infinity, retry: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string | undefined> = { email: validateEmail(values.email) };
    if (mode === "register" && !values.name.trim()) errs.name = "Enter your name.";
    if (!values.password) errs.password = "Enter your password.";
    else if (mode === "register" && values.password.length < 10) errs.password = "Use at least 10 characters.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true);
    setFormError(null);
    try {
      const user = await api<User>(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        json: mode === "login" ? { email: values.email, password: values.password } : values,
      });
      qc.setQueryData(["me"], user);
      router.push(user.role === "admin" && next === "/account" ? "/admin" : next);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.detail)) {
        setErrors(Object.fromEntries((err.detail as { field: string; msg: string }[]).map((d) => [d.field, d.msg])));
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <div className="mx-auto w-full max-w-[400px] py-16 md:py-24">
      <h1 className="t-h1">{mode === "login" ? "Sign in" : "Create account"}</h1>
      <p className="mt-3 text-muted">
        {mode === "login" ? "Your orders, passports and measurements." : "Track orders, save your size, and keep every garment's passport."}
      </p>

      {providers.data?.google && (
        <>
          <a href={`${API_URL}/auth/oauth/google/start`} className="btn btn-secondary btn-block mt-10">
            Continue with Google
          </a>
          <p className="t-meta my-8 flex items-center gap-4 text-[10px] text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </p>
        </>
      )}

      <form onSubmit={submit} noValidate className={`space-y-6 ${providers.data?.google ? "" : "mt-10"}`}>
        {formError && (
          <p role="alert" className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-[14px] text-danger">
            {formError}
          </p>
        )}
        {mode === "register" && <TextField id="name" label="Name" autoComplete="name" required value={values.name} onChange={set("name")} error={errors.name} />}
        <TextField id="email" label="Email" type="email" autoComplete="email" required value={values.email} onChange={set("email")} error={errors.email} />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          hint={mode === "register" ? "At least 10 characters." : undefined}
        />
        <button type="submit" disabled={busy} className="btn btn-primary btn-block">
          {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-8 text-[13px] text-muted">
        {mode === "login" ? (
          <>New to THREAD? <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Sign in</Link></>
        )}
      </p>
      {mode === "login" && (
        <p className="mt-10 border-t border-line pt-6 text-[12px] text-muted">
          Demo admin: <span className="font-mono text-ink">admin@example.com</span> / <span className="font-mono text-ink">thread-admin-2026</span>
        </p>
      )}
    </div>
  );
}
