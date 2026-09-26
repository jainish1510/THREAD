"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import type { ProductSummary } from "@/lib/types";
import { Icon } from "../ui/Icon";
import { MobileMenu } from "./MobileMenu";
import { SearchOverlay } from "./SearchOverlay";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";

export const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/materials", label: "Materials" },
  { href: "/factories", label: "Factories" },
  { href: "/journal", label: "Journal" },
];

export function SiteHeader({ products, hex }: { products: ProductSummary[]; hex: Record<string, string> }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const setCartOpen = useCart((s) => s.setOpen);
  const mounted = useHydrated();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    // Close overlays on navigation (derived during render, not in an effect).
    setLastPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // "/" opens search from anywhere, like a command bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="border-b border-line bg-paper">
        <p className="container-x t-meta flex h-8 items-center justify-center text-[10px] text-muted">
          Free shipping over $100 <span className="mx-3 text-line-strong">/</span> Free returns within 30 days
        </p>
      </div>
      <header
        className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled ? "border-b border-line bg-paper/90 backdrop-blur-md" : "border-b border-transparent bg-paper"
        }`}
      >
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-10">
            <button type="button" onClick={() => setMenuOpen(true)} className="-ml-2 grid h-10 w-10 place-items-center lg:hidden" aria-label="Open menu" aria-expanded={menuOpen}>
              <Icon name="menu" />
            </button>
            <Link href="/" className="hidden text-[17px] font-semibold tracking-[0.28em] lg:block" aria-label="THREAD home">
              THREAD
            </Link>
          </div>

          <Link href="/" className="text-[17px] font-semibold tracking-[0.28em] lg:hidden" aria-label="THREAD home">
            THREAD
          </Link>
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-reveal text-[13px] tracking-[0.02em]" aria-current={isActive(item.href) ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center justify-end gap-1 lg:gap-6">
            <button type="button" onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center lg:flex lg:w-auto lg:gap-2" aria-label="Search">
              <Icon name="search" size={19} />
              <span className="hidden text-[13px] lg:inline">Search</span>
            </button>
            <Link href={user ? (user.role === "admin" ? "/account" : "/account") : "/login"} className="hidden h-10 items-center gap-2 text-[13px] lg:flex">
              <Icon name="account" size={19} />
              <span>{user ? user.name.split(" ")[0] : "Account"}</span>
            </Link>
            <button type="button" onClick={() => setCartOpen(true)} className="-mr-2 flex h-10 items-center gap-2 px-2 text-[13px] lg:mr-0 lg:px-0" aria-label={`Bag, ${mounted ? count : 0} items`}>
              <Icon name="bag" size={19} />
              <span className="hidden lg:inline">Bag</span>
              <span className="t-num min-w-[1ch] text-[12px]" aria-hidden="true">
                {mounted && count > 0 ? count : ""}
              </span>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} signedIn={!!user} />
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} products={products} hex={hex} />
    </>
  );
}
