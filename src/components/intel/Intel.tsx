"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Weights } from "@/components/ratings/Weights";
import { SectionHeading } from "@/components/ui/Bits";
import { Rolling } from "@/components/ui/motion";
import { fixed, formatStamp, pad2, SNAPSHOT, SOURCES, theme } from "@/lib/catalog";
import { live, useStore } from "@/lib/store";
import { useCatalog } from "@/lib/useCatalog";
import type { Scored } from "@/lib/useCatalog";
import { SOURCE_IDS } from "@/lib/types";
import { Field } from "./Field";

const SPRING = { type: "spring", stiffness: 260, damping: 30 } as const;

/** The collection re-ranked by the visitor's weights, next to where the editors put each title. */
function Ranking({ list, personalized }: { list: Scored[]; personalized: boolean }) {
  const ordered = [...list].sort((a, b) => a.personalRank - b.personalRank || a.rank - b.rank);
  return (
    <ol className="border-t border-rule" aria-label={personalized ? "Your personal ranking" : "Ranking under the editorial weighting"}>
      {ordered.map((a) => {
        const moved = a.consensusRank - a.personalRank;
        return (
          <motion.li key={a.slug} layout="position" transition={{ layout: SPRING }} style={theme(a)} className="group grid grid-cols-[3.2rem_1fr_auto] items-center gap-3 border-b border-rule py-2">
            <Rolling value={pad2(a.personalRank)} className={`t-num text-3xl ${personalized ? "text-violet" : ""}`} />
            <Link href={`/anime/${a.slug}`} className="flex min-w-0 items-center gap-3">
              <span className="relative block h-12 w-9 shrink-0 overflow-hidden bg-deep">
                <Image src={a.cover} alt="" fill sizes="36px" className="object-cover" />
              </span>
              <span className="min-w-0">
                <span className="t-display block truncate text-xl transition-colors group-hover:text-accent">{a.title.display}</span>
                <span className="t-label block !text-[0.62rem] text-mute">
                  Editorial № {a.rank} · by score #{a.consensusRank}
                </span>
              </span>
            </Link>
            <span className="flex items-center gap-3">
              {personalized && (
                <span className={`t-num flex w-10 items-center gap-0.5 text-base ${moved > 0 ? "text-cyan" : moved < 0 ? "text-red" : "text-mute"}`} aria-label={moved === 0 ? "Unchanged" : `${moved > 0 ? "Up" : "Down"} ${Math.abs(moved)} from the editorial weighting`}>
                  {moved > 0 ? <ArrowUp size={13} /> : moved < 0 ? <ArrowDown size={13} /> : <Minus size={13} />}
                  {moved !== 0 && Math.abs(moved)}
                </span>
              )}
              <span className="t-num w-14 text-right text-2xl">{fixed(a.personal, 2)}</span>
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}

export function Intel() {
  const { list, personalized } = useCatalog();
  const liveState = useStore(live);

  return (
    <div className="shell pb-24 pt-[calc(var(--nav-h)+3rem)]">
      <SectionHeading as="h1" jp="評価" title="Rating intelligence">
        Four platforms, one transparent score. Ask the field a question, weigh the platforms yourself, and watch all twenty titles move — the editors’ order stays visible beside yours.
      </SectionHeading>

      <div className="mt-12">
        <Field list={list} personalized={personalized} />
      </div>

      <div className="mt-16 grid gap-x-14 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <h2 className="t-display text-3xl">Your weighting</h2>
            <p className="mt-2 max-w-md text-sm text-mute">Each slider is how many times a platform counts. A platform with no verified score for a title is left out for that title. The field above and the ranking beside this move as you drag.</p>
            <div className="mt-6">
              <Weights />
            </div>
            <p className={`t-label mt-6 border-l-2 pl-3 ${personalized ? "border-violet text-violet" : "border-gold text-gold"}`}>
              {personalized ? "Showing your personal ranking. It is stored on this device only." : "Showing the editorial weighting: every available platform counts once."}
            </p>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="t-display text-3xl">{personalized ? "Your ranking" : "Ranking by score"}</h2>
            <span className="t-label text-mute">Score out of 10</span>
          </div>
          <Ranking list={list} personalized={personalized} />
        </div>
      </div>

      {/* ── Methodology ── */}
      <section id="method" aria-labelledby="method-title" className="paper -mx-(--gutter) mt-24 scroll-mt-(--nav-h) px-(--gutter) py-16">
        <div className="grid gap-x-14 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p lang="ja" aria-hidden="true" className="t-jp text-red">
              算出方法
            </p>
            <h2 id="method-title" className="t-display mt-3 text-[clamp(2.4rem,5vw,4.4rem)]">
              How the score is built
            </h2>
          </div>
          <div className="t-serif space-y-4 lg:col-span-8">
            <p>
              <strong>Sources.</strong> AniList (weighted average, 0–100), MyAnimeList (0–10, read through the Jikan API), IMDb (0–10) and TMDB (0–10). Each rating records where it came from and when it was read.
            </p>
            <p>
              <strong>One scale.</strong> Every score is converted to a 10-point scale: score ÷ platform maximum × 10. Nothing else is adjusted.
            </p>
            <p>
              <strong>The overall score.</strong> A weighted mean of the platforms that have a verified score for that title. The editorial default gives each platform a weight of 1. A platform with no score is excluded and the remaining weights are renormalised — a missing score is never treated as zero, and a platform that was not queried is labelled as not queried.
            </p>
            <p>
              <strong>Your score.</strong> The same mean with your weights. If you raise “audience size”, that share of the score comes from where the title’s AniList member count ranks among the twenty (10 × percentile); the rest stays the weighted mean.
            </p>
            <p>
              <strong>Disagreement.</strong> The highest normalised platform score minus the lowest.
            </p>
            <p>
              <strong>What a score covers.</strong> AniList and MyAnimeList rate each season separately; for multi-season series this archive uses the first season’s entry. IMDb and TMDB rate a series as a whole, so their numbers describe the entire run.
            </p>
            <p>
              <strong>Freshness.</strong> The site ships with a stored snapshot taken {formatStamp(SNAPSHOT.meta.generatedAt)}. On each visit the server tries to refresh every platform it can reach; values marked “Live” replaced the snapshot, values marked “Snapshot” did not.
              {liveState.data && ` Last live check: ${formatStamp(liveState.data.generatedAt)}.`}
            </p>
            <ul className="!mt-6 grid gap-3 font-sans text-sm sm:grid-cols-2">
              {SOURCE_IDS.map((id) => (
                <li key={id} className="border-l-2 pl-3" style={{ borderColor: SOURCES[id].color }}>
                  <span className="t-label block">{SOURCES[id].name}</span>
                  {SNAPSHOT.meta.sources[id].note}
                  {liveState.data && <span className="mt-1 block text-ink/60">Now: {liveState.data.sources[id].message}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
