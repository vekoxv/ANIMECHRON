"use client";

import { ArrowDown, ArrowUp, BookOpen, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Empty, SectionHeading } from "@/components/ui/Bits";
import { DECADES, GENRES, STUDIOS, YEAR_MAX, YEAR_MIN } from "@/lib/catalog";
import { prefs, useStore } from "@/lib/store";
import type { ViewMode } from "@/lib/store";
import { useCatalog } from "@/lib/useCatalog";
import { GridView } from "./GridView";
import type { Item } from "./GridView";
import { activeCount, ascendingByDefault, matches, searchMatch, sortEntries, SORTS } from "./logic";
import type { Filters, SortKey } from "./logic";
import { MangaView } from "./MangaView";
import { RankView } from "./RankView";

const DEFAULTS: Filters = { q: "", genres: [], studio: "", format: "ALL", minScore: 0, decade: null, yearFrom: YEAR_MIN, yearTo: YEAR_MAX };
const SCORE_ANY = 6.9;
const YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i);
const VIEWS: { mode: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { mode: "grid", label: "Cinematic grid", icon: LayoutGrid },
  { mode: "manga", label: "Manga layout", icon: BookOpen },
  { mode: "rank", label: "Ranking table", icon: Rows3 },
];

export function Archive() {
  const { list, personalized } = useCatalog();
  const view = useStore(prefs).view;
  const [filters, setFilters] = useState(DEFAULTS);
  const [sort, setSort] = useState<SortKey>("editorial");
  const [ascending, setAscending] = useState(true);
  const [panel, setPanel] = useState(false);

  const patch = (change: Partial<Filters>) => setFilters((f) => ({ ...f, ...change }));
  const chooseSort = (key: SortKey) => {
    if (key === sort) return setAscending((a) => !a);
    setSort(key);
    setAscending(ascendingByDefault(key));
  };

  // Positions come from the whole collection, so a filtered title keeps its true place.
  const items = useMemo<Item[]>(() => {
    const ordered = sortEntries(list, sort, ascending);
    return ordered.flatMap((a, i) => (matches(a, filters) ? [{ a, position: i + 1, match: searchMatch(a, filters.q) ?? "" }] : []));
  }, [list, filters, sort, ascending]);

  const active = activeCount(filters, DEFAULTS);
  const sortMeta = SORTS.find((s) => s.key === sort)!;

  return (
    <div className="shell pb-24 pt-[calc(var(--nav-h)+3rem)]">
      <SectionHeading as="h1" jp="書庫" title="The archive">
        Twenty titles, three ways to read them. Search across titles, characters, genres and studios; every filter narrows the others.
      </SectionHeading>

      {/* ── Toolbar ── */}
      <div className="sticky top-(--nav-h) z-30 -mx-(--gutter) mt-10 border-y border-rule bg-ink/95 px-(--gutter) py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-52 flex-1">
            <span className="sr-only">Search titles, characters, genres and studios</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden="true" />
            <input type="search" value={filters.q} onChange={(e) => patch({ q: e.target.value })} placeholder="Search a title, character, genre or studio" className="field w-full pl-9" />
          </label>

          <button type="button" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-controls="archive-filters" className="chip min-h-10" data-on={active > 0}>
            <SlidersHorizontal size={14} aria-hidden="true" /> Filters{active > 0 ? ` · ${active}` : ""}
          </button>

          <label className="flex items-center gap-2">
            <span className="t-label hidden text-mute sm:inline">Sort</span>
            <select value={sort} onChange={(e) => chooseSort(e.target.value as SortKey)} className="field" aria-label="Sort by">
              {SORTS.filter((s) => s.key !== "personal" || personalized).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setAscending(!ascending)} className="field grid w-10 place-items-center !px-0" aria-label={ascending ? "Ascending. Switch to descending" : "Descending. Switch to ascending"} data-tip={ascending ? "Ascending" : "Descending"}>
            {ascending ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </button>

          <div role="group" aria-label="Display mode" className="ml-auto flex">
            {VIEWS.map(({ mode, label, icon: Icon }) => (
              <button key={mode} type="button" aria-pressed={view === mode} aria-label={label} data-tip={label} data-tip-side="right" onClick={() => prefs.set((p) => ({ ...p, view: mode }))} className="chip -ml-px min-h-10 w-11 justify-center !px-0 first:ml-0">
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {panel && (
            <motion.div id="archive-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="grid max-h-[60vh] gap-x-8 gap-y-5 overflow-y-auto pb-2 pt-5 lg:grid-cols-[1.5fr_1fr]">
                <fieldset>
                  <legend className="t-label mb-2 text-mute">Genre — a title must have all you pick</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.map((g) => {
                      const on = filters.genres.includes(g);
                      return (
                        <button key={g} type="button" className="chip" aria-pressed={on} onClick={() => patch({ genres: on ? filters.genres.filter((x) => x !== g) : [...filters.genres, g] })}>
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <fieldset>
                    <legend className="t-label mb-2 text-mute">Format</legend>
                    <div className="flex">
                      {(["ALL", "TV", "MOVIE"] as const).map((f) => (
                        <button key={f} type="button" className="chip -ml-px first:ml-0" aria-pressed={filters.format === f} onClick={() => patch({ format: f })}>
                          {f === "ALL" ? "All" : f === "TV" ? "Series" : "Film"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="t-label mb-2 text-mute">Decade</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {DECADES.map((d) => (
                        <button key={d} type="button" className="chip" aria-pressed={filters.decade === d} onClick={() => patch({ decade: filters.decade === d ? null : d })}>
                          {d}s
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="t-label mb-2 text-mute">Released between</legend>
                    <div className="flex items-center gap-2">
                      <select className="field" aria-label="From year" value={filters.yearFrom} onChange={(e) => patch({ yearFrom: Number(e.target.value), yearTo: Math.max(filters.yearTo, Number(e.target.value)) })}>
                        {YEARS.map((y) => <option key={y}>{y}</option>)}
                      </select>
                      <span className="text-mute">–</span>
                      <select className="field" aria-label="To year" value={filters.yearTo} onChange={(e) => patch({ yearTo: Number(e.target.value), yearFrom: Math.min(filters.yearFrom, Number(e.target.value)) })}>
                        {YEARS.map((y) => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </fieldset>
                  <label className="block">
                    <span className="t-label mb-2 block text-mute">Studio</span>
                    <select className="field w-full" value={filters.studio} onChange={(e) => patch({ studio: e.target.value })}>
                      <option value="">Any studio</option>
                      {STUDIOS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="col-span-2 block">
                    <span className="t-label flex justify-between text-mute">
                      Minimum overall rating <span className="t-num text-base text-bone">{filters.minScore > 0 ? filters.minScore.toFixed(1) : "Any"}</span>
                    </span>
                    {/* The far-left stop means "any"; real thresholds run from 7.0 to 9.5. */}
                    <input type="range" className="slider" min={SCORE_ANY} max={9.5} step={0.1} value={filters.minScore || SCORE_ANY} onChange={(e) => patch({ minScore: Number(e.target.value) < 7 ? 0 : Number(e.target.value) })} style={{ "--p": `${(((filters.minScore || SCORE_ANY) - SCORE_ANY) / (9.5 - SCORE_ANY)) * 100}%` } as CSSProperties} aria-valuetext={filters.minScore > 0 ? `${filters.minScore.toFixed(1)} or higher` : "Any rating"} />
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 py-3">
        <p className="t-label text-mute" role="status" aria-live="polite">
          <span className="t-num mr-1 text-xl text-bone">{items.length}</span> of {list.length} titles · sorted by {sortMeta.label.toLowerCase()}
          {sort === "imdb" || sort === "mal" || sort === "anilist" ? " (titles without that score come last)" : ""}
        </p>
        {active > 0 && (
          <button type="button" onClick={() => setFilters(DEFAULTS)} className="t-label link inline-flex items-center gap-1 text-red">
            <X size={13} aria-hidden="true" /> Clear {active} filter{active === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {/* ── Views ── */}
      {items.length === 0 ? (
        <Empty title="Nothing fits all of that" action={<button type="button" className="btn btn-solid" onClick={() => setFilters(DEFAULTS)}>Clear filters</button>}>
          No title in the archive matches every filter at once. Loosen one — the minimum rating and the genre combination are the usual culprits.
        </Empty>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ clipPath: "polygon(0 0, 0 0, -12% 100%, -12% 100%)" }}
            animate={{ clipPath: "polygon(0 0, 112% 0, 100% 100%, 0 100%)", transitionEnd: { clipPath: "none" } }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1], opacity: { duration: 0.2 }, y: { duration: 0.2 } }}
          >
            {view === "grid" && <GridView items={items} sortShort={sortMeta.short} />}
            {view === "manga" && <MangaView items={items} />}
            {view === "rank" && <RankView items={items} sort={sort} ascending={ascending} onSort={chooseSort} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
