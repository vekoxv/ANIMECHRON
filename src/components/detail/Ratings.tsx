"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FieldStrip, Radar } from "@/components/charts/Charts";
import { Weights } from "@/components/ratings/Weights";
import { Dial, Origin, SectionHeading } from "@/components/ui/Bits";
import { Rolling } from "@/components/ui/motion";
import { Reveal } from "@/components/ui/Reveal";
import { compact, fixed, formatStamp, SOURCES } from "@/lib/catalog";
import { disagreement, normalize, percentile } from "@/lib/scoring";
import type { Scored } from "@/lib/useCatalog";
import { SOURCE_IDS } from "@/lib/types";

const AXIS_LO = 6;
/** Position on the shared axis, as a number 0–100. */
const axisAt = (v: number) => Math.max(0, Math.min(100, ((v - AXIS_LO) / (10 - AXIS_LO)) * 100));
const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/**
 * C. The verdicts, as one figure instead of four cards: each platform's score is set large in a
 * column, and a line drops from every score onto a single shared scale underneath, so the reader
 * sees the numbers and how far apart they are in the same glance. Platforms without a verified
 * score get a hatched blank and the reason — never a number.
 */
function VerdictSheet({ a }: { a: Scored }) {
  const gap = disagreement(a.ratings);
  return (
    <Reveal>
      <figure className="mt-12">
        <div className="grid grid-cols-2 border-t-2 border-bone lg:grid-cols-4">
          {SOURCE_IDS.map((source, i) => {
            const r = a.ratings[source];
            const meta = SOURCES[source];
            const value = normalize(r);
            return (
              <div key={source} className="rise flex flex-col border-b border-rule px-3 pb-5 pt-4 sm:px-5 lg:border-b-0 lg:[&:not(:first-child)]:border-l" style={{ "--d": `${i * 90}ms` } as CSSProperties}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="t-display text-2xl">{meta.name}</h3>
                  <Origin rating={r} />
                </div>
                {value == null ? (
                  <div className="hatch mt-3 grid h-[clamp(4.5rem,9vw,8.5rem)] place-items-center text-mute">
                    <span className="t-display bg-ink px-2 text-2xl">Unavailable</span>
                  </div>
                ) : (
                  <p className="t-num mt-3 text-[clamp(4.5rem,9vw,8.5rem)]" style={{ color: meta.color }}>
                    <Rolling value={fixed(value, 1)} />
                  </p>
                )}
                <p className="mt-3 flex-1 text-xs leading-relaxed text-mute">
                  {value != null && (
                    <span className="mb-1 block text-bone/80">
                      {r.max === 10 ? "Native 10-point scale" : `From ${r.score} / ${r.max}`} · {r.votes == null ? "rating count not published" : `${compact(r.votes)} ratings`} · read {formatStamp(r.retrievedAt)}
                    </span>
                  )}
                  {r.note}
                </p>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="t-label link mt-3 inline-flex items-center gap-1.5 self-start">
                    View on {meta.name} <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Each score falls from its column onto the one scale they all share. */}
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="drops hidden h-24 w-full lg:block">
          {SOURCE_IDS.map((source, i) => {
            const value = normalize(a.ratings[source]);
            if (value == null) return null;
            const from = 12.5 + i * 25;
            const to = axisAt(value);
            return <path key={source} d={`M ${from} 0 C ${from} 60, ${to} 40, ${to} 100`} pathLength={1} fill="none" stroke={SOURCES[source].color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ "--d": `${350 + i * 110}ms` } as CSSProperties} />;
          })}
        </svg>

        <div className="relative mt-10 h-16 lg:mt-0">
          <div className="absolute inset-x-0 top-0 h-px bg-rule" />
          {[6, 7, 8, 9, 10].map((t) => (
            <span key={t} className="absolute top-0 h-2.5 w-px bg-mute" style={{ left: `${axisAt(t)}%` }}>
              <span className="t-num absolute left-1/2 top-4 -translate-x-1/2 text-sm text-mute">{t}</span>
            </span>
          ))}
          {gap && <span className="draw absolute top-0 -mt-px h-[3px] bg-red" style={{ left: `${axisAt(normalize(a.ratings[gap.low])!)}%`, width: `${axisAt(normalize(a.ratings[gap.high])!) - axisAt(normalize(a.ratings[gap.low])!)}%`, "--d": "900ms" } as CSSProperties} />}
          {SOURCE_IDS.map((source) => {
            const value = normalize(a.ratings[source]);
            if (value == null) return null;
            return (
              <span key={source} className="absolute top-0 -translate-x-1/2 -translate-y-1/2" style={{ left: `${axisAt(value)}%` }}>
                <span className="block size-3.5 rotate-45" style={{ background: SOURCES[source].color }} />
                <span className="t-label absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap lg:hidden" style={{ color: SOURCES[source].color }}>
                  {SOURCES[source].short}
                </span>
              </span>
            );
          })}
        </div>
        <figcaption className="t-label mt-1 flex flex-wrap justify-between gap-x-6 gap-y-1 text-mute">
          <span>One 10-point scale. It starts at {AXIS_LO}, not 0, so small gaps stay visible.</span>
          <span>{gap ? `${SOURCES[gap.high].name} is kindest, ${SOURCES[gap.low].name} harshest: ${fixed(gap.spread, 2)} apart` : "Fewer than two platforms have a score, so there is no gap to show"}</span>
        </figcaption>
      </figure>
    </Reveal>
  );
}

export function Ratings({ a, all, personalized }: { a: Scored; all: Scored[]; personalized: boolean }) {
  const scored = SOURCE_IDS.filter((s) => a.ratings[s].score != null);
  const missing = SOURCE_IDS.filter((s) => a.ratings[s].score == null);

  // Radar: platform scores on a 6–10 scale, plus audience measures as percentiles within the twenty.
  const pops = all.map((x) => x.popularity ?? 0);
  const favs = all.map((x) => x.favourites ?? 0);
  const spreads = all.map((x) => x.spread ?? 0);
  const shape = (x: Scored) => [
    ...scored.map((source) => {
      const v = normalize(x.ratings[source]);
      return v == null ? 0 : (v - AXIS_LO) / (10 - AXIS_LO);
    }),
    percentile(pops, x.popularity ?? 0),
    percentile(favs, x.favourites ?? 0),
    1 - percentile(spreads, x.spread ?? 0) + 1 / all.length,
  ];
  const axes = [...scored.map((s) => SOURCES[s].name), "Audience", "Favourites", "Agreement"];
  const mean = axes.map((_, i) => all.reduce((n, x) => n + shape(x)[i], 0) / all.length);

  return (
    <section id="ratings" aria-label="Ratings" className="scroll-mt-(--nav-h) overflow-hidden bg-ink py-[clamp(4rem,9vw,8rem)]">
      <div className="shell">
        <SectionHeading jp="評価" title="The verdicts">
          {scored.length ? `Built from ${list(scored.map((s) => SOURCES[s].name))}, each put on a 10-point scale and averaged.` : "No platform has a verified score for this title yet."}
          {missing.length > 0 && ` ${list(missing.map((s) => SOURCES[s].name))} ${missing.length === 1 ? "has" : "have"} no verified score here and ${missing.length === 1 ? "is" : "are"} left out — never counted as zero.`}
        </SectionHeading>

        <VerdictSheet a={a} />

        <div className="mt-20 grid gap-x-14 gap-y-14 lg:grid-cols-12">
          {/* Weighted overall + the console */}
          <Reveal className="lg:col-span-5">
            <h3 className="t-display text-3xl">Weigh it yourself</h3>
            <div className="mt-6 flex items-center gap-6">
              <Dial value={personalized ? a.personal : a.consensus} size={132} color={personalized ? "var(--color-violet)" : "var(--a)"} label={personalized ? "Your score" : "Overall"} />
              <dl className="t-num space-y-2">
                <div>
                  <dt className="t-label !text-[0.62rem] text-mute">Editorial weighting</dt>
                  <dd className="text-2xl">
                    {fixed(a.consensus, 2)} <span className="text-base text-mute">· #{a.consensusRank} of {all.length}</span>
                  </dd>
                </div>
                <div>
                  <dt className="t-label !text-[0.62rem] text-violet">Your weighting</dt>
                  <dd className={`text-2xl ${personalized ? "text-violet" : "text-mute"}`}>
                    {personalized ? (
                      <>
                        {fixed(a.personal, 2)} <span className="text-base">· #{a.personalRank} of {all.length}</span>
                      </>
                    ) : (
                      <span className="text-base">Move a slider to make it yours</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-7">
              <Weights ratings={a.ratings} />
            </div>
            <Link href="/intel#method" className="t-label link mt-5 inline-block text-mute hover:text-bone">
              How the overall score is built
            </Link>
          </Reveal>

          <Reveal className="lg:col-span-7">
            <h3 className="t-display text-3xl">Among the twenty</h3>
            <p className="mt-2 text-sm text-mute">Each mark is a title, placed by its overall score. Hover or tab to a mark to see which.</p>
            <div className="mt-10">
              <FieldStrip list={all} highlight={a.slug} />
            </div>
            <div className="mt-10 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
              <div className="text-bone">
                <Radar axes={axes} series={[{ name: a.title.display, color: "var(--a)", values: shape(a) }, { name: "Collection average", color: "var(--color-bone)", values: mean }]} />
              </div>
              <ul className="t-label space-y-2 text-mute">
                <li className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-accent" /> {a.title.display}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-0 w-5 border-t border-dashed border-bone" /> Average of the twenty
                </li>
                <li className="max-w-52 pt-2 normal-case tracking-normal">Scores run 6–10 from the centre. Audience, favourites and agreement are ranks within the collection.</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
