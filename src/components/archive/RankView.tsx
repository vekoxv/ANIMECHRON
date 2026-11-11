"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Rolling } from "@/components/ui/motion";
import { WatchToggle } from "@/components/ui/Watch";
import { compact, fixed, pad2, SOURCES, theme } from "@/lib/catalog";
import { normalize } from "@/lib/scoring";
import type { Scored } from "@/lib/useCatalog";
import type { SourceId } from "@/lib/types";
import { LAYOUT_SPRING } from "./GridView";
import type { Item } from "./GridView";
import type { SortKey } from "./logic";

interface Props {
  items: Item[];
  sort: SortKey;
  ascending: boolean;
  onSort: (key: SortKey) => void;
}

/** A platform score with a thin bar on a 6–10 axis, or an honest dash with the reason on hover. */
function PlatformCell({ a, source }: { a: Scored; source: SourceId }) {
  const rating = a.ratings[source];
  const value = normalize(rating);
  if (value == null) {
    return (
      <span className="text-rule" data-tip={rating.note} data-tip-side="right" tabIndex={0}>
        —<span className="sr-only">Unavailable. {rating.note}</span>
      </span>
    );
  }
  return (
    <span className="inline-block w-14 text-left">
      <span className="t-num text-lg">{fixed(value, 1)}</span>
      <span className="mt-1 block h-0.5 bg-rule">
        <span className="block h-full transition-[width] duration-700 ease-ink" style={{ width: `${Math.max(0, Math.min(100, ((value - 6) / 4) * 100))}%`, background: SOURCES[source].color }} />
      </span>
    </span>
  );
}

/** Mode C — the dense ranking: every platform, the consensus, the spread and the audience on one line. */
export function RankView({ items, sort, ascending, onSort }: Props) {
  const head = (k: SortKey, label: string, className = "") => {
    const on = sort === k;
    const Icon = on ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th key={k} scope="col" aria-sort={on ? (ascending ? "ascending" : "descending") : "none"} className={`px-2 py-3 text-left font-normal ${className}`}>
        <button type="button" onClick={() => onSort(k)} className={`t-label inline-flex items-center gap-1.5 transition-colors hover:text-bone ${on ? "text-bone" : "text-mute"}`}>
          {label}
          <Icon size={12} className={on ? "text-red" : "opacity-50"} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <div className="-mx-(--gutter) overflow-x-auto px-(--gutter)">
      <table className="w-full min-w-[42rem] border-collapse">
        <caption className="sr-only">The collection ranked. Platform scores are shown on a common 10-point scale.</caption>
        <thead>
          <tr className="border-b border-rule">
            {head("editorial", "№", "w-16")}
            {head("title", "Title")}
            {head("year", "Year", "hidden md:table-cell")}
            {head("anilist", "AniList")}
            {head("mal", "MAL")}
            {head("imdb", "IMDb")}
            <th scope="col" className="hidden px-2 py-3 text-left font-normal lg:table-cell">
              <span className="t-label text-mute">TMDB</span>
            </th>
            {head("consensus", "Overall")}
            <th scope="col" className="hidden px-2 py-3 text-left font-normal xl:table-cell">
              <span className="t-label text-mute" data-tip="Highest minus lowest platform score">
                Spread
              </span>
            </th>
            {head("popularity", "Audience", "hidden lg:table-cell")}
            <th scope="col" className="w-12">
              <span className="sr-only">Watchlist</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ a, position, match }) => (
            <motion.tr key={a.slug} layout="position" transition={{ layout: LAYOUT_SPRING }} style={theme(a)} className="group border-b border-rule/60 transition-colors hover:bg-ink-2">
              <td className="relative px-2 py-2.5">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-accent transition-transform duration-300 group-hover:scale-y-100" />
                <Rolling value={pad2(position)} className="t-num text-3xl" />
              </td>
              <th scope="row" className="px-2 py-2.5 text-left font-normal">
                <Link href={`/anime/${a.slug}`} className="flex items-center gap-3">
                  <span className="relative block h-14 w-10 shrink-0 overflow-hidden bg-deep">
                    <Image src={a.cover} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="t-display block truncate text-xl transition-colors group-hover:text-accent sm:text-2xl">{a.title.display}</span>
                    <span className="t-label block truncate !text-[0.62rem] text-mute">
                      {match || `${a.studio?.name} · ${a.format === "MOVIE" ? "Film" : "TV"} · Editorial № ${a.rank}`}
                    </span>
                  </span>
                </Link>
              </th>
              <td className="t-num hidden px-2 text-lg text-bone/80 md:table-cell">{a.year}</td>
              <td className="px-2"><PlatformCell a={a} source="anilist" /></td>
              <td className="px-2"><PlatformCell a={a} source="mal" /></td>
              <td className="px-2"><PlatformCell a={a} source="imdb" /></td>
              <td className="hidden px-2 lg:table-cell"><PlatformCell a={a} source="tmdb" /></td>
              <td className="px-2">
                <span className="t-num text-2xl text-accent">{fixed(a.consensus, 2)}</span>
              </td>
              <td className="t-num hidden px-2 text-lg text-bone/70 xl:table-cell">{fixed(a.spread, 2)}</td>
              <td className="t-num hidden px-2 text-lg text-bone/70 lg:table-cell" data-tip="AniList members who list this title">
                {compact(a.popularity)}
              </td>
              <td className="px-1">
                <WatchToggle slug={a.slug} title={a.title.display} className="!size-9 border-transparent bg-transparent" />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
