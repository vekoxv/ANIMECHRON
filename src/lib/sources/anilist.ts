import { fetchJson } from "./http.ts";
import type { Reading } from "./http.ts";

/** AniList GraphQL — keyless, 30 requests/minute. https://docs.anilist.co */
const ENDPOINT = "https://graphql.anilist.co";

export async function anilist<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const body = await fetchJson<{ data: T; errors?: { message: string }[] }>("AniList", ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (body.errors?.length) throw new Error(`AniList: ${body.errors[0].message}`);
  return body.data;
}

interface ScoreNode {
  id: number;
  siteUrl: string;
  averageScore: number | null;
  popularity: number | null;
  stats: { scoreDistribution: { amount: number }[] | null } | null;
}

export interface AniListReading extends Reading {
  popularity: number | null;
}

/** The community's weighted score (0–100) and how many ratings sit behind it. */
export function toReading(m: ScoreNode): AniListReading {
  const votes = m.stats?.scoreDistribution?.reduce((n, b) => n + b.amount, 0) ?? null;
  return { score: m.averageScore, max: 100, votes: votes || null, url: m.siteUrl, popularity: m.popularity };
}

/** Scores for many titles in a single request. */
export async function fetchAniListScores(ids: number[]): Promise<Map<number, AniListReading>> {
  const data = await anilist<{ Page: { media: ScoreNode[] } }>(
    `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) {
      id siteUrl averageScore popularity stats { scoreDistribution { amount } } } } }`,
    { ids },
  );
  return new Map(data.Page.media.map((m) => [m.id, toReading(m)]));
}
