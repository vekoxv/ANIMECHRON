"use client";

import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Radar } from "@/components/charts/Charts";
import { Art } from "@/components/ui/Art";
import { SectionHeading } from "@/components/ui/Bits";
import { Reveal } from "@/components/ui/Reveal";
import { compact, fixed, lengthOf, minutesOf, pad2, pretty, SOURCES, theme } from "@/lib/catalog";
import { normalize, percentile } from "@/lib/scoring";
import { useCatalog } from "@/lib/useCatalog";
import type { Scored } from "@/lib/useCatalog";
import { SOURCE_IDS } from "@/lib/types";

const MAX = 3;
const hours = (a: Scored) => {
  const m = minutesOf(a);
  return m == null ? null : m / 60;
};

/** One row of the fact sheet. Numeric rows mark the highest value. */
function Fact({ label, picks, value, show, note }: { label: string; picks: Scored[]; value?: (a: Scored) => number | null; show: (a: Scored) => ReactNode; note?: string }) {
  const values = value ? picks.map(value) : [];
  const best = values.length ? Math.max(...values.map((v) => v ?? -Infinity)) : null;
  return (
    <tr className="border-b border-rule">
      <th scope="row" className="t-label w-36 py-3 pr-4 text-left align-top font-semibold text-mute">
        {label}
        {note && <span className="mt-1 block normal-case tracking-normal opacity-70">{note}</span>}
      </th>
      {picks.map((a, i) => {
        const top = value && picks.length > 1 && values[i] != null && values[i] === best && values.filter((v) => v === best).length === 1;
        return (
          <td key={a.slug} className="py-3 pr-4 align-top" style={theme(a)}>
            <span className={top ? "font-semibold text-accent" : ""}>{show(a)}</span>
            {top && <span className="t-label ml-2 !text-[0.58rem] text-accent">Highest</span>}
          </td>
        );
      })}
    </tr>
  );
}

/** The comparison laboratory: two or three titles measured against each other on everything the archive knows. */
export function Lab() {
  const { list, bySlug } = useCatalog();
  const [slugs, setSlugs] = useState(["fullmetal-alchemist-brotherhood", "frieren"]);
  const picks = slugs.flatMap((s) => bySlug.get(s) ?? []);
  const free = list.filter((a) => !slugs.includes(a.slug));
  const swap = (i: number, slug: string) => setSlugs((s) => s.map((x, n) => (n === i ? slug : x)));

  // Platforms at least one of the picked titles has a score on.
  const sources = SOURCE_IDS.filter((s) => picks.some((a) => a.ratings[s].score != null));
  const pops = list.map((a) => a.popularity ?? 0);
  const favs = list.map((a) => a.favourites ?? 0);
  const spreads = list.map((a) => a.spread ?? 0);
  const axes = [...sources.map((s) => SOURCES[s].name), "Audience", "Favourites", "Agreement"];
  const shape = (a: Scored) => [
    ...sources.map((s) => {
      const v = normalize(a.ratings[s]);
      return v == null ? 0 : (v - 6) / 4;
    }),
    percentile(pops, a.popularity ?? 0),
    percentile(favs, a.favourites ?? 0),
    1 - percentile(spreads, a.spread ?? 0) + 1 / list.length,
  ];

  const shared = picks.length ? picks[0].genres.filter((g) => picks.every((a) => a.genres.includes(g))) : [];
  const leader = [...picks].sort((a, b) => (b.consensus ?? 0) - (a.consensus ?? 0))[0];
  const biggest = [...picks].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];

  return (
    <div className="shell pb-24 pt-[calc(var(--nav-h)+3rem)]">
      <SectionHeading as="h1" jp="比較" title="Comparison lab">
        Put two or three titles on the bench. Ratings, scale, audience and cast are set side by side, with the highest value marked in each row.
      </SectionHeading>

      {/* ── The bench ── */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {picks.map((a, i) => (
            <motion.div key={a.slug} layout style={theme(a)} className="relative bg-deep" initial={{ opacity: 0, clipPath: "polygon(0 0, 0 0, -20% 100%, -20% 100%)" }} animate={{ opacity: 1, clipPath: "polygon(0 0, 120% 0, 100% 100%, 0 100%)" }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}>
              <div className="h-1 bg-accent" />
              <div className="grid grid-cols-[5.5rem_1fr] gap-4 p-4">
                <Link href={`/anime/${a.slug}`} aria-label={`Open ${a.title.display}`}>
                  <Art src={a.cover} alt="" sizes="88px" className="aspect-[2/3] w-full" />
                </Link>
                <div className="min-w-0">
                  <p className="t-num text-accent">
                    № {pad2(a.rank)} · {a.year}
                  </p>
                  <h2 className="t-display mt-1 line-clamp-2 text-2xl">{a.title.display}</h2>
                  <p className="t-num mt-2 text-4xl">{fixed(a.consensus, 2)}</p>
                  <label className="mt-3 block">
                    <span className="sr-only">Replace {a.title.display} with another title</span>
                    <select className="field w-full" value={a.slug} onChange={(e) => swap(i, e.target.value)}>
                      <option value={a.slug}>{a.title.display}</option>
                      {free.map((f) => (
                        <option key={f.slug} value={f.slug}>
                          {f.title.display}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              {picks.length > 2 && (
                <button type="button" onClick={() => setSlugs((s) => s.filter((x) => x !== a.slug))} aria-label={`Remove ${a.title.display} from the comparison`} className="absolute right-2 top-3 grid size-9 place-items-center bg-ink/70 hover:bg-red">
                  <X size={15} />
                </button>
              )}
            </motion.div>
          ))}
          {picks.length < MAX && (
            <motion.label key="add" layout className="grid min-h-40 cursor-pointer place-items-center border border-dashed border-rule p-4 text-center transition-colors hover:border-bone">
              <span>
                <Plus className="mx-auto text-mute" aria-hidden="true" />
                <span className="t-label mt-2 block text-mute">Add a third title</span>
                <select className="field mt-3" value="" onChange={(e) => e.target.value && setSlugs((s) => [...s, e.target.value])} aria-label="Add a third title to compare">
                  <option value="">Choose a title</option>
                  {free.map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.title.display}
                    </option>
                  ))}
                </select>
              </span>
            </motion.label>
          )}
        </AnimatePresence>
      </div>

      <p className="t-serif mt-8 max-w-3xl text-lg text-bone/85" aria-live="polite">
        {leader.title.display} has the highest overall score of the {picks.length === 2 ? "two" : "three"} at {fixed(leader.consensus, 2)}
        {biggest === leader ? ", and the largest audience too." : `; ${biggest.title.display} has the largest audience, with ${compact(biggest.popularity)} AniList members.`}
        {shared.length > 0 ? ` All of them are ${shared.join(", ").toLowerCase()}.` : " They share no genre."}
      </p>

      <div className="mt-14 grid gap-x-14 gap-y-14 lg:grid-cols-12">
        {/* ── Ratings, platform by platform ── */}
        <Reveal className="lg:col-span-7">
          <h2 className="t-display text-3xl">Platform by platform</h2>
          <p className="mb-6 mt-2 text-sm text-mute">Scores on a common 10-point scale. Bars start at 6 so the differences can be seen.</p>
          <div className="space-y-6">
            {[...SOURCE_IDS, "overall" as const].map((row) => (
              <div key={row}>
                <p className="t-label mb-2" style={{ color: row === "overall" ? undefined : SOURCES[row].color }}>
                  {row === "overall" ? "Overall" : SOURCES[row].name}
                </p>
                <div className="space-y-1.5">
                  {picks.map((a) => {
                    const v = row === "overall" ? a.consensus : normalize(a.ratings[row]);
                    return (
                      <div key={a.slug} className="grid grid-cols-[minmax(0,7rem)_1fr_3rem] items-center gap-3 sm:grid-cols-[minmax(0,15rem)_1fr_3rem]" style={theme(a)}>
                        <span className="truncate text-sm text-bone/80">{a.title.display}</span>
                        {v == null ? (
                          <span className="t-label border-t border-dashed border-rule pt-1 !text-[0.62rem] text-mute" data-tip={row === "overall" ? undefined : a.ratings[row].note} data-tip-side="left">
                            Unavailable
                          </span>
                        ) : (
                          <span className="block h-2.5 bg-ink-3">
                            <motion.span className="block h-full bg-accent" initial={false} animate={{ width: `${Math.max(2, Math.min(100, ((v - 6) / 4) * 100))}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                          </span>
                        )}
                        <span className="t-num text-right text-lg">{v == null ? "—" : fixed(v, row === "overall" ? 2 : 1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5">
          <h2 className="t-display text-3xl">Shape of each title</h2>
          <p className="mb-4 mt-2 text-sm text-mute">Scores run 6–10 from the centre; audience, favourites and agreement are ranks within the twenty.</p>
          <Radar axes={axes} series={picks.map((a) => ({ name: a.title.display, color: a.palette.accent, values: shape(a) }))} />
          <ul className="t-label mt-4 flex flex-wrap gap-x-5 gap-y-2 text-mute">
            {picks.map((a) => (
              <li key={a.slug} className="flex items-center gap-2">
                <span className="size-2.5" style={{ background: a.palette.accent }} /> {a.title.display}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* ── Fact sheet ── */}
      <Reveal className="mt-16">
        <h2 className="t-display text-3xl">The record</h2>
        <div className="-mx-(--gutter) mt-5 overflow-x-auto px-(--gutter)">
          <table className="w-full min-w-[34rem] border-collapse border-t-2 border-bone text-[0.95rem]">
            <caption className="sr-only">Facts about each compared title</caption>
            <thead>
              <tr className="border-b border-rule">
                <td />
                {picks.map((a) => (
                  <th key={a.slug} scope="col" className="t-display py-3 pr-4 text-left text-xl font-normal" style={{ color: a.palette.accent }}>
                    {a.title.display}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Fact label="Released" picks={picks} show={(a) => a.year ?? "—"} />
              <Fact label="Format" picks={picks} show={(a) => (a.format === "MOVIE" ? "Film" : "TV series")} />
              <Fact label="Length" picks={picks} show={lengthOf} />
              <Fact label="Time to watch" note="this entry" picks={picks} value={hours} show={(a) => (hours(a) == null ? "Ongoing — no total" : `${fixed(hours(a), 1)} hours`)} />
              <Fact label="Studio" picks={picks} show={(a) => a.studio?.name ?? "—"} />
              <Fact label="Source" picks={picks} show={(a) => pretty(a.source)} />
              <Fact label="Audience" note="AniList members" picks={picks} value={(a) => a.popularity} show={(a) => compact(a.popularity)} />
              <Fact label="Favourites" note="on AniList" picks={picks} value={(a) => a.favourites} show={(a) => compact(a.favourites)} />
              <Fact label="Ratings read" note="all platforms" picks={picks} value={(a) => SOURCE_IDS.reduce((n, s) => n + (a.ratings[s].votes ?? 0), 0)} show={(a) => compact(SOURCE_IDS.reduce((n, s) => n + (a.ratings[s].votes ?? 0), 0))} />
              <Fact label="Characters" note="on file here" picks={picks} show={(a) => `${a.characters.length} (${a.characters.filter((c) => c.role === "MAIN").length} main)`} />
              <Fact label="Genres" picks={picks} show={(a) => a.genres.map((g) => <span key={g} className={`mr-1.5 inline-block ${shared.includes(g) ? "font-semibold text-bone" : "text-mute"}`}>{g}</span>)} />
            </tbody>
          </table>
        </div>
        <p className="t-label mt-3 text-mute">Genres in bold are shared by every title on the bench.</p>
      </Reveal>
    </div>
  );
}
