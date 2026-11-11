import { fetchJson } from "./http.ts";
import type { Reading } from "./http.ts";

/** OMDb — IMDb ratings. Needs OMDB_API_KEY (free tier: 1,000 requests/day). */
interface OmdbTitle {
  Response: "True" | "False";
  Error?: string;
  imdbRating?: string;
  imdbVotes?: string;
}

export const imdbUrl = (imdbId: string) => `https://www.imdb.com/title/${imdbId}/`;

export async function fetchImdbRating(imdbId: string, apiKey: string): Promise<Reading> {
  const t = await fetchJson<OmdbTitle>("IMDb (OMDb)", `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
  if (t.Response !== "True") throw new Error(`IMDb (OMDb): ${t.Error ?? "not found"}`);
  const score = Number(t.imdbRating);
  const votes = Number(t.imdbVotes?.replace(/,/g, ""));
  return {
    score: Number.isFinite(score) ? score : null,
    max: 10,
    votes: Number.isFinite(votes) ? votes : null,
    url: imdbUrl(imdbId),
  };
}
