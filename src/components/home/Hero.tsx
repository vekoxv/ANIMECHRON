"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PointerEvent } from "react";
import { Art } from "@/components/ui/Art";
import { Dial } from "@/components/ui/Bits";
import { InkSwap } from "@/components/ui/InkSwap";
import { Magnetic, Rolling } from "@/components/ui/motion";
import { WatchToggle } from "@/components/ui/Watch";
import { lead, lengthOf, pad2, theme } from "@/lib/catalog";
import { ui, useStore } from "@/lib/store";
import { useCatalog } from "@/lib/useCatalog";
import { CharacterStrip } from "./CharacterStrip";
import { Embers } from "./Embers";

const CUT = [0.76, 0, 0.24, 1] as const;
const INK = [0.16, 1, 0.3, 1] as const;

/** A panel that is cut in from the side the user is travelling toward. */
const wipe = {
  hidden: (dir: number) => ({
    clipPath: dir > 0 ? "polygon(100% 0, 100% 0, 126% 100%, 126% 100%)" : "polygon(-26% 0, -26% 0, 0 100%, 0 100%)",
  }),
  shown: { clipPath: "polygon(-26% 0, 100% 0, 126% 100%, 0 100%)", transition: { duration: 1, ease: CUT } },
  gone: { scale: 1.08, transition: { duration: 1, ease: CUT } },
};

/** Long titles get a smaller size so every title fills roughly the same block. */
const titleSize = (title: string) =>
  title.length > 20 ? "text-[clamp(2.9rem,7.4vw,8rem)]" : title.length > 12 ? "text-[clamp(3.6rem,10vw,11rem)]" : "text-[clamp(4.6rem,14vw,15rem)]";

export function Hero() {
  const { list } = useCatalog();
  const ready = useStore(ui).ready;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const anime = list[index];
  const hero = lead(anime);
  const state = ready ? "shown" : "hidden";

  const select = (i: number) => {
    const next = (i + list.length) % list.length;
    if (next === index) return;
    setDir(i > index ? 1 : -1);
    setIndex(next);
  };

  // Pointer position drives every depth plane through one pair of springs.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 16 });
  const sy = useSpring(my, { stiffness: 55, damping: 16 });
  const backX = useTransform(sx, (v) => v * 26);
  const backY = useTransform(sy, (v) => v * 16);
  const kanjiX = useTransform(sx, (v) => v * 54);
  const coverX = useTransform(sx, (v) => v * -30);
  const coverY = useTransform(sy, (v) => v * -20);
  const tiltY = useTransform(sx, (v) => v * 9);
  const tiltX = useTransform(sy, (v) => v * -7);
  const frontX = useTransform(sx, (v) => v * -74);
  const frontY = useTransform(sy, (v) => v * -46);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    mx.set(x - 0.5);
    my.set(y - 0.5);
    e.currentTarget.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onPointerMove={onPointerMove}
      style={theme(anime)}
      className="palette-morph relative isolate flex min-h-dvh flex-col overflow-hidden bg-deep pt-(--nav-h)"
    >
      {/* ── Depth plane 1: atmosphere ── */}
      <AnimatePresence>
        <motion.div key={anime.slug} aria-hidden="true" className="absolute -inset-[5%] -z-10" style={{ x: backX, y: backY }} initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 0.42, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: INK }}>
          {anime.banner && <Image src={anime.banner} alt="" fill sizes="100vw" preload={index === 0} className="object-cover blur-[5px] saturate-[0.75]" />}
        </motion.div>
      </AnimatePresence>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--deep)_18%,transparent_72%),linear-gradient(to_top,var(--color-ink)_2%,transparent_42%)]" />
      <div aria-hidden="true" className="hero-light absolute inset-0 -z-10" />
      <div aria-hidden="true" className="hero-tone tone absolute inset-0 -z-10 text-accent" />
      <Embers color={anime.palette.accent} />

      {/* The native title, set vertically like the spine of a tankōbon. */}
      <motion.div aria-hidden="true" lang="ja" style={{ x: kanjiX }} className="pointer-events-none absolute right-[max(1rem,3vw)] top-[calc(var(--nav-h)+1.5rem)] -z-10 hidden h-[70vh] md:block">
        <AnimatePresence mode="wait">
          <motion.p key={anime.slug} className="t-jp t-vertical t-outline h-full text-[clamp(3rem,7vw,7.5rem)] leading-none text-accent/55" initial={{ opacity: 0, y: 40 }} animate={{ opacity: ready ? 1 : 0, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.7, ease: INK }}>
            {anime.title.native?.replace(/[A-Za-z0-9 ()×-]+/g, "") || anime.title.native}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <div className="shell relative grid flex-1 items-center gap-x-10 gap-y-7 py-5 lg:grid-cols-12 lg:py-6">
        {/* ── Depth planes 2 and 3: the cover panel, and the character in front of it ── */}
        <div className="relative mx-auto w-[min(50vw,20rem)] [perspective:1300px] lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mr-[9%] lg:w-[min(27vw,25rem)]">
          <div aria-hidden="true" className="t-display absolute -left-[36%] -top-[9%] text-[clamp(8rem,23vw,22rem)] text-accent/70 lg:-left-[52%]">
            <Rolling value={pad2(anime.rank)} className="t-outline" />
          </div>
          <motion.div style={{ x: coverX, y: coverY, rotateY: tiltY, rotateX: tiltX }} className="relative rotate-2">
            <div className="cut-a bg-bone p-[3px]" style={{ "--k": "34px" } as React.CSSProperties}>
              <div className="cut-a relative aspect-[2/3] overflow-hidden bg-deep" style={{ "--k": "33px" } as React.CSSProperties}>
                {/* The frame opens once on arrival; after that the cover changes by ink bleed (WebGL). */}
                <motion.div custom={1} variants={wipe} initial="hidden" animate={state} className="absolute inset-0">
                  <InkSwap src={anime.cover} alt={`${anime.title.display} cover art`} sizes="(max-width: 1024px) 50vw, 27vw" preload={index === 0} dir={dir} className="size-full" />
                </motion.div>
              </div>
            </div>
          </motion.div>
          <motion.div style={{ x: frontX, y: frontY }} className="absolute -left-[26%] bottom-[-7%] w-[48%]">
            <div className="-rotate-[5deg] bg-paper p-1 shadow-[0_24px_50px_-18px_#000]">
              <div className="relative aspect-[3/4] overflow-hidden bg-deep">
                <AnimatePresence custom={-dir}>
                  <motion.div key={hero.id} custom={-dir} variants={wipe} initial="hidden" animate={state} exit="gone" className="absolute inset-0">
                    <Art src={hero.image} alt={`${hero.name}, lead character of ${anime.title.display}`} sizes="(max-width: 1024px) 30vw, 13vw" preload={index === 0} position="50% 15%" className="size-full" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <p className="t-label truncate px-1 pb-0.5 pt-1.5 !text-[0.6rem] text-ink">{hero.name}</p>
            </div>
          </motion.div>
        </div>

        {/* ── Type ── */}
        <div className="relative z-10 lg:col-span-8 lg:col-start-1 lg:row-start-1">
          <div className="t-num flex flex-wrap items-center gap-x-5 gap-y-1 text-lg text-bone/80 sm:text-xl">
            <span className="flex items-center gap-1 text-gold">
              № <Rolling value={pad2(anime.rank)} />
              <span className="text-bone/40">/ {list.length}</span>
            </span>
            <Rolling value={String(anime.year ?? "")} />
            <AnimatePresence mode="wait">
              <motion.span key={anime.slug} className="uppercase tracking-wide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                {anime.format === "MOVIE" ? "Film" : "TV series"} · {lengthOf(anime)} · {anime.studio?.name}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="mt-3 flex min-h-[calc(3*0.84*clamp(2.9rem,7.4vw,8rem))] items-end">
            <AnimatePresence mode="wait">
              <motion.h1 key={anime.slug} className={`t-display max-w-[14ch] ${titleSize(anime.title.display)}`}>
                <span className="sr-only">{anime.title.display}</span>
                {anime.title.display.split(" ").map((word, i) => (
                  <span key={i} aria-hidden="true" className="-mb-[0.08em] mr-[0.2em] inline-block overflow-hidden pb-[0.08em] align-top">
                    <motion.span
                      className="inline-block origin-bottom-left"
                      variants={{ hidden: { y: "108%", rotate: 5 }, shown: { y: 0, rotate: 0 } }}
                      initial="hidden"
                      animate={state}
                      exit={{ y: "-108%", transition: { duration: 0.34, ease: CUT, delay: i * 0.025 } }}
                      transition={{ duration: 1, ease: INK, delay: 0.1 + i * 0.07 }}
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </motion.h1>
            </AnimatePresence>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end lg:max-w-[46rem]">
            <div className="min-h-[7.5rem]">
              <AnimatePresence mode="wait">
                <motion.p key={anime.slug} className="t-serif line-clamp-3 max-w-[52ch] text-[0.98rem] text-bone/85" initial={{ opacity: 0, y: 12 }} animate={{ opacity: ready ? 1 : 0, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                  {anime.synopsis}
                </motion.p>
              </AnimatePresence>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Magnetic>
                  <Link href={`/anime/${anime.slug}`} data-cursor="Open" className="btn btn-solid">
                    Open the file <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </Magnetic>
                <WatchToggle slug={anime.slug} title={anime.title.display} className="!size-11" />
                <Link href="/archive" className="t-label link ml-1 text-bone/70 hover:text-bone">
                  All twenty titles
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dial value={anime.consensus} color="var(--a)" size={92} label="Consensus" />
              <p className="t-label max-w-28 leading-snug text-bone/60">
                Mean of {anime.used.length} platform{anime.used.length === 1 ? "" : "s"} · {anime.genres.slice(0, 2).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── The strip ── */}
      <div className="relative z-10 pb-5">
        <div className="shell">
          <div className="mb-3 flex items-center gap-4">
            <p className="t-label shrink-0 text-bone/60">Pick a face, change the world</p>
            <motion.div className="thread flex-1" initial={{ scaleX: 0 }} animate={{ scaleX: ready ? 1 : 0 }} transition={{ duration: 1.3, ease: CUT, delay: 0.3 }} />
            <div className="t-num flex shrink-0 items-center gap-3 text-xl">
              <button type="button" onClick={() => select(index - 1)} aria-label="Previous title" className="grid size-10 place-items-center border border-bone/25 transition-colors hover:border-bone hover:bg-bone hover:text-ink">
                <ArrowLeft size={17} />
              </button>
              <span aria-live="polite" aria-atomic="true" className="flex items-center gap-1">
                <Rolling value={pad2(index + 1)} />
                <span className="text-bone/40">/ {list.length}</span>
                <span className="sr-only">{anime.title.display}</span>
              </span>
              <button type="button" onClick={() => select(index + 1)} aria-label="Next title" className="grid size-10 place-items-center border border-bone/25 transition-colors hover:border-bone hover:bg-bone hover:text-ink">
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
          <CharacterStrip list={list} index={index} onSelect={select} />
        </div>
      </div>
    </section>
  );
}
