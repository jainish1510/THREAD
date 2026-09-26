"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useHydrated } from "@/hooks/useHydrated";
import { Icon } from "../ui/Icon";
import { PassportBody } from "./PassportBody";
import type { PassportData } from "./types";

export type { PassportData } from "./types";

/** Renders a QR code for a URL as inline SVG. */
export function QR({ value, size = 132 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, color: { dark: "#1b1b19", light: "#00000000" }, errorCorrectionLevel: "M" }).then(setSvg);
  }, [value]);
  return svg ? (
    <div role="img" aria-label={`QR code linking to ${value}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <div className="skeleton" style={{ width: size, height: size }} aria-hidden="true" />
  );
}

/**
 * The passport opens in two beats: a QR "scan" frame, then the document
 * unfolds beneath it.
 */
export function PassportDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: PassportData }) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const origin = hydrated ? window.location.origin : "";
  const url = `${origin}/passport/${data.sku}`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[90dvh] max-w-[520px] -translate-y-1/2 overflow-y-auto bg-paper outline-none"
                initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0 0 0% 0)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                  <Dialog.Title className="t-meta">THREAD Digital Passport</Dialog.Title>
                  <Dialog.Description className="sr-only">Traceability record for {data.product}, SKU {data.sku}</Dialog.Description>
                  <Dialog.Close className="-mr-2 grid h-9 w-9 place-items-center" aria-label="Close passport">
                    <Icon name="close" size={18} />
                  </Dialog.Close>
                </div>

                <div className="flex items-center gap-6 border-b border-line px-6 py-6">
                  <div className="relative p-3">
                    {/* Scan frame corners */}
                    {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
                      <span key={c} className={`absolute h-4 w-4 border-ink ${c}`} aria-hidden="true" />
                    ))}
                    <QR value={url || `/passport/${data.sku}`} size={96} />
                    {!reduce && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute inset-x-3 h-px bg-accent"
                        initial={{ top: 12, opacity: 1 }}
                        animate={{ top: 108, opacity: 0 }}
                        transition={{ duration: 0.9, delay: 0.25, ease: "easeInOut" }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="t-meta text-[10px] text-muted">SKU</p>
                    <p className="mt-1 break-all font-mono text-[13px]">{data.sku}</p>
                    <p className="mt-3 text-[12px] text-muted">Scan or share this code — the passport travels with the garment, including to its next owner.</p>
                  </div>
                </div>

                <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.45, duration: 0.35 }}>
                  <PassportBody data={data} />
                  <div className="border-t border-line px-6 py-5">
                    <Link href={`/passport/${data.sku}`} className="btn btn-ghost link-underline text-[11px]">
                      Open full passport
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
