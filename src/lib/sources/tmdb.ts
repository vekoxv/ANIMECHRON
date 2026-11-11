import { fetchJson } from "./http.ts";
import type { Reading } from "./http.ts";

/** TMDB v3. Needs TMDB_API_KEY. Attribution is required wherever its data is shown. */
interface TmdbTitle {
  vote_average: number;
  vote_count: number;
}

export const tmdbUrl = (kind: "tv" | "movie", id: number) => `https://www.themoviedb.org/${kind}/${id}`;

export async function fetchTmdbRating(kind: "tv" | "movie", id: number, apiKey: string): Promise<Reading> {
  const t = await fetchJson<TmdbTitle>("TMDB", `https://api.themoviedb.org/3/${kind}/${id}?api_key=${apiKey}`);
  return {
    score: t.vote_count > 0 ? t.vote_average : null,
    max: 10,
    votes: t.vote_count || null,
    url: tmdbUrl(kind, id),
  };
}
