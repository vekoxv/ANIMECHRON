"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { compact, fixed, GENRES, SOURCES, YEAR_MAX, YEAR_MIN } from "@/lib/catalog";
import { disagreement, normalize } from "@/lib/scoring";
import type { Scored } from "@/lib/useCatalog";
import { SOURCE_IDS } from "@/lib/types";

/**
 * THE FIELD — one sheet instead of a wall of charts.
 * All twenty titles stay on the page as small covers; changing the question (or a weight)
 * makes them travel to new positions, so the reader watches the answer form.
 * Positions are CSS custom properties resolved against the sheet with container units,
 * so the browser animates plain transforms and no layout is measured in JS.
 */

type Mode = "standings" | "audience" | "dispute" | "time";
const MODES: { key: Mode; label: string; x: string; y: string; ask: string }[] = [
  { key: "standings", label: "Standings", x: "your score", y: "", ask: "Who leads, and by how much?" },
  { key: "audience", label: "Loved vs watched", x: "your score", y: "audience (AniList members, log scale)", ask: "Is the best-rated also the most watched?" },
  { key: "dispute", label: "Disputes", x: "score on each platform", y: "most contested at the top", ask: "Where do the platforms disagree?" },
  { key: "time", label: "Through time", x: "year of premiere", y: "your score", ask: "Did any era do it better?" },
];

/** Left edge and usable width of the plot inside the sheet, in percent. */
const X0 = 7;
const XW = 87;
const Y0 = 9;
const YH = 78;

/** Packs items into rows so that none overlaps its neighbour along x. Returns a row per item. */
export function lanes(xs: number[], gap: number): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const ends: number[] = [];
  const out = new Array<number>(xs.length).fill(0);
  for (const { x, i } of order) {
    let lane = ends.findIndex((end) => x - end >= gap);
    if (lane < 0) lane = ends.push(-Infinity) - 1;
    ends[lane] = x;
    out[i] = lane;
  }
  return out;
}

export function Field({ list, personalized }: { list: Scored[]; personalized: boolean }) {
  const [mode, setMode] = useState<Mode>("standings");
  const [lens, setLens] = useState<{ kind: "genre" | "studio"; value: string } | null>(null);
  const meta = MODES.find((m) => m.key === mode)!;

  const plot = useMemo(() => {
    const scored = list.filter((a) => a.personal != null);
    const platform = scored.flatMap((a) => SOURCE_IDS.flatMap((s) => normalize(a.ratings[s]) ?? []));
    const all = [...scored.map((a) => a.personal!), ...scored.flatMap((a) => (a.consensus == null ? [] : [a.consensus])), ...platform];
    const lo = Math.floor(Math.min(...all) * 5) / 5 - 0.1;
    const hi = Math.ceil(Math.max(...all) * 5) / 5 + 0.1;
    const sx = (v: number) => X0 + ((v - lo) / (hi - lo)) * XW;
    const sy = (v: number) => Y0 + YH - ((v - lo) / (hi - lo)) * YH;
    const pops = scored.map((a) => Math.log(a.popularity ?? 1));
    const [p0, p1] = [Math.min(...pops), Math.max(...pops)];
    const bySpread = [...scored].sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1) || a.rank - b.rank);
    const lane = lanes(scored.map((a) => sx(a.personal!)), 4.4);
    const laneCount = Math.max(...lane) + 1;

    const points = scored.map((a, i) => {
      const x = sx(a.personal!);
      const gap = disagreement(a.ratings);
      const sameYear = scored.filter((b) => b.year === a.year);
      const where: Record<Mode, [number, number]> = {
        standings: [x, 50 + (lane[i] - (laneCount - 1) / 2) * Math.min(15, 70 / laneCount)],
        audience: [x, Y0 + YH - ((Math.log(a.popularity ?? 1) - p0) / (p1 - p0)) * YH],
        dispute: [x, Y0 + (bySpread.indexOf(a) / (scored.length - 1)) * YH],
        time: [X0 + (((a.year ?? YEAR_MIN) - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * XW + (sameYear.indexOf(a) - (sameYear.length - 1) / 2) * 2.6, sy(a.personal!)],
      };
      return {
        a,
        where,
        editorialX: a.consensus == null ? x : sx(a.consensus),
        whisker: gap ? { from: sx(normalize(a.ratings[gap.low])!), to: sx(normalize(a.ratings[gap.high])!), low: gap.low, high: gap.high } : null,
      };
    });
    const step = hi - lo > 1.6 ? 0.5 : 0.2;
    const scoreTicks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => +(Math.ceil(lo / step) * step + i * step).toFixed(1)).filter((t) => t < hi);
    return { points, sx, sy, scoreTicks };
  }, [list]);

  const matches = (a: Scored) => !lens || (lens.kind === "genre" ? a.genres.includes(lens.value) : a.studio?.name === lens.value);
  const inLens = list.filter(matches);
  const rated = inLens.filter((a) => a.personal != null);
  const average = rated.length ? rated.reduce((n, a) => n + a.personal!, 0) / rated.length : null;
  const best = [...rated].sort((a, b) => b.personal! - a.personal!)[0];
  const studios = [...new Set(list.flatMap((a) => (a.studio ? [a.studio.name] : [])))].map((name) => ({ name, n: list.filter((a) => a.studio?.name === name).length })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  const xTicks = mode === "time" ? [1995, 2000, 2005, 2010, 2015, 2020].map((y) => ({ at: X0 + ((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * XW, label: String(y) })) : plot.scoreTicks.map((t) => ({ at: plot.sx(t), label: t.toFixed(1) }));
  const yTicks = mode === "time" ? plot.scoreTicks.map((t) => ({ at: plot.sy(t), label: t.toFixed(1) })) : [];

  return (
    <section aria-labelledby="field-title" className="paper -mx-(--gutter) px-(--gutter) py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p lang="ja" aria-hidden="true" className="t-jp text-red">
            一枚の図
          </p>
          <h2 id="field-title" className="t-display mt-2 text-[clamp(2.4rem,5vw,4.4rem)]">
            The field
          </h2>
        </div>
        <div role="tablist" aria-label="What the field shows" className="flex flex-wrap gap-x-6 gap-y-1">
          {MODES.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={mode === m.key} onClick={() => setMode(m.key)} className={`t-display border-b-[3px] pb-1 text-2xl transition-colors ${mode === m.key ? "border-red text-ink" : "border-transparent text-ink/40 hover:text-ink"}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <p className="t-serif mt-3 text-lg" aria-live="polite">
        {meta.ask}
      </p>

      {/* The sheet */}
      <div role="group" aria-label={`${meta.label}: each cover is a title. ${meta.ask}`} className="field-sheet relative mt-6 aspect-[4/5] border-2 border-ink sm:aspect-[16/10] lg:aspect-[2.35/1]">
        <p aria-hidden="true" className="t-display t-outline pointer-events-none absolute -bottom-[0.1em] right-2 text-[clamp(4rem,17cqw,15rem)] leading-none text-ink/15">
          {meta.label}
        </p>
        {xTicks.map((t) => (
          <span key={`${mode}-x-${t.label}`} aria-hidden="true" className="absolute inset-y-0 w-px bg-ink/10" style={{ left: `${t.at}%` }}>
            <span className="t-num absolute bottom-1 left-1.5 text-sm text-ink/60">{t.label}</span>
          </span>
        ))}
        {yTicks.map((t) => (
          <span key={`y-${t.label}`} aria-hidden="true" className="absolute inset-x-0 h-px bg-ink/10" style={{ top: `${t.at}%` }}>
            <span className="t-num absolute left-1.5 top-0.5 text-sm text-ink/60">{t.label}</span>
          </span>
        ))}

        {plot.points.map(({ a, where, editorialX, whisker }, i) => {
          const [x, y] = where[mode];
          const on = matches(a);
          const moved = a.consensusRank - a.personalRank;
          return (
            <div key={a.slug}>
              {/* Disputes: the stretch between the harshest and kindest platform. */}
              {whisker && (
                <span aria-hidden="true" className="absolute h-0.5 origin-left bg-red transition-[opacity,transform] duration-700 ease-ink" style={{ left: `${whisker.from}%`, width: `${whisker.to - whisker.from}%`, top: `${where.dispute[1]}%`, opacity: mode === "dispute" && on ? 1 : 0, transform: `scaleX(${mode === "dispute" ? 1 : 0})`, transitionDelay: `${i * 18}ms` }}>
                  <span className="absolute -left-1 -top-1 size-2.5 rotate-45" style={{ background: SOURCES[whisker.low].color }} />
                  <span className="absolute -right-1 -top-1 size-2.5 rotate-45" style={{ background: SOURCES[whisker.high].color }} />
                </span>
              )}
              {/* Standings, once personalised: a violet trace back to where the editors' weighting put it. */}
              {personalized && mode === "standings" && Math.abs(editorialX - x) > 0.4 && (
                <span aria-hidden="true" className="absolute h-px bg-violet" style={{ left: `${Math.min(x, editorialX)}%`, width: `${Math.abs(editorialX - x)}%`, top: `${y}%`, opacity: on ? 0.9 : 0.1 }}>
                  <span className={`absolute -top-[3px] size-[7px] rounded-full border border-violet bg-paper ${editorialX < x ? "-left-1" : "-right-1"}`} />
                </span>
              )}
              <Link
                href={`/anime/${a.slug}`}
                aria-label={`${a.title.display}: your score ${fixed(a.personal, 2)}, rank ${a.personalRank}, ${a.year}, ${compact(a.popularity)} members`}
                data-tip={`${a.title.display} · ${fixed(a.personal, 2)} · ${a.year} · ${compact(a.popularity)} members`}
                data-tip-side={x > 68 ? "right" : x < 32 ? "left" : undefined}
                className="field-chip group absolute left-0 top-0 block"
                style={{ "--x": x, "--y": y, "--i": i, opacity: on ? 1 : 0.12, zIndex: on ? 2 : 1 } as CSSProperties}
              >
                <span className="relative block aspect-[2/3] w-full overflow-hidden border-2 border-ink bg-ink transition-transform duration-300 ease-ink group-hover:scale-[1.7] group-focus-visible:scale-[1.7]">
                  <Image src={a.cover} alt="" fill sizes="48px" className="object-cover" />
                </span>
                <span className="t-num absolute -left-1.5 -top-1.5 grid min-w-5 place-items-center bg-ink px-1 text-xs leading-5 text-paper">
                  {a.personalRank}
                  {personalized && moved !== 0 && <span className={`absolute -right-2 -top-1 text-[0.6rem] ${moved > 0 ? "text-cyan" : "text-red"}`}>{moved > 0 ? "▲" : "▼"}</span>}
                </span>
              </Link>
            </div>
          );
        })}
        <p className="t-label absolute bottom-1.5 right-2 bg-paper px-1 !text-[0.62rem] text-ink/70">{meta.x} →</p>
        {meta.y && <p className="t-label absolute right-2 top-1.5 bg-paper px-1 !text-[0.62rem] text-ink/70">↑ {meta.y}</p>}
      </div>

      {/* Lenses: light up one genre or one studio, with its numbers. */}
      <div className="mt-5 grid gap-x-10 gap-y-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="t-label mb-2 text-ink/60">Light up a genre</p>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => {
              const on = lens?.kind === "genre" && lens.value === g;
              return (
                <button key={g} type="button" aria-pressed={on} onClick={() => setLens(on ? null : { kind: "genre", value: g })} className={`t-label border px-2.5 py-1.5 transition-colors ${on ? "border-ink bg-ink text-paper" : "border-ink/30 hover:border-ink"}`}>
                  {g} <span className="t-num ml-1 text-sm">{list.filter((a) => a.genres.includes(g)).length}</span>
                </button>
              );
            })}
          </div>
        </div>
        <label className="block min-w-56">
          <span className="t-label mb-2 block text-ink/60">Or a studio</span>
          <select className="w-full border border-ink/40 bg-transparent px-3 py-2 text-sm" value={lens?.kind === "studio" ? lens.value : ""} onChange={(e) => setLens(e.target.value ? { kind: "studio", value: e.target.value } : null)}>
            <option value="">All {studios.length} studios</option>
            {studios.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.n})
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-4 border-t-2 border-ink pt-3 text-[0.95rem]" aria-live="polite">
        <strong className="t-display mr-2 text-2xl">{lens ? lens.value : "All titles"}</strong>
        {inLens.length} title{inLens.length === 1 ? "" : "s"} · average {fixed(average, 2)}
        {best ? ` · highest: ${best.title.display} (${fixed(best.personal, 2)})` : ""}
        {personalized ? " · by your weighting" : " · by the editorial weighting"}
      </p>
    </section>
  );
}
