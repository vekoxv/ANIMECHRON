"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { useStore, watchlist } from "@/lib/store";

/** A few strokes that hint at what is inside each volume. Decorative; drawn, not loaded. */
const SKETCH: Record<string, ReactNode> = {
  "/archive": (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 14h24v34H8zM38 8h24v34H38zM68 18h24v34H68z" />
      <path d="M8 56h84" strokeDasharray="2 5" />
    </g>
  ),
  "/universe": (
    <g fill="currentColor" stroke="currentColor" strokeWidth="1">
      <path d="M12 44 30 20 52 30 70 12 88 38" fill="none" />
      {[[12, 44, 3], [30, 20, 4.5], [52, 30, 2.5], [70, 12, 3.5], [88, 38, 2.5]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} stroke="none" />
      ))}
    </g>
  ),
  "/intel": (
    <g fill="currentColor">
      <path d="M6 52h88" stroke="currentColor" strokeWidth="1.5" />
      {[[14, 30], [28, 18], [40, 36], [55, 10], [68, 26], [84, 16]].map(([x, y]) => (
        <rect key={x} x={x - 4} y={y} width="8" height="12" />
      ))}
    </g>
  ),
  "/lab": (
    <g fill="currentColor">
      <rect x="10" y="14" width="64" height="9" />
      <rect x="10" y="29" width="46" height="9" opacity="0.55" />
      <rect x="10" y="44" width="78" height="9" opacity="0.3" />
    </g>
  ),
  "/dojo": (
    <g>
      <path d="M8 8h36L36 54H8zM56 8h36v46H48z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="40" y="22" width="20" height="20" fill="var(--color-red)" transform="rotate(12 50 32)" />
    </g>
  ),
  "/watchlist": (
    <g fill="none" stroke="var(--color-red)" strokeWidth="3">
      <circle cx="50" cy="31" r="24" />
      <circle cx="50" cy="31" r="16" strokeDasharray="3 6" strokeWidth="5" />
      <rect x="43" y="24" width="14" height="14" fill="var(--color-red)" stroke="none" />
    </g>
  ),
};

const VOLUMES = [
  { href: "/archive", jp: "書庫", no: "一", title: "The archive", text: "All twenty, as a cinematic grid, a manga page or a ranking table. Search, filter, sort.", band: "var(--color-red)" },
  { href: "/universe", jp: "群像", no: "二", title: "Character universe", text: "A star atlas of 160 characters. Stories that are alike sit close; a red thread finds the way between any two.", band: "var(--color-cyan)" },
  { href: "/intel", jp: "評価", no: "三", title: "Rating intelligence", text: "One sheet, twenty titles. Weigh the platforms yourself and watch them move.", band: "var(--color-gold)" },
  { href: "/lab", jp: "比較", no: "四", title: "Comparison lab", text: "Two or three titles on the bench, measured on everything the archive knows.", band: "var(--color-bone)" },
  { href: "/dojo", jp: "道場", no: "五", title: "Versus dojo", text: "Pick winners head to head. Find out whose taste you share.", band: "var(--color-red)" },
  { href: "/watchlist", jp: "鑑賞録", no: "六", title: "Watchlist", text: "What you have saved, what is left to watch, and the seal cut from it.", band: "var(--color-violet)" },
];

/**
 * The way onward, as a shelf of six volumes. Spines stand closed with their titles running
 * down them; the one under the pointer (or keyboard focus) is pulled out and opens flat.
 * On small screens every volume simply lies open in a list — nothing depends on hover.
 */
export function Shelf() {
  const [open, setOpen] = useState(1);
  const saved = Object.keys(useStore(watchlist)).length;

  return (
    <section aria-labelledby="shelf-title" className="bg-ink py-[clamp(4rem,9vw,8rem)]">
      <div className="shell">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p lang="ja" aria-hidden="true" className="t-jp text-red">
              全六巻
            </p>
            <h2 id="shelf-title" className="t-display mt-2 text-[clamp(2.6rem,6vw,5.4rem)]">
              Six volumes
            </h2>
          </div>
          <p className="rise t-serif max-w-sm text-mute">The rest of the archive, shelved. Each volume is a different way of reading the same twenty stories.</p>
        </Reveal>

        <ul className="mt-10 flex flex-col gap-2 lg:h-[min(68vh,36rem)] lg:flex-row lg:gap-1.5">
          {VOLUMES.map((v, i) => {
            const active = open === i;
            return (
              <li key={v.href} className="min-w-0 transition-[flex-grow] duration-700 ease-ink lg:basis-0" style={{ flexGrow: active ? 6 : 1 }}>
                <Link
                  href={v.href}
                  onMouseEnter={() => setOpen(i)}
                  onFocus={() => setOpen(i)}
                  data-cursor="Open"
                  aria-label={`${v.title}. ${v.text}`}
                  className={`group relative flex h-full min-h-40 overflow-hidden border bg-ink-2 transition-colors duration-500 ${active ? "border-bone/60" : "border-rule"}`}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: v.band }} />

                  {/* The spine: always present, the only thing visible while the volume is closed. */}
                  <span aria-hidden="true" className="hidden w-[4.6rem] shrink-0 flex-col items-center justify-between px-2 pb-4 pt-7 lg:flex">
                    <span lang="ja" className="t-jp t-vertical text-[1.9rem] leading-none">
                      {v.jp}
                    </span>
                    <span className="flex flex-col items-center gap-3">
                      <span className="t-label t-vertical rotate-180 whitespace-nowrap text-mute">{v.title}</span>
                      <span lang="ja" className="t-jp grid size-9 place-items-center border border-current text-sm">
                        {v.no}
                      </span>
                    </span>
                  </span>

                  {/* The open volume. Laid out at its full width and clipped, so opening never re-wraps the text. */}
                  <span className={`relative flex min-w-0 flex-1 flex-col justify-end overflow-hidden p-6 transition-opacity duration-500 lg:p-8 ${active ? "lg:opacity-100" : "lg:opacity-0"}`}>
                    <span lang="ja" aria-hidden="true" className="t-jp t-outline pointer-events-none absolute -right-3 -top-5 text-[clamp(6rem,16vw,13rem)] leading-none text-bone/15">
                      {v.jp}
                    </span>
                    <svg aria-hidden="true" viewBox="0 0 100 62" className="mb-auto mt-6 hidden h-28 w-44 text-bone/70 lg:block">
                      {SKETCH[v.href]}
                    </svg>
                    <span className="relative block lg:w-[min(30rem,42vw)]">
                      <span className="t-display block text-[clamp(2rem,4.4vw,4rem)]">{v.title}</span>
                      <span className="t-serif mt-2 block max-w-[40ch] text-mute">{v.text}</span>
                      <span className="t-label mt-4 inline-flex items-center gap-2 text-bone">
                        {v.href === "/watchlist" && saved > 0 ? `Open · ${saved} saved` : "Open"} <ArrowUpRight size={15} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
