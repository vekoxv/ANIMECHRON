"use client";

import { Pause, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Art } from "@/components/ui/Art";
import { SectionHeading } from "@/components/ui/Bits";
import { Rolling } from "@/components/ui/motion";
import { fixed, pad2, theme, YEAR_MAX, YEAR_MIN } from "@/lib/catalog";
import { rankBy } from "@/lib/scoring";
import { useCatalog } from "@/lib/useCatalog";

const SPAN = YEAR_MAX - YEAR_MIN;
const at = (year: number) => `${((year - YEAR_MIN) / SPAN) * 100}%`;
const YEARS = Array.from({ length: SPAN + 1 }, (_, i) => YEAR_MIN + i);

/**
 * ORIGINAL FEATURE — the Chronoscope.
 * Drag the red line through the years and the shelf rewinds to what existed then:
 * titles appear in the year they premiered and the standings re-form around them.
 * Scores are today's; only the roster travels in time.
 */
export function Chronoscope() {
  const { list } = useCatalog();
  const [year, setYear] = useState(YEAR_MAX);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setYear((y) => {
        if (y < YEAR_MAX) return y + 1;
        setPlaying(false);
        return y;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing]);

  const shelf = useMemo(() => {
    const alive = list.filter((a) => (a.year ?? 0) <= year);
    const ranks = rankBy(alive, (a) => a.consensus);
    return alive.map((a) => ({ a, rank: ranks.get(a)! })).sort((x, y) => x.rank - y.rank || x.a.rank - y.a.rank);
  }, [list, year]);
  const arrivals = list.filter((a) => a.year === year);

  return (
    <section id="chronoscope" aria-labelledby="chrono-title" className="relative scroll-mt-(--nav-h) overflow-hidden bg-ink-2 py-[clamp(4rem,9vw,8rem)]">
      <div className="shell">
        <SectionHeading jp="年代記" title="Chronoscope">
          <span id="chrono-title">Drag the red line through time. The shelf keeps only what had premiered by that year, and the standings re-form around each arrival. Scores are today’s — only the roster travels.</span>
        </SectionHeading>

        <div className="mt-12 grid items-end gap-6 sm:grid-cols-[auto_1fr_auto]">
          <p className="t-display text-[clamp(5rem,15vw,13rem)] leading-[0.78]">
            <Rolling value={String(year)} />
          </p>
          <div className="min-h-16 pb-2">
            <p className="t-label text-mute">
              {shelf.length} of {list.length} titles exist
            </p>
            <AnimatePresence mode="wait">
              <motion.p key={year} className="t-display mt-1 text-[clamp(1.4rem,3vw,2.4rem)] text-red" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {arrivals.length ? `Arrives: ${arrivals.map((a) => a.title.display).join(" · ")}` : <span className="text-rule">No premiere from the archive this year</span>}
              </motion.p>
            </AnimatePresence>
          </div>
          <button
            type="button"
            className="btn mb-2"
            onClick={() => {
              if (!playing && year >= YEAR_MAX) setYear(YEAR_MIN);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {playing ? "Pause" : year >= YEAR_MAX ? `Play from ${YEAR_MIN}` : "Play"}
          </button>
        </div>

        {/* The ruler. The range input is the playhead: draggable, focusable, arrow-key driven. */}
        <div className="relative mt-6 select-none">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[7px] inset-y-0">
            {YEARS.map((y) => (
              <span key={y} className={`absolute bottom-0 w-px bg-bone ${y % 5 === 0 ? "h-5 opacity-60" : "h-2.5 opacity-25"}`} style={{ left: at(y) }}>
                {y % 5 === 0 && <span className="t-num absolute -top-6 -translate-x-1/2 text-sm text-mute">{y}</span>}
              </span>
            ))}
            {list.map((a) => (
              <span key={a.slug} className="absolute size-2 -translate-x-1/2 rounded-full transition-opacity duration-300" style={{ left: at(a.year ?? YEAR_MIN), bottom: `${28 + (a.rank % 4) * 9}px`, background: a.palette.accent, opacity: (a.year ?? 0) <= year ? 1 : 0.2 } as CSSProperties} />
            ))}
            <span className="absolute bottom-0 left-0 h-px bg-red" style={{ width: at(year) }} />
            <span className="absolute inset-x-0 bottom-0 -z-10 h-px bg-rule" />
          </div>
          <input
            type="range"
            className="chrono relative block"
            min={YEAR_MIN}
            max={YEAR_MAX}
            step={1}
            value={year}
            aria-label="Year"
            aria-valuetext={`${year}: ${shelf.length} titles exist`}
            onChange={(e) => {
              setPlaying(false);
              setYear(Number(e.target.value));
            }}
          />
        </div>

        <ul className="mt-10 grid grid-cols-4 gap-x-2.5 gap-y-5 sm:grid-cols-5 lg:grid-cols-10" aria-label={`Standings in ${year}`}>
          <AnimatePresence mode="popLayout">
            {shelf.map(({ a, rank }) => (
              <motion.li
                key={a.slug}
                layout
                style={theme(a)}
                initial={{ opacity: 0, clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" }}
                animate={{ opacity: 1, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ layout: { type: "spring", stiffness: 260, damping: 30 }, duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
              >
                <Link href={`/anime/${a.slug}`} className="group block" aria-label={`${a.title.display}, number ${rank} in ${year}, consensus ${fixed(a.consensus, 2)}`}>
                  <div className="relative">
                    <Art src={a.cover} alt="" sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 10vw" className="aspect-[2/3] w-full" imgClassName="group-hover:scale-105" />
                    <span className="t-num absolute left-0 top-0 bg-ink px-1.5 py-1 text-lg text-bone">
                      <Rolling value={pad2(rank)} />
                    </span>
                    {a.year === year && <span className="t-label absolute bottom-0 right-0 bg-red px-1.5 py-1 !text-[0.58rem] text-bone">New</span>}
                  </div>
                  <p className="t-label mt-1.5 truncate text-bone/80 group-hover:text-accent">{a.title.display}</p>
                  <p className="t-num text-sm text-mute">
                    {a.year} · {fixed(a.consensus, 2)}
                  </p>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}
