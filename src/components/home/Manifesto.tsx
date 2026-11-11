"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import type { CSSProperties } from "react";
import { Art } from "@/components/ui/Art";
import { Rolling } from "@/components/ui/motion";
import { Reveal, useInView } from "@/components/ui/Reveal";
import { ANIME, BY_SLUG, CAST, compact, lead, STUDIOS, theme, YEAR_MAX, YEAR_MIN } from "@/lib/catalog";

const ratingsRead = ANIME.reduce((n, a) => n + (a.ratings.anilist.votes ?? 0) + (a.ratings.imdb.votes ?? 0) + (a.ratings.mal.votes ?? 0), 0);

/** A number inside a sentence that rolls up to its value when it scrolls into view. Counted from the dataset. */
function Count({ value }: { value: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const text = String(value);
  return (
    <span ref={ref} className="text-red">
      <Rolling value={inView ? text : text.replace(/\d/g, "0")} />
    </span>
  );
}

/** One piece of artwork on its own depth plane: it drifts at its own rate as the page scrolls. */
function Plane({ slug, kind, cut, drift, className }: { slug: string; kind: "banner" | "cover" | "lead"; cut: string; drift: MotionValue<string>; className: string }) {
  const a = BY_SLUG.get(slug)!;
  const src = kind === "banner" ? a.banner : kind === "cover" ? a.cover : lead(a).image;
  return (
    <motion.div style={{ y: drift, ...theme(a) }} className={`max-lg:!transform-none ${className}`}>
      <Reveal from={kind === "banner" ? "left" : "up"} className="size-full">
        <Link href={`/anime/${a.slug}`} data-cursor="Open" className={`group relative block size-full bg-ink p-[3px] ${cut}`} style={{ "--k": "22px" } as CSSProperties}>
          <div className={`reveal-inner relative size-full overflow-hidden ${cut}`} style={{ "--k": "21px" } as CSSProperties}>
            <Art src={src} alt={kind === "lead" ? `${lead(a).name}, ${a.title.display}` : `${a.title.display} artwork`} sizes="(max-width: 1024px) 60vw, 46vw" className="size-full" imgClassName="transition-transform duration-[1200ms] ease-ink group-hover:scale-105" position={kind === "lead" ? "50% 15%" : "center"} />
            <div aria-hidden="true" className="tone fade-t absolute inset-0 text-ink/50" />
            <p className="t-label absolute bottom-3 left-3 bg-paper px-2 py-1 text-ink">{a.title.display}</p>
          </div>
        </Link>
      </Reveal>
    </motion.div>
  );
}

/**
 * The paper spread after the hero. The headline is the composition: its three lines slide
 * against each other as the page scrolls, artwork sits between them on separate depth planes
 * (one line runs behind a panel, the others invert where they cross one), and the red thread
 * is drawn through the whole spread by the scroll itself.
 */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const calm = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const range = (from: string, to: string) => (calm ? ["0%", "0%"] : [from, to]);
  const lineA = useTransform(scrollYProgress, [0, 1], range("7%", "-9%"));
  const lineB = useTransform(scrollYProgress, [0, 1], range("-10%", "9%"));
  const lineC = useTransform(scrollYProgress, [0, 1], range("5%", "-3%"));
  const near = useTransform(scrollYProgress, [0, 1], range("16%", "-16%"));
  const mid = useTransform(scrollYProgress, [0, 1], range("7%", "-7%"));
  const far = useTransform(scrollYProgress, [0, 1], range("-4%", "4%"));
  const drawn = useTransform(scrollYProgress, [0.12, 0.62], calm ? [1, 1] : [0, 1]);

  const line = "block max-lg:!transform-none lg:whitespace-nowrap";
  return (
    <section ref={ref} className="paper relative overflow-hidden py-[clamp(4rem,9vw,8rem)]">
      <div className="relative lg:min-h-[64vw]">
        {/* The thread: one stroke that enters top-left, dips under the headline, circles the portrait and leaves bottom-right. */}
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[15] hidden size-full lg:block">
          <motion.path d="M -2 6 C 18 2, 30 20, 42 16 S 62 4, 58 30 S 26 52, 37 66 S 70 58, 84 76 S 96 96, 104 92" fill="none" stroke="var(--color-red)" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ pathLength: drawn }} />
        </svg>

        <div className="shell relative">
          <p lang="ja" aria-hidden="true" className="t-jp text-red">
            二十の物語、一本の赤い線
          </p>
          <h2 className="t-display mt-4 text-[clamp(3.1rem,10.4vw,12rem)]">
            <span className="sr-only">Twenty stories. One red line through all of them.</span>
            {/* Lines 1 and 3 are paper-coloured with a difference blend: ink on paper, inverted over artwork. */}
            <motion.span aria-hidden="true" style={{ x: lineA }} className={`${line} relative z-20 text-paper mix-blend-difference`}>
              Twenty stories.
            </motion.span>
            <motion.span aria-hidden="true" style={{ x: lineB }} className={`${line} relative z-0 text-red lg:pl-[16vw]`}>
              One red line
            </motion.span>
            <motion.span aria-hidden="true" style={{ x: lineC }} className={`${line} relative z-20 text-paper mix-blend-difference`}>
              through all of them.
            </motion.span>
          </h2>
        </div>

        {/* Depth planes. On wide screens they overlap the headline; on small ones they form a collage beneath it. */}
        <div className="shell relative z-10 mt-8 grid h-[105vw] grid-cols-6 grid-rows-6 gap-2.5 lg:pointer-events-none lg:absolute lg:inset-0 lg:mt-0 lg:block lg:h-auto lg:max-w-none">
          <Plane slug="cowboy-bebop" kind="banner" cut="cut-a" drift={far} className="col-span-6 row-span-2 lg:pointer-events-auto lg:absolute lg:right-[4%] lg:top-[5%] lg:h-[32%] lg:w-[40%]" />
          <Plane slug="frieren" kind="lead" cut="cut-c" drift={near} className="col-span-2 row-span-4 lg:pointer-events-auto lg:absolute lg:left-[39%] lg:top-[30%] lg:h-[52%] lg:w-[17%]" />
          <Plane slug="spirited-away" kind="cover" cut="cut-d" drift={mid} className="col-span-4 row-span-2 lg:pointer-events-auto lg:absolute lg:right-[9%] lg:top-[47%] lg:h-[46%] lg:w-[21%]" />
          <Plane slug="neon-genesis-evangelion" kind="banner" cut="cut-b" drift={far} className="col-span-4 row-span-2 lg:hidden" />
          <p aria-hidden="true" lang="ja" className="t-jp pointer-events-none absolute right-[3%] top-[36%] rotate-12 text-[clamp(3rem,8vw,7.5rem)] leading-none text-red lg:right-[33%] lg:top-[70%]">
            ドン
          </p>
        </div>

        {/* On wide screens the opening words sit in the quiet lower-left corner of the spread. */}
        <Reveal className="shell relative z-20 mt-10 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:w-[37%]">
          <p className="rise t-serif text-lg">
            ANIMÉCHRON is a hand-picked archive of anime that changed what the medium could do. Each title brings its own colours, its cast, the studio that drew it, and the verdicts of the platforms that rate it.
          </p>
          <p className="rise t-serif mt-4 text-ink/75" style={{ "--d": "120ms" } as CSSProperties}>
            Every number is read from its source and dated. Where a platform has no verified score, the archive says “unavailable” instead of guessing. So far it has read {compact(ratingsRead)} individual ratings.
          </p>
          <div className="rise mt-7 flex flex-wrap gap-3" style={{ "--d": "220ms" } as CSSProperties}>
            <Link href="/archive" className="btn bg-ink text-paper hover:!border-red hover:!bg-red hover:!text-bone">
              Enter the archive
            </Link>
            <Link href="/intel#method" className="btn">
              How scores are built
            </Link>
          </div>
        </Reveal>
      </div>

      {/* The figures, set as a sentence rather than a row of statistics. Every number is counted from the data. */}
      <div className="shell relative z-20 mt-14">
        <p className="t-display max-w-[24ch] text-[clamp(1.9rem,4.4vw,4.2rem)] lg:ml-auto lg:text-right">
          <Count value={ANIME.length} /> titles from <Count value={STUDIOS.length} /> studios, <Count value={CAST.length} /> characters on file, <Count value={YEAR_MAX - YEAR_MIN} /> years between the first and the last.
        </p>
      </div>
    </section>
  );
}
