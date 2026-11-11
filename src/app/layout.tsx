import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Instrument_Sans, Newsreader } from "next/font/google";
import Script from "next/script";
import { CommandPalette } from "@/components/chrome/CommandPalette";
import { Cursor } from "@/components/chrome/Cursor";
import { Footer } from "@/components/chrome/Footer";
import { Intro } from "@/components/chrome/Intro";
import { Nav } from "@/components/chrome/Nav";
import { Providers } from "@/components/chrome/Providers";
import "./globals.css";

// Three families: a condensed display face for titles and numerals, a body sans whose
// width axis also sets the small labels, and a serif for editorial prose.
// Japanese is set in the reader's own Mincho (see --font-jp): a CJK webfont is hundreds
// of files, and every platform already ships a good one.
const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin"], axes: ["opsz"], display: "swap", adjustFontFallback: false });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], axes: ["wdth"], display: "swap" });
const serif = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "ANIMÉCHRON — an archive of twenty legendary anime", template: "%s — ANIMÉCHRON" },
  description: "A cinematic archive of twenty legendary anime: artwork, characters, studios, and honest, traceable ratings compared across platforms.",
};

export const viewport: Viewport = { themeColor: "#07080b", colorScheme: "dark" };

// Runs before first paint: return visits and reduced-motion users never see the intro flash.
const introGate = `try{if(sessionStorage.getItem("animechron:intro")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.intro="skip"}catch(e){document.documentElement.dataset.intro="skip"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shoulders.variable} ${instrument.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <Script id="intro-gate" strategy="beforeInteractive">
          {introGate}
        </Script>
        <noscript>
          <style>{`.reveal,.rise,.split>span>span,.draw{clip-path:none!important;opacity:1!important;transform:none!important;translate:none!important}#intro{display:none}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh bg-ink text-bone">
        <a href="#main" className="btn btn-solid fixed left-3 top-3 z-[95] -translate-y-24 focus-visible:translate-y-0">
          Skip to content
        </a>
        <Providers>
          <Intro />
          <Nav />
          <main id="main">{children}</main>
          <Footer />
          <CommandPalette />
          <Cursor />
        </Providers>
        <div aria-hidden="true" className="grain-frame">
          <div className="grain" />
        </div>
      </body>
    </html>
  );
}
