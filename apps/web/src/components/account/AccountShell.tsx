"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "../ui/States";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/measurements", label: "Measurements" },
  { href: "/account/passports", label: "Digital passports" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/payment", label: "Payment" },
  { href: "/account/preferences", label: "Preferences" },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="container-x pt-16" aria-busy="true">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="mt-12 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container-x pt-12 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-meta text-muted">Account</p>
          <h1 className="t-h1 mt-3">Hello, {user.name.split(" ")[0]}.</h1>
        </div>
        <div className="flex items-center gap-6 text-[13px]">
          {user.role === "admin" && (
            <Link href="/admin" className="link-underline">
              Admin console
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <nav aria-label="Account" className="no-scrollbar -mx-4 overflow-x-auto border-y border-line px-4 lg:mx-0 lg:border-0 lg:px-0">
          <ul className="flex gap-6 py-4 lg:flex-col lg:gap-3 lg:py-0">
            {NAV.map((n) => {
              const active = n.href === "/account" ? pathname === "/account" : pathname.startsWith(n.href);
              return (
                <li key={n.href} className="shrink-0">
                  <Link href={n.href} aria-current={active ? "page" : undefined} className={`text-[14px] transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink pb-4">
      <h2 className="t-h3">{children}</h2>
      {action}
    </div>
  );
}
