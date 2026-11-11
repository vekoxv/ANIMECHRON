import { ANIME } from "@/lib/catalog";
import { fetchAniListScores } from "@/lib/sources/anilist";
import type { Reading } from "@/lib/sources/http";
import { fetchMalRatings } from "@/lib/sources/jikan";
import { fetchImdbRating } from "@/lib/sources/omdb";
import { fetchTmdbRating } from "@/lib/sources/tmdb";
import type { Anime, LiveRatings, SourceId } from "@/lib/types";

/**
 * Server-side refresh of every platform that can be read right now.
 * API keys stay here; the browser only ever sees the resulting numbers.
 * One refresh is shared by all visitors for six hours (ten minutes if a source failed).
 */
const FRESH_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;

let memo: { at: number; ttl: number; data: LiveRatings } | null = null;
let inflight: Promise<LiveRatings> | null = null;

export function getLiveRatings(): Promise<LiveRatings> {
  if (memo && Date.now() - memo.at < memo.ttl) return Promise.resolve(memo.data);
  inflight ??= refresh().finally(() => (inflight = null));
  return inflight;
}

type Health = { ok: boolean; message: string };
const fail = (e: unknown): Health => ({ ok: false, message: e instanceof Error ? e.message : "Unknown error" });

async function refresh(): Promise<LiveRatings> {
  const now = new Date().toISOString();
  const ratings: LiveRatings["ratings"] = Object.fromEntries(ANIME.map((a) => [a.slug, {}]));
  const put = (a: Anime, source: SourceId, r: Reading, note: string) => {
    if (r.score == null) return false;
    ratings[a.slug][source] = { source, score: r.score, max: r.max, votes: r.votes, url: r.url, retrievedAt: now, origin: "live", note };
    return true;
  };

  /** Reads one keyed source title by title; counts how many answered. */
  const perTitle = async (source: SourceId, label: string, read: (a: Anime) => Promise<Reading> | null, note: string): Promise<Health> => {
    let hits = 0;
    let lastError = "";
    for (const a of ANIME) {
      const pending = read(a);
      if (!pending) continue;
      try {
        if (put(a, source, await pending, note)) hits++;
      } catch (e) {
        lastError = fail(e).message;
      }
    }
    return hits ? { ok: true, message: `${hits} of ${ANIME.length} titles read live from ${label}.` } : { ok: false, message: lastError || `${label} returned no ratings.` };
  };

  const omdbKey = process.env.OMDB_API_KEY;
  const tmdbKey = process.env.TMDB_API_KEY;

  const [anilist, mal, imdb, tmdb] = await Promise.all([
    fetchAniListScores(ANIME.map((a) => a.id)).then((scores): Health => {
      let hits = 0;
      for (const a of ANIME) {
        const r = scores.get(a.id);
        if (r && put(a, "anilist", r, "AniList weighted average score, read live from the AniList GraphQL API.")) hits++;
      }
      return { ok: hits > 0, message: `${hits} of ${ANIME.length} titles read live from AniList.` };
    }, fail),

    fetchMalRatings(ANIME.flatMap((a) => (a.ids.mal ? [a.ids.mal] : []))).then((readings): Health => {
      let hits = 0;
      let lastError = "";
      for (const a of ANIME) {
        const r = a.ids.mal ? readings.get(a.ids.mal) : undefined;
        if (r instanceof Error) lastError = r.message;
        else if (r && put(a, "mal", r, "MyAnimeList score, read live through the Jikan API.")) hits++;
      }
      return hits ? { ok: true, message: `${hits} of ${ANIME.length} titles read live through Jikan.` } : { ok: false, message: lastError || "Jikan returned no ratings." };
    }, fail),

    omdbKey
      ? perTitle("imdb", "OMDb", (a) => (a.ids.imdb ? fetchImdbRating(a.ids.imdb, omdbKey) : null), "IMDb rating, read live through the OMDb API.")
      : Promise.resolve<Health>({ ok: false, message: "No OMDB_API_KEY is set, so IMDb is not read live. Values shown come from the IMDb dataset snapshot." }),

    tmdbKey
      ? perTitle("tmdb", "TMDB", (a) => (a.ids.tmdb ? fetchTmdbRating(a.format === "MOVIE" ? "movie" : "tv", a.ids.tmdb, tmdbKey) : null), "TMDB user score, read live from the TMDB API.")
      : Promise.resolve<Health>({ ok: false, message: "No TMDB_API_KEY is set, so TMDB was not queried." }),
  ]);

  const data: LiveRatings = { generatedAt: now, ratings, sources: { anilist, mal, imdb, tmdb } };
  const keyed = (h: Health, key: string | undefined) => h.ok || !key;
  const healthy = anilist.ok && mal.ok && keyed(imdb, omdbKey) && keyed(tmdb, tmdbKey);
  memo = { at: Date.now(), ttl: healthy ? FRESH_MS : RETRY_MS, data };
  return data;
}
