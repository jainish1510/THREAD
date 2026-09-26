"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import { NAV } from "./SiteHeader";

/** Full-screen mobile navigation. */
export function MobileMenu({ open, onOpenChange, signedIn }: { open: boolean; onOpenChange: (o: boolean) => void; signedIn: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 flex flex-col bg-paper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
                <div className="container-x flex h-16 items-center justify-between">
                  <Dialog.Close className="-ml-2 grid h-10 w-10 place-items-center" aria-label="Close menu">
                    <Icon name="close" />
                  </Dialog.Close>
                  <span className="text-[17px] font-semibold tracking-[0.28em]">THREAD</span>
                  <span className="w-10" />
                </div>
                <nav aria-label="Mobile" className="container-x flex-1 pt-10">
                  <ul className="space-y-2">
                    {NAV.map((item, i) => (
                      <motion.li
                        key={item.href}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link href={item.href} className="t-h1 block py-1" onClick={() => onOpenChange(false)}>
                          {item.label}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                  <ul className="mt-12 space-y-4 border-t border-line pt-8 text-[15px]">
                    <li><Link href="/search" onClick={() => onOpenChange(false)}>Search</Link></li>
                    <li><Link href={signedIn ? "/account" : "/login"} onClick={() => onOpenChange(false)}>{signedIn ? "Account" : "Sign in"}</Link></li>
                    <li><Link href="/fit" onClick={() => onOpenChange(false)}>Find your size</Link></li>
                    <li><Link href="/bag" onClick={() => onOpenChange(false)}>Bag</Link></li>
                  </ul>
                </nav>
                <p className="container-x t-meta pb-8 text-muted">Clothes with nothing to hide.</p>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
