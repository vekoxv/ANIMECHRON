"use client";

import { useMemo } from "react";
import { ANIME } from "./catalog";
import { DEFAULT_WEIGHTS, disagreement, percentile, rankBy, weightedScore } from "./scoring";
import type { Weights } from "./scoring";
import { live, prefs, useStore } from "./store";
import type { Prefs } from "./store";
import type { Anime, LiveRatings, SourceId } from "./types";
import { SOURCE_IDS } from "./types";

export interface Scored extends Anime {
  /** Editorial default: equal-weight mean of the platforms that have a score. */
  consensus: number | null;
  consensusRank: number;
  /** Your score, from your weights (and audience blend, when set). */
  personal: number | null;
  personalRank: number;
  /** Highest minus lowest platform score, on the 10-point scale. */
  spread: number | null;
  used: SourceId[];
}

export interface Catalog {
  list: Scored[];
  bySlug: Map<string, Scored>;
  /** True once the visitor has moved away from the editorial weighting. */
  personalized: boolean;
  weights: Weights;
  crowd: number;
}

function build(fresh: LiveRatings | null, p: Prefs): Catalog {
  const popularity = ANIME.map((a) => Math.log(a.popularity ?? 1));
  const scored = ANIME.map((a): Scored => {
    const ratings = { ...a.ratings, ...fresh?.ratings[a.slug] };
    const base = weightedScore(ratings, DEFAULT_WEIGHTS);
    const mine = weightedScore(ratings, p.weights).score;
    const crowdScore = 10 * percentile(popularity, Math.log(a.popularity ?? 1));
    return {
      ...a,
      ratings,
      consensus: base.score,
      used: base.used,
      personal: mine == null ? null : (1 - p.crowd) * mine + p.crowd * crowdScore,
      spread: disagreement(ratings)?.spread ?? null,
      consensusRank: 0,
      personalRank: 0,
    };
  });
  const byConsensus = rankBy(scored, (a) => a.consensus);
  const byPersonal = rankBy(scored, (a) => a.personal);
  for (const a of scored) {
    a.consensusRank = byConsensus.get(a)!;
    a.personalRank = byPersonal.get(a)!;
  }
  return {
    list: scored,
    bySlug: new Map(scored.map((a) => [a.slug, a])),
    personalized: p.crowd > 0 || SOURCE_IDS.some((s) => p.weights[s] !== DEFAULT_WEIGHTS[s]),
    weights: p.weights,
    crowd: p.crowd,
  };
}

/** The 20 titles with live ratings merged in and every score and rank computed. */
export function useCatalog(): Catalog {
  const fresh = useStore(live).data;
  const p = useStore(prefs);
  return useMemo(() => build(fresh, p), [fresh, p]);
}
