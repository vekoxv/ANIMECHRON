import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_WEIGHTS, disagreement, normalize, rankBy, weightedScore } from "./scoring.ts";
import type { PlatformRating, Ratings, SourceId } from "./types.ts";

const r = (source: SourceId, score: number | null, max = 10): PlatformRating => ({
  source, score, max, votes: null, url: null, retrievedAt: null, origin: score == null ? "unavailable" : "snapshot", note: "",
});
const ratings = (anilist: number | null, mal: number | null, imdb: number | null, tmdb: number | null): Ratings => ({
  anilist: r("anilist", anilist, 100), mal: r("mal", mal), imdb: r("imdb", imdb), tmdb: r("tmdb", tmdb),
});

test("scores are put on a 10-point scale", () => {
  assert.equal(normalize(r("anilist", 90, 100)), 9);
  assert.equal(normalize(r("imdb", null)), null);
});

test("a missing source is excluded, never counted as zero", () => {
  const { score, used } = weightedScore(ratings(90, null, 8, null), DEFAULT_WEIGHTS);
  assert.equal(score, 8.5);
  assert.deepEqual(used, ["anilist", "imdb"]);
});

test("weights shift the result and a zero weight removes a source", () => {
  assert.equal(weightedScore(ratings(90, 8, 8, null), { ...DEFAULT_WEIGHTS, anilist: 2 }).score, 8.5);
  assert.equal(weightedScore(ratings(90, 8, 7, null), { anilist: 0, mal: 1, imdb: 0, tmdb: 1 }).score, 8);
});

test("no usable source gives no score", () => {
  assert.equal(weightedScore(ratings(null, null, null, null), DEFAULT_WEIGHTS).score, null);
  assert.equal(weightedScore(ratings(90, 9, 9, 9), { anilist: 0, mal: 0, imdb: 0, tmdb: 0 }).score, null);
});

test("disagreement is the gap between the kindest and harshest platform", () => {
  const d = disagreement(ratings(82, 8.6, 9.1, null));
  assert.ok(d);
  assert.equal(d.low, "anilist");
  assert.equal(d.high, "imdb");
  assert.ok(Math.abs(d.spread - 0.9) < 1e-9);
  assert.equal(disagreement(ratings(82, null, null, null)), null);
});

test("ranking shares positions on ties and puts unscored items last", () => {
  const items = [{ n: "a", v: 9 }, { n: "b", v: null }, { n: "c", v: 9 }, { n: "d", v: 8 }];
  const ranks = rankBy(items, (i) => i.v);
  assert.deepEqual(items.map((i) => ranks.get(i)), [1, 4, 1, 3]);
});
