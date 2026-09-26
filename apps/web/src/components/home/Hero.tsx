"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { GarmentArt } from "../garment/GarmentArt";

const ease = [0.22, 1, 0.36, 1] as const;

/** Editorial still life: three pieces laid out as if on a studio floor. */
export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease },
  });
  const settle = (delay: number, rotate: number) => ({
    initial: reduce ? false : { opacity: 0, scale: 1.04, rotate: rotate + 2 },
    animate: { opacity: 1, scale: 1, rotate },
    transition: { duration: 1.1, delay, ease },
  });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[#e7e1d5]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,rgba(255,255,255,0.55),transparent_60%)]" />
      <div className="container-x relative grid min-h-[calc(100dvh-104px)] grid-rows-[1fr_auto] lg:max-h-[900px] lg:min-h-[680px] lg:grid-cols-12 lg:grid-rows-1">
        <div aria-hidden="true" className="relative row-start-1 min-h-[420px] lg:col-span-7 lg:col-start-6 lg:row-start-1">
          <motion.div className="absolute left-[4%] top-[14%] w-[52%] drop-shadow-[0_24px_30px_rgba(60,45,30,0.14)]" {...settle(0.1, -7)}>
            <GarmentArt garment="jean" hex="#2b3548" texture="denim" backdrop="none" />
          </motion.div>
          <motion.div className="absolute left-[30%] top-[4%] w-[62%] drop-shadow-[0_24px_30px_rgba(60,45,30,0.16)]" {...settle(0.25, 5)}>
            <GarmentArt garment="jacket" hex="#9a6b53" texture="canvas" backdrop="none" />
          </motion.div>
          <motion.div className="absolute bottom-[2%] left-[18%] w-[46%] drop-shadow-[0_20px_26px_rgba(60,45,30,0.14)]" {...settle(0.4, -3)}>
            <GarmentArt garment="tee" hex="#efe9dc" texture="jersey" backdrop="none" />
          </motion.div>
        </div>

        <div className="relative row-start-2 flex flex-col justify-end pb-12 pt-4 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:pb-24">
          <motion.p className="t-meta text-charcoal" {...rise(0.15)}>
            Autumn / Winter 2026
          </motion.p>
          <motion.h1 id="hero-title" className="t-hero mt-6 max-w-[11ch]" {...rise(0.25)}>
            Clothes with <span className="t-serif italic tracking-[-0.02em]">nothing</span> to hide.
          </motion.h1>
          <motion.p className="mt-8 max-w-xs text-[16px] leading-relaxed text-charcoal" {...rise(0.4)}>
            Better materials.
            <br />
            Better factories.
            <br />
            Fewer, better pieces.
          </motion.p>
          <motion.div className="mt-10" {...rise(0.55)}>
            <Link href="/shop" className="btn btn-primary">
              Shop collection
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
