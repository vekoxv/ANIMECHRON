import type { Anime, SourceId } from "../../lib/types.ts";

/** What the archive needs from a title: the dataset fields plus the computed scores. */
export interface Entry extends Anime {
  consensus: number | null;
  personal: number | null;
}

export interface Filters {
  q: string;
  /** A title must carry every selected genre. */
  genres: string[];
  studio: string;
  format: "ALL" | "TV" | "MOVIE";
  /** Lowest acceptable consensus score, 0 = no limit. */
  minScore: number;
  decade: number | null;
  yearFrom: number;
  yearTo: number;
}

export type SortKey = "editorial" | "consensus" | "personal" | "imdb" | "mal" | "anilist" | "popularity" | "year" | "title";

export const SORTS: { key: SortKey; label: string; short: string }[] = [
  { key: "editorial", label: "Editorial order", short: "Editorial" },
  { key: "consensus", label: "Highest overall rating", short: "Overall" },
  { key: "personal", label: "Your ranking", short: "Yours" },
  { key: "imdb", label: "IMDb rating", short: "IMDb" },
  { key: "mal", label: "MyAnimeList rating", short: "MAL" },
  { key: "anilist", label: "AniList rating", short: "AniList" },
  { key: "popularity", label: "Popularity", short: "Popularity" },
  { key: "year", label: "Release year", short: "Year" },
  { key: "title", label: "Alphabetical", short: "A–Z" },
];

/** Keys that read naturally from low to high; everything else starts with the best. */
export const ascendingByDefault = (key: SortKey) => key === "editorial" || key === "title";

const platform = (a: Entry, source: SourceId) => {
  const r = a.ratings[source];
  return r.score == null ? null : (r.score / r.max) * 10;
};

export function sortValue(a: Entry, key: SortKey): number | string | null {
  switch (key) {
    case "editorial": return a.rank;
    case "consensus": return a.consensus;
    case "personal": return a.personal;
    case "popularity": return a.popularity;
    case "year": return a.year;
    case "title": return a.title.display.toLowerCase();
    default: return platform(a, key);
  }
}

/** Why a search matched, so the interface can say "Character: Levi" instead of leaving it a mystery. */
export function searchMatch(a: Entry, q: string): string | null {
  const needle = q.trim().toLowerCase();
  if (!needle) return "";
  const has = (s: string | null | undefined) => !!s && s.toLowerCase().includes(needle);
  if (has(a.title.display) || has(a.title.english) || has(a.title.romaji) || has(a.title.native)) return "";
  const character = a.characters.find((c) => has(c.name) || has(c.nativeName));
  if (character) return `Character: ${character.name}`;
  const genre = a.genres.find(has);
  if (genre) return `Genre: ${genre}`;
  if (has(a.studio?.name)) return `Studio: ${a.studio!.name}`;
  return null;
}

/** Every filter must pass — they narrow each other rather than acting alone. */
export function matches(a: Entry, f: Filters): boolean {
  const year = a.year ?? 0;
  return (
    searchMatch(a, f.q) !== null &&
    f.genres.every((g) => a.genres.includes(g)) &&
    (!f.studio || a.studio?.name === f.studio) &&
    (f.format === "ALL" || a.format === f.format) &&
    (f.minScore <= 0 || (a.consensus != null && a.consensus >= f.minScore)) &&
    (f.decade == null || Math.floor(year / 10) * 10 === f.decade) &&
    year >= f.yearFrom &&
    year <= f.yearTo
  );
}

/** Sorted copy. Titles without a value for the chosen key always sink to the end. */
export function sortEntries<T extends Entry>(list: T[], key: SortKey, ascending: boolean): T[] {
  return [...list].sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    if (x == null || y == null) return x == null ? (y == null ? a.rank - b.rank : 1) : -1;
    const order = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
    return (ascending ? order : -order) || a.rank - b.rank;
  });
}

export function activeCount(f: Filters, defaults: Filters): number {
  return (
    (f.q.trim() ? 1 : 0) + f.genres.length + (f.studio ? 1 : 0) + (f.format !== "ALL" ? 1 : 0) + (f.minScore > 0 ? 1 : 0) +
    (f.decade != null ? 1 : 0) + (f.yearFrom !== defaults.yearFrom || f.yearTo !== defaults.yearTo ? 1 : 0)
  );
}
