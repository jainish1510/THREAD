import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { getSummaries, catalog } from "@/lib/catalog";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "THREAD — Clothes with nothing to hide", template: "%s — THREAD" },
  description: "Premium essentials with published costs, traceable factories and a digital passport for every garment.",
  openGraph: { siteName: "THREAD", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const summaries = getSummaries();
  const hex = Object.fromEntries(catalog.colors.map((c) => [c.id, c.hex]));
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body>
        <Providers>
          <SiteChrome products={summaries} hex={hex}>
            {children}
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
