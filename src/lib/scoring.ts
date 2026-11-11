import type { PlatformRating, Ratings, SourceId } from "./types.ts";

export type Weights = Record<SourceId, number>;

/** Editorial default: every platform that has a verified score counts equally. */
export const DEFAULT_WEIGHTS: Weights = { anilist: 1, mal: 1, imdb: 1, tmdb: 1 };

/** A platform score on the shared 0–10 scale, or null when the platform has none. */
export const normalize = (r: PlatformRating): number | null => (r.score == null ? null : (r.score / r.max) * 10);

/**
 * Weighted mean of the platforms that actually have a score.
 * A missing source is left out and the remaining weights are renormalised —
 * it never counts as zero.
 */
export function weightedScore(ratings: Ratings, weights: Weights): { score: number | null; used: SourceId[] } {
  let sum = 0;
  let total = 0;
  const used: SourceId[] = [];
  for (const source of Object.keys(ratings) as SourceId[]) {
    const value = normalize(ratings[source]);
    const weight = weights[source] ?? 0;
    if (value == null || weight <= 0) continue;
    sum += value * weight;
    total += weight;
    used.push(source);
  }
  return { score: total > 0 ? sum / total : null, used };
}

/** How far apart the platforms are: highest minus lowest normalised score. */
export function disagreement(ratings: Ratings): { spread: number; low: SourceId; high: SourceId } | null {
  const scored = (Object.keys(ratings) as SourceId[])
    .map((source) => ({ source, value: normalize(ratings[source]) }))
    .filter((s): s is { source: SourceId; value: number } => s.value != null)
    .sort((a, b) => a.value - b.value);
  if (scored.length < 2) return null;
  const low = scored[0];
  const high = scored[scored.length - 1];
  return { spread: high.value - low.value, low: low.source, high: high.source };
}

/** 1-based positions, best first. Ties share a position; items without a value come last. */
export function rankBy<T>(items: T[], value: (item: T) => number | null): Map<T, number> {
  const sorted = [...items].sort((a, b) => (value(b) ?? -Infinity) - (value(a) ?? -Infinity));
  const ranks = new Map<T, number>();
  sorted.forEach((item, i) => {
    const prev = sorted[i - 1];
    const tied = prev !== undefined && value(prev) === value(item);
    ranks.set(item, tied ? ranks.get(prev)! : i + 1);
  });
  return ranks;
}

/** Share of the field at or below `value`, 0–1. Used to put unlike metrics on one axis. */
export function percentile(values: number[], value: number): number {
  if (values.length < 2) return 1;
  return values.filter((v) => v <= value).length / values.length;
}
