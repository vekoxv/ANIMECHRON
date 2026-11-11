import { fetchJson, sleep, SourceError } from "./http.ts";
import type { Reading } from "./http.ts";

/** Jikan v4 — unofficial MyAnimeList API, keyless, 3 requests/second and 60/minute. */
const ENDPOINT = "https://api.jikan.moe/v4";
const GAP_MS = 1100; // stays under the per-minute limit even for all 20 titles

interface JikanAnime {
  data: { score: number | null; scored_by: number | null; url: string };
}

export async function fetchMalRating(malId: number): Promise<Reading> {
  const { data } = await fetchJson<JikanAnime>("MyAnimeList (Jikan)", `${ENDPOINT}/anime/${malId}`, {}, { timeoutMs: 8000, retries: 1 });
  return { score: data.score, max: 10, votes: data.scored_by, url: data.url };
}

/**
 * Reads titles one at a time, spaced out. A failed title is reported, not fatal;
 * if the service itself is unreachable the remaining titles are skipped at once.
 */
export async function fetchMalRatings(malIds: number[]): Promise<Map<number, Reading | Error>> {
  const out = new Map<number, Reading | Error>();
  let down: Error | null = null;
  for (const [i, id] of malIds.entries()) {
    if (down) {
      out.set(id, down);
      continue;
    }
    if (i) await sleep(GAP_MS);
    const reading = await fetchMalRating(id).catch((e: Error) => e);
    if (reading instanceof SourceError && reading.status === undefined) down = reading;
    out.set(id, reading);
  }
  return out;
}
