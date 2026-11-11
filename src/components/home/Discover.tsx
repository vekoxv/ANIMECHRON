"use client";

import { ArrowRight, Dices } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/ui/Art";
import { Mark } from "@/components/ui/Bits";
import { InkSwap } from "@/components/ui/InkSwap";
import { Magnetic } from "@/components/ui/motion";
import { WatchToggle } from "@/components/ui/Watch";
import { ANIME, lengthOf, pad2, theme } from "@/lib/catalog";

// Each flick of the shuffle waits a little longer than the last, like a wheel losing speed.
const FLICKS = [55, 55, 60, 65, 75, 85, 100, 120, 150, 190, 250, 330];

/**
 * Random discovery. One press deals through the covers, slows, and lands on a title:
 * the section takes on its colours and the card is cut open.
 */
export function Discover() {
  const [index, setIndex] = useState<number | null>(null);
  const [dealing, setDealing] = useState(false);
  const timer = useRef(0);
  const reduced = useReducedMotion();
  const anime = index == null ? null : ANIME[index];

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const draw = () => {
    if (dealing) return;
    let pick = Math.floor(Math.random() * ANIME.length);
    if (pick === index) pick = (pick + 1) % ANIME.length;
    if (reduced) return setIndex(pick);
    setDealing(true);
    const flick = (step: number) => {
      if (step === FLICKS.length) {
        setIndex(pick);
        setDealing(false);
        return;
      }
      setIndex((i) => ((i ?? 0) + 1 + Math.floor(Math.random() * (ANIME.length - 1))) % ANIME.length);
      timer.current = window.setTimeout(() => flick(step + 1), FLICKS[step]);
    };
    flick(0);
  };

  const landed = anime && !dealing;

  return (
    <section id="discover" aria-labelledby="discover-title" style={anime ? theme(anime) : undefined} className="palette-morph relative scroll-mt-(--nav-h) overflow-hidden bg-deep py-[clamp(4rem,9vw,8rem)]">
      <div aria-hidden="true" className={`speedlines absolute inset-0 text-accent transition-opacity duration-700 ${dealing ? "opacity-25" : "opacity-[0.07]"}`} />
      <div className="shell relative grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p lang="ja" aria-hidden="true" className="t-jp text-red">
            発見
          </p>
          <h2 id="discover-title" className="t-display mt-3 text-[clamp(3rem,8vw,7.5rem)]">
            {landed ? anime.title.display : "Let the archive choose"}
          </h2>

          <div className="mt-6 min-h-40" aria-live="polite">
            <AnimatePresence mode="wait">
              {landed ? (
                <motion.div key={anime.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  <p className="t-num text-xl text-accent">
                    № {pad2(anime.rank)} · {anime.year} · {lengthOf(anime)} · {anime.studio?.name}
                  </p>
                  <p className="t-serif mt-3 line-clamp-3 max-w-[58ch] text-bone/85">{anime.synopsis}</p>
                </motion.div>
              ) : (
                <motion.p key="idle" className="t-serif max-w-[52ch] text-bone/75" exit={{ opacity: 0 }}>
                  {dealing ? "Dealing…" : "Not sure what to watch? Draw once and the archive deals you one of its twenty, cover first."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Magnetic>
              <button type="button" onClick={draw} disabled={dealing} className="btn btn-solid disabled:opacity-60">
                <Dices size={18} aria-hidden="true" /> {anime ? "Draw again" : "Draw a title"}
              </button>
            </Magnetic>
            {landed && (
              <>
                <Link href={`/anime/${anime.slug}`} className="btn" data-cursor="Open">
                  Open the file <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <WatchToggle slug={anime.slug} title={anime.title.display} className="!size-11" />
              </>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-[min(64vw,21rem)] lg:col-span-4 lg:col-start-9">
          <div className={`relative aspect-[2/3] bg-bone p-[3px] transition-transform duration-500 ease-ink ${dealing ? "rotate-0 scale-95" : "-rotate-3"}`}>
            <div className="relative size-full overflow-hidden bg-ink">
              {anime && dealing ? (
                <AnimatePresence initial={false}>
                  <motion.div key={anime.slug} className="absolute inset-0" initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.09, ease: [0.76, 0, 0.24, 1] }}>
                    <Art src={anime.cover} alt="" sizes="(max-width: 1024px) 64vw, 21rem" preload className="size-full" />
                  </motion.div>
                </AnimatePresence>
              ) : anime ? (
                // The card that was dealt soaks through a sheet of ink (WebGL), instead of simply appearing.
                <InkSwap fromInk src={anime.cover} alt={`${anime.title.display} cover art`} sizes="(max-width: 1024px) 64vw, 21rem" preload className="size-full" />
              ) : (
                <div className="grid size-full place-items-center text-bone/30">
                  <div aria-hidden="true" className="tone absolute inset-0 text-bone/10" />
                  <Mark size={84} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
