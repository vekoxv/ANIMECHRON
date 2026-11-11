import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { weightedScore, DEFAULT_WEIGHTS } from "../../lib/scoring.ts";
import type { Snapshot } from "../../lib/types.ts";
import { matches, searchMatch, sortEntries } from "./logic.ts";
import type { Entry, Filters } from "./logic.ts";

// Runs against the real stored dataset, so it also guards the snapshot's shape.
const snapshot = JSON.parse(readFileSync(new URL("../../data/snapshot.json", import.meta.url), "utf8")) as Snapshot;
const list: Entry[] = snapshot.anime.map((a) => ({ ...a, consensus: weightedScore(a.ratings, DEFAULT_WEIGHTS).score, personal: null }));
const all: Filters = { q: "", genres: [], studio: "", format: "ALL", minScore: 0, decade: null, yearFrom: 1900, yearTo: 2100 };
const slugs = (f: Partial<Filters>) => list.filter((a) => matches(a, { ...all, ...f })).map((a) => a.slug);

test("no filters keeps all twenty", () => assert.equal(slugs({}).length, 20));

test("filters narrow each other", () => {
  const movies = slugs({ format: "MOVIE" });
  assert.deepEqual(movies.sort(), ["a-silent-voice", "spirited-away", "your-name"]);
  assert.deepEqual(slugs({ format: "MOVIE", decade: 2000 }), ["spirited-away"]);
  assert.deepEqual(slugs({ format: "MOVIE", decade: 2000, genres: ["Mecha"] }), []);
});

test("search reaches titles, characters, genres and studios", () => {
  const aot = list.find((a) => a.slug === "attack-on-titan")!;
  assert.equal(searchMatch(aot, "titan"), "");
  assert.match(searchMatch(aot, "levi") ?? "", /^Character: Levi/);
  assert.ok(slugs({ q: "ghibli" }).includes("spirited-away"));
  assert.ok(slugs({ q: "mecha" }).includes("neon-genesis-evangelion"));
  assert.deepEqual(slugs({ q: "zzzz-nothing" }), []);
});

test("sorting puts titles without a value last in both directions", () => {
  const withGap = list.map((a, i) => (i === 0 ? { ...a, ratings: { ...a.ratings, imdb: { ...a.ratings.imdb, score: null } } } : a));
  assert.equal(sortEntries(withGap, "imdb", false).at(-1)!.slug, withGap[0].slug);
  assert.equal(sortEntries(withGap, "imdb", true).at(-1)!.slug, withGap[0].slug);
  assert.equal(sortEntries(list, "editorial", true)[0].rank, 1);
  assert.equal(sortEntries(list, "title", true)[0].slug, "a-silent-voice");
});
