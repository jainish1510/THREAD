"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Side = "right" | "left" | "bottom" | "full";

const variants: Record<Side, { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition; className: string }> = {
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    className: "right-0 top-0 h-dvh w-full max-w-[440px] border-l border-line",
  },
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
    className: "left-0 top-0 h-dvh w-full max-w-[440px] border-r border-line",
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    className: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[6px] border-t border-line md:inset-x-auto md:right-0 md:top-0 md:bottom-auto md:h-dvh md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-t-0",
  },
  full: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    className: "inset-0",
  },
};

/**
 * Accessible slide-over / bottom sheet built on Radix Dialog (focus trap,
 * escape to close, scroll lock, aria wiring) with motion on top.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  children,
  footer,
  hideHeader = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: Side;
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
}) {
  const reduce = useReducedMotion();
  const v = variants[side];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-ink/25"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={`fixed z-50 flex flex-col bg-paper outline-none ${v.className}`}
                initial={reduce ? { opacity: 0 } : v.initial}
                animate={reduce ? { opacity: 1 } : v.animate}
                exit={reduce ? { opacity: 0 } : v.exit}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={hideHeader ? "sr-only" : "flex h-16 shrink-0 items-center justify-between border-b border-line px-6"}>
                  <Dialog.Title className="t-meta">{title}</Dialog.Title>
                  {description ? (
                    <Dialog.Description className="sr-only">{description}</Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  )}
                  {!hideHeader && (
                    <Dialog.Close className="-mr-2 grid h-10 w-10 place-items-center text-ink/70 transition-colors hover:text-ink" aria-label="Close">
                      <Icon name="close" />
                    </Dialog.Close>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
                {footer && <div className="shrink-0 border-t border-line px-6 py-6">{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
