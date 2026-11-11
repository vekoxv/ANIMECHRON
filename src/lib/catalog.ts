import type { CSSProperties } from "react";
import raw from "@/data/snapshot.json";
import type { Anime, Character, Snapshot, SourceId } from "./types";

/** The locally stored dataset. See scripts/snapshot.mts for how every field is sourced. */
export const SNAPSHOT = raw as unknown as Snapshot;
export const ANIME: Anime[] = SNAPSHOT.anime;
export const BY_SLUG = new Map(ANIME.map((a) => [a.slug, a]));

export interface CastMember extends Character {
  anime: Anime;
}
export const CAST: CastMember[] = ANIME.flatMap((a) => a.characters.map((c) => ({ ...c, anime: a })));

export const GENRES = [...new Set(ANIME.flatMap((a) => a.genres))].sort();
export const STUDIOS = [...new Set(ANIME.flatMap((a) => (a.studio ? [a.studio.name] : [])))].sort((a, b) => a.localeCompare(b));
const years = ANIME.flatMap((a) => (a.year ? [a.year] : []));
export const YEAR_MIN = Math.min(...years);
export const YEAR_MAX = Math.max(...years);
export const DECADES = [...new Set(years.map((y) => Math.floor(y / 10) * 10))].sort();

export const SOURCES: Record<SourceId, { name: string; short: string; color: string; scale: string }> = {
  anilist: { name: "AniList", short: "AL", color: "#3db4f2", scale: "0–100" },
  mal: { name: "MyAnimeList", short: "MAL", color: "#7c9bf0", scale: "0–10" },
  imdb: { name: "IMDb", short: "IMDb", color: "#f5c518", scale: "0–10" },
  tmdb: { name: "TMDB", short: "TMDB", color: "#90cea1", scale: "0–10" },
};

/** CSS variables that tint a subtree with a title's own cover colours. */
export const theme = (a: Anime): CSSProperties =>
  ({ "--a": a.palette.accent, "--a2": a.palette.second, "--deep": a.palette.deep }) as CSSProperties;

export const lead = (a: Anime): Character => a.characters[0];

/** Similar titles, ranked by overlap in real metadata, with the reasons spelled out. */
export function related(a: Anime, count = 4): { anime: Anime; reasons: string[] }[] {
  return ANIME.filter((b) => b !== a)
    .map((b) => {
      const genres = b.genres.filter((g) => a.genres.includes(g));
      const tags = b.tags.filter((t) => a.tags.includes(t));
      const studio = !!a.studio && a.studio.id === b.studio?.id;
      const director = !!a.director && a.director === b.director;
      const union = new Set([...a.genres, ...b.genres]).size;
      const score = genres.length / union + tags.length * 0.2 + (studio ? 0.3 : 0) + (director ? 0.3 : 0) + (a.format === b.format ? 0.05 : 0);
      const reasons = [
        genres.length ? `Shares ${genres.slice(0, 3).join(", ")}` : "",
        tags.length ? `Both tagged ${tags.slice(0, 2).join(" and ")}` : "",
        studio ? `Also made by ${a.studio!.name}` : "",
        director ? `Same director, ${a.director}` : "",
      ].filter(Boolean);
      return { anime: b, score, reasons };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, count);
}

/* ───────── Formatting ───────── */

const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export const compact = (n: number | null | undefined) => (n == null ? "—" : compactFmt.format(n));
export const fixed = (n: number | null | undefined, digits = 1) => (n == null ? "—" : n.toFixed(digits));
export const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!m) return y;
  return d ? dateFmt.format(new Date(iso)) : `${m}/${y}`;
};
export const formatStamp = (iso: string | null) => (iso ? `${stampFmt.format(new Date(iso))} UTC` : "—");
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const pretty = (s: string | null) => (s ? s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");

export function lengthOf(a: Anime): string {
  if (a.format === "MOVIE") {
    if (!a.duration) return "Feature film";
    return `${Math.floor(a.duration / 60)} h ${a.duration % 60} min`;
  }
  if (!a.episodes) return "Ongoing";
  return `${a.episodes} episodes`;
}

/** Minutes needed to watch this catalogue entry, when AniList publishes enough to know. */
export const minutesOf = (a: Anime): number | null =>
  a.duration ? (a.format === "MOVIE" ? a.duration : a.episodes ? a.episodes * a.duration : null) : null;
