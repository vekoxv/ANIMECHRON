"use client";

import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Art } from "@/components/ui/Art";
import { SectionHeading } from "@/components/ui/Bits";
import { Rolling } from "@/components/ui/motion";
import { pad2, SOURCES, theme } from "@/lib/catalog";
import { normalize } from "@/lib/scoring";
import { dojo, ui, useStore } from "@/lib/store";
import { duel, nextPair, spearman, START_ELO } from "@/lib/taste";
import { useCatalog } from "@/lib/useCatalog";
import type { Scored } from "@/lib/useCatalog";

const MIN_DUELS = 8;
const CUT = [0.76, 0, 0.24, 1] as const;

/** The yardsticks your picks are compared against. Higher value = that yardstick likes the title more. */
const YARDSTICKS: { name: string; color: string; value: (a: Scored) => number | null }[] = [
  { name: "AniList", color: SOURCES.anilist.color, value: (a) => normalize(a.ratings.anilist) },
  { name: "MyAnimeList", color: SOURCES.mal.color, value: (a) => normalize(a.ratings.mal) },
  { name: "IMDb", color: SOURCES.imdb.color, value: (a) => normalize(a.ratings.imdb) },
  { name: "Overall score", color: "var(--color-bone)", value: (a) => a.consensus },
  { name: "Editorial order", color: "var(--color-gold)", value: (a) => -a.rank },
  { name: "Audience size", color: "var(--color-violet)", value: (a) => a.popularity },
];

const verdict = (rho: number) => (rho >= 0.6 ? "Strong agreement" : rho >= 0.3 ? "Some agreement" : rho > -0.3 ? "No clear link" : "You tend to disagree");

function Fighter({ a, side, state, onPick }: { a: Scored; side: 0 | 1; state: "ready" | "won" | "lost"; onPick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={state !== "ready"}
      data-cursor="Choose"
      style={theme(a)}
      aria-label={`Choose ${a.title.display} (${a.year})`}
      className="group relative block aspect-[3/4] w-full overflow-hidden bg-deep text-left sm:aspect-auto sm:h-[min(66vh,40rem)]"
      initial={{ clipPath: side === 0 ? "polygon(0 0, 0 0, -20% 100%, -20% 100%)" : "polygon(120% 0, 100% 0, 100% 100%, 100% 100%)" }}
      animate={{ clipPath: side === 0 ? "polygon(0 0, 100% 0, 88% 100%, 0 100%)" : "polygon(12% 0, 100% 0, 100% 100%, 0 100%)", scale: state === "won" ? 1.03 : 1, opacity: state === "lost" ? 0.3 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.7, ease: CUT }}
    >
      <Art src={a.cover} alt="" sizes="(max-width: 640px) 50vw, 40vw" preload className="absolute inset-0" imgClassName="transition-transform duration-[900ms] ease-ink group-hover:scale-105 group-focus-visible:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
      <span className={`absolute inset-x-0 bottom-0 block p-4 sm:p-7 ${side === 1 ? "text-right" : ""}`}>
        <span className="t-num block text-accent sm:text-xl">
          № {pad2(a.rank)} · {a.year} · {a.studio?.name}
        </span>
        <span className="t-display mt-1 block text-[clamp(1.5rem,4.6vw,4.6rem)]">{a.title.display}</span>
        <span className="t-label mt-2 hidden text-bone/60 sm:block">{side === 0 ? "Press ← to choose" : "Press → to choose"}</span>
      </span>
      {state === "won" && (
        <motion.span lang="ja" aria-hidden="true" className="t-jp absolute right-5 top-5 grid size-20 place-items-center border-4 border-red text-5xl text-red" initial={{ scale: 2.4, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}>
          勝
        </motion.span>
      )}
    </motion.button>
  );
}

/**
 * ORIGINAL FEATURE — the Versus Dojo.
 * Instead of asking for scores, it asks one easy question at a time: which of these two?
 * Each pick updates an Elo rating; after a handful the dojo has a full personal ranking,
 * and rank correlation shows which platform's taste is closest to the visitor's own.
 */
export function Dojo() {
  const { list, bySlug } = useCatalog();
  const record = useStore(dojo);
  const [pair, setPair] = useState<[string, string]>(["cowboy-bebop", "neon-genesis-evangelion"]);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const slugs = list.map((a) => a.slug);
  const advance = useCallback(
    (previous: [string, string]) => {
      const now = dojo.get();
      setPair(nextPair(slugs, now.elo, now.seen, previous));
      setPicked(null);
    },
    // The slug list never changes; depending on its identity would rebuild this every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const choose = useCallback(
    (side: 0 | 1) => {
      if (picked !== null) return;
      const [winner, loser] = side === 0 ? pair : [pair[1], pair[0]];
      dojo.set((d) => ({
        elo: duel(d.elo, winner, loser),
        seen: { ...d.seen, [winner]: (d.seen[winner] ?? 0) + 1, [loser]: (d.seen[loser] ?? 0) + 1 },
        played: d.played + 1,
      }));
      setPicked(side);
      timer.current = window.setTimeout(() => advance(pair), 620);
    },
    [pair, picked, advance],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.get().palette || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as Element).closest("input, select, textarea")) return;
      if (e.key === "ArrowLeft") choose(0);
      if (e.key === "ArrowRight") choose(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  const fought = list.filter((a) => record.seen[a.slug]);
  const ranking = [...fought].sort((a, b) => (record.elo[b.slug] ?? START_ELO) - (record.elo[a.slug] ?? START_ELO));
  const ready = record.played >= MIN_DUELS && fought.length >= 6;
  const alignment = ready
    ? YARDSTICKS.flatMap((y) => {
        const rows = fought.flatMap((a) => {
          const v = y.value(a);
          return v == null ? [] : [{ mine: record.elo[a.slug] ?? START_ELO, theirs: v }];
        });
        const rho = spearman(rows.map((r) => r.mine), rows.map((r) => r.theirs));
        return rho == null ? [{ ...y, rho: null as number | null, n: rows.length }] : [{ ...y, rho, n: rows.length }];
      })
    : [];
  const closest = alignment.filter((a) => a.rho != null).sort((a, b) => b.rho! - a.rho!)[0];
  const [left, right] = pair.map((s) => bySlug.get(s)!);

  return (
    <div className="shell pb-24 pt-[calc(var(--nav-h)+3rem)]">
      <SectionHeading as="h1" jp="道場" title="Versus dojo">
        Scores are hard; choosing between two is easy. Pick the title you would rather defend. Each choice re-rates both, and after {MIN_DUELS} duels the dojo shows your ranking and whose taste it resembles.
      </SectionHeading>

      {/* ── The arena ── */}
      <div className="relative mt-10">
        <div className="grid grid-cols-2 gap-1 sm:gap-2" role="group" aria-label="Choose between two titles">
          <AnimatePresence mode="popLayout" initial={false}>
            <Fighter key={`${left.slug}-L`} a={left} side={0} state={picked === null ? "ready" : picked === 0 ? "won" : "lost"} onPick={() => choose(0)} />
            <Fighter key={`${right.slug}-R`} a={right} side={1} state={picked === null ? "ready" : picked === 1 ? "won" : "lost"} onPick={() => choose(1)} />
          </AnimatePresence>
        </div>
        <span lang="ja" aria-hidden="true" className="t-jp pointer-events-none absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 rotate-12 place-items-center bg-red text-3xl text-bone sm:size-20 sm:text-5xl">
          対
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="t-num text-2xl" aria-live="polite">
          <Rolling value={pad2(record.played)} /> <span className="t-label text-mute">duels fought · {fought.length} of {list.length} titles tested</span>
        </p>
        <button type="button" className="t-label link text-mute hover:text-bone" disabled={picked !== null} onClick={() => advance(pair)}>
          Can’t choose — skip this pair
        </button>
        <span className="ml-auto flex items-center gap-2">
          {confirmReset ? (
            <>
              <span className="t-label text-mute">Erase all {record.played} duels?</span>
              <button type="button" className="btn btn-sm btn-solid" onClick={() => (dojo.set({ elo: {}, seen: {}, played: 0 }), setConfirmReset(false))}>
                Erase
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmReset(false)}>
                Keep
              </button>
            </>
          ) : (
            record.played > 0 && (
              <button type="button" className="t-label link inline-flex items-center gap-1.5 text-mute hover:text-bone" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={13} aria-hidden="true" /> Start over
              </button>
            )
          )}
        </span>
      </div>

      {/* ── Results ── */}
      <div className="mt-16 grid gap-x-14 gap-y-14 lg:grid-cols-2">
        <section aria-labelledby="dojo-ranking">
          <h2 id="dojo-ranking" className="t-display text-3xl">
            Your dojo ranking
          </h2>
          {ranking.length === 0 ? (
            <p className="t-serif mt-4 max-w-md text-mute">No duels yet. Your first choice above starts the ranking; titles appear here as soon as they have fought once.</p>
          ) : (
            <ol className="mt-5 border-t border-rule">
              {ranking.map((a, i) => (
                <motion.li key={a.slug} layout="position" transition={{ type: "spring", stiffness: 260, damping: 30 }} style={theme(a)} className="group grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-rule py-2">
                  <Rolling value={pad2(i + 1)} className="t-num text-3xl text-violet" />
                  <Link href={`/anime/${a.slug}`} className="flex min-w-0 items-center gap-3">
                    <span className="relative block h-12 w-9 shrink-0 overflow-hidden bg-deep">
                      <Image src={a.cover} alt="" fill sizes="36px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="t-display block truncate text-xl group-hover:text-accent">{a.title.display}</span>
                      <span className="t-label block !text-[0.62rem] text-mute">
                        {record.seen[a.slug]} duel{record.seen[a.slug] === 1 ? "" : "s"} · Editorial № {a.rank}
                      </span>
                    </span>
                  </Link>
                  <span className="t-num text-xl" data-tip="Elo rating: everyone starts at 1500" data-tip-side="right">
                    {Math.round(record.elo[a.slug] ?? START_ELO)}
                  </span>
                </motion.li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="dojo-taste">
          <h2 id="dojo-taste" className="t-display text-3xl">
            Whose taste is yours?
          </h2>
          {!ready ? (
            <div className="mt-4 max-w-md">
              <p className="t-serif text-mute">Fight at least {MIN_DUELS} duels across six or more titles and the dojo will compare your ranking with each platform’s.</p>
              <div className="mt-5 h-1 bg-rule" role="progressbar" aria-valuemin={0} aria-valuemax={MIN_DUELS} aria-valuenow={Math.min(record.played, MIN_DUELS)} aria-label="Duels fought toward the first reading">
                <div className="h-full bg-red transition-[width] duration-700 ease-ink" style={{ width: `${(Math.min(record.played, MIN_DUELS) / MIN_DUELS) * 100}%` }} />
              </div>
              <p className="t-label mt-2 text-mute">
                {Math.min(record.played, MIN_DUELS)} of {MIN_DUELS} duels
              </p>
            </div>
          ) : (
            <>
              {closest && (
                <p className="t-serif mt-4 max-w-lg text-lg">
                  So far your picks line up best with <strong style={{ color: closest.color }}>{closest.name}</strong> ({verdict(closest.rho!).toLowerCase()}). Keep fighting — the reading sharpens with every duel.
                </p>
              )}
              <ul className="mt-6 space-y-4">
                {alignment.map((y) => (
                  <li key={y.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-label" style={{ color: y.color }}>
                        {y.name}
                      </span>
                      <span className="t-label text-mute">{y.rho == null ? `Not enough overlap (${y.n} titles)` : `${verdict(y.rho)} · ρ ${y.rho.toFixed(2)}`}</span>
                    </div>
                    {/* A bar that grows right for agreement and left for disagreement, from a centre line. */}
                    <div className="relative mt-1.5 h-2 bg-ink-3">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-mute" />
                      {y.rho != null && <span className="absolute inset-y-0 transition-[left,width] duration-700 ease-ink" style={{ background: y.color, left: `${y.rho >= 0 ? 50 : 50 + y.rho * 50}%`, width: `${Math.abs(y.rho) * 50}%` }} />}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="t-label mt-5 normal-case tracking-normal text-mute">ρ is Spearman rank correlation between your Elo order and each yardstick, over the titles you have tested: 1 means the same order, −1 the reverse.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
