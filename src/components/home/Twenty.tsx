"use client";

import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import type { MotionStyle } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Art } from "@/components/ui/Art";
import { ANIME, lead, pad2, theme } from "@/lib/catalog";
import { useClientValue } from "@/lib/store";

/** Pinned, scroll-driven travel is for wide screens with motion allowed; everyone else swipes. */
const canPin = () => window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)").matches;

function Card({ index }: { index: number }) {
  const a = ANIME[index];
  return (
    <li className={`group relative w-[62vw] shrink-0 snap-center sm:w-[34vw] lg:w-[21vw] ${index % 2 ? "lg:mt-24" : ""}`} style={theme(a)}>
      <Link href={`/anime/${a.slug}`} data-cursor="Open" className="block">
        {/* Far plane: the numeral lags behind as the strip travels (--p is the strip's progress, 0 to 1). */}
        <p aria-hidden="true" className="t-display t-outline -mb-[0.26em] text-[clamp(6rem,13vw,13rem)] text-bone/35 transition-colors duration-500 group-hover:text-accent" style={{ transform: "translateX(calc((var(--p, 0.5) - 0.5) * 170px))" }}>
          {pad2(a.rank)}
        </p>
        <Art share={a.slug} src={a.cover} alt={`${a.title.display} cover art`} sizes="(max-width: 640px) 62vw, (max-width: 1024px) 34vw, 21vw" className="aspect-[2/3] w-full" imgClassName="group-hover:scale-[1.04]" />
        {/* Near plane: the lead character, pinned to the cover like a print and running ahead of it. */}
        <span aria-hidden="true" className="absolute -right-[7%] top-[44%] block w-[36%] bg-paper p-[3px] shadow-[0_18px_36px_-14px_#000]" style={{ transform: "translateX(calc((var(--p, 0.5) - 0.5) * -120px)) rotate(4deg)" }}>
          <Art src={lead(a).image} alt="" sizes="240px" position="50% 15%" className="aspect-[3/4] w-full" />
        </span>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-rule pt-2 transition-colors duration-500 group-hover:border-accent">
          <h3 className="t-display truncate text-2xl">{a.title.display}</h3>
          <span className="t-num shrink-0 text-mute">{a.year}</span>
        </div>
      </Link>
    </li>
  );
}

/**
 * The twenty, as one long strip. On wide screens the section pins and vertical
 * scroll becomes sideways travel; numerals drift at their own rate for depth.
 */
export function Twenty() {
  const pinned = useClientValue(canPin, false);
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    if (!pinned || !track.current) return;
    const el = track.current;
    const measure = () => setTravel(Math.max(0, el.scrollWidth - window.innerWidth));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pinned]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (p) => -p * travel);

  return (
    <section ref={section} aria-labelledby="twenty-title" className="relative bg-ink" style={pinned ? { height: `calc(100dvh + ${travel}px)` } : undefined}>
      <div className={pinned ? "sticky top-0 flex h-dvh flex-col justify-center overflow-hidden pt-(--nav-h)" : "py-20"}>
        <div className="shell flex items-end justify-between gap-6">
          <div>
            <p lang="ja" aria-hidden="true" className="t-jp text-red">
              二十選
            </p>
            <h2 id="twenty-title" className="t-display mt-2 text-[clamp(2.6rem,6vw,5.4rem)]">
              The twenty
            </h2>
          </div>
          <Link href="/archive" className="btn btn-sm mb-2 shrink-0">
            Open the archive <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <motion.ul ref={track} style={pinned ? ({ x, "--p": scrollYProgress } as MotionStyle) : undefined} className={`mt-6 flex gap-[3vw] px-(--gutter) ${pinned ? "w-max will-change-transform" : "snap-x overflow-x-auto pb-6"}`}>
          {ANIME.map((a, i) => (
            <Card key={a.slug} index={i} />
          ))}
          <li className="grid w-[62vw] shrink-0 snap-center place-items-center sm:w-[30vw] lg:w-[24vw]">
            <Link href="/archive" className="group text-center">
              <span className="t-display block text-5xl transition-colors group-hover:text-red">Filter, sort and search all twenty</span>
              <span className="btn btn-solid mt-6">Open the archive</span>
            </Link>
          </li>
        </motion.ul>

        {pinned && (
          <div className="shell mt-8">
            <div className="h-px bg-rule">
              <motion.div className="thread" style={{ scaleX: scrollYProgress }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
