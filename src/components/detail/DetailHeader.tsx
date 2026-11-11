"use client";

import { ArrowLeft } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { Art } from "@/components/ui/Art";
import { Reveal, Split } from "@/components/ui/Reveal";
import { WatchControl } from "@/components/ui/Watch";
import { fixed, formatDate, lead, lengthOf, pad2 } from "@/lib/catalog";
import type { Scored } from "@/lib/useCatalog";

const titleSize = (title: string) =>
  title.length > 20 ? "text-[clamp(2.8rem,7.6vw,8.4rem)]" : title.length > 12 ? "text-[clamp(3.4rem,10vw,11.5rem)]" : "text-[clamp(4.4rem,14vw,15rem)]";

/** A. The cinematic header: banner drifting behind, the cover arriving from the list it was picked in. */
export function DetailHeader({ a, total, personalized }: { a: Scored; total: number; personalized: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bannerY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const bannerScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.18]);
  const typeY = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);
  const coverY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const hero = lead(a);

  const light = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--my", `${(((e.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
  };

  return (
    <header ref={ref} onPointerMove={light} className="relative isolate overflow-hidden bg-deep pt-(--nav-h)">
      <motion.div aria-hidden="true" className="absolute inset-0 -z-10 opacity-55" style={{ y: bannerY, scale: bannerScale }}>
        {a.banner && <Image src={a.banner} alt="" fill sizes="100vw" preload className="object-cover" />}
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,var(--deep)_22%,transparent_78%),linear-gradient(to_top,var(--deep)_4%,transparent_55%)]" />
      <div aria-hidden="true" className="hero-light absolute inset-0 -z-10" />
      <div aria-hidden="true" className="hero-tone tone absolute inset-0 -z-10 text-accent" />

      <div className="shell grid min-h-[calc(100svh-var(--nav-h))] items-end gap-x-10 gap-y-10 pb-14 pt-8 lg:grid-cols-12">
        <motion.div style={{ y: typeY }} className="relative z-10 lg:col-span-8">
          <Reveal>
            <Link href="/archive" className="t-label rise link inline-flex items-center gap-2 text-bone/70 hover:text-bone">
              <ArrowLeft size={14} aria-hidden="true" /> The archive
            </Link>
            <p className="rise t-num mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xl" style={{ "--d": "80ms" } as CSSProperties}>
              <span className="text-gold" data-tip="Editorial position in the collection" data-tip-side="left">
                № {pad2(a.rank)} <span className="text-bone/40">/ {total}</span>
              </span>
              <span className="uppercase tracking-wide text-bone/80">
                {a.studio?.name} · {a.year} · {a.format === "MOVIE" ? "Film" : "TV series"} · {lengthOf(a)}
              </span>
            </p>
            {a.title.native && (
              <p lang="ja" className="rise t-jp mt-4 text-[clamp(1.1rem,2.2vw,1.9rem)] text-accent" style={{ "--d": "140ms" } as CSSProperties}>
                {a.title.native}
              </p>
            )}
            <h1 className={`t-display mt-2 max-w-[13ch] ${titleSize(a.title.display)}`}>
              <Split text={a.title.display} delay={120} />
            </h1>
            <div className="rise mt-6 flex flex-wrap gap-1.5" style={{ "--d": "420ms" } as CSSProperties}>
              {a.genres.map((g) => (
                <span key={g} className="chip border-bone/30 text-bone/85">
                  {g}
                </span>
              ))}
            </div>
            <div className="rise mt-7 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--d": "520ms" } as CSSProperties}>
              <WatchControl slug={a.slug} title={a.title.display} />
              <dl className="t-num flex gap-7 text-bone/80">
                <div>
                  <dt className="t-label !text-[0.62rem] text-bone/55">Overall</dt>
                  <dd className="text-3xl text-accent">{fixed(a.consensus, 2)}</dd>
                </div>
                <div>
                  <dt className="t-label !text-[0.62rem] text-bone/55">By score</dt>
                  <dd className="text-3xl">
                    #{a.consensusRank}
                    <span className="text-lg text-bone/40"> of {total}</span>
                  </dd>
                </div>
                {personalized && (
                  <div>
                    <dt className="t-label !text-[0.62rem] text-violet">Your rank</dt>
                    <dd className="text-3xl text-violet">#{a.personalRank}</dd>
                  </div>
                )}
                <div className="hidden sm:block">
                  <dt className="t-label !text-[0.62rem] text-bone/55">Premiered</dt>
                  <dd className="text-3xl">{formatDate(a.startDate)}</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </motion.div>

        <motion.div style={{ y: coverY }} className="relative mx-auto w-[min(58vw,19rem)] lg:col-span-4 lg:mb-4 lg:w-full lg:max-w-sm">
          <div className="rotate-2 bg-bone p-[3px]">
            <Art share={a.slug} anchor src={a.cover} alt={`${a.title.display} cover art`} sizes="(max-width: 1024px) 58vw, 24rem" preload className="aspect-[2/3] w-full" />
          </div>
          <div className="absolute -left-[22%] bottom-[-5%] w-[44%] -rotate-[5deg] bg-paper p-1 shadow-[0_24px_50px_-18px_#000]">
            <Art src={hero.image} alt={`${hero.name}, lead character`} sizes="(max-width: 1024px) 26vw, 11rem" preload position="50% 15%" className="aspect-[3/4] w-full" />
            <p className="t-label truncate px-1 pb-0.5 pt-1.5 !text-[0.6rem] text-ink">{hero.name}</p>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
