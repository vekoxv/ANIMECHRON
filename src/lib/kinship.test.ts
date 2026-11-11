import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { distances, kinship, mds, spread, thread } from "./kinship.ts";
import type { Snapshot } from "./types.ts";

const { anime } = JSON.parse(readFileSync(new URL("../data/snapshot.json", import.meta.url), "utf8")) as Snapshot;
const bySlug = (slug: string) => anime.find((a) => a.slug === slug)!;
const gap = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

test("kinship is symmetric, 1 for a title with itself, and explains itself", () => {
  const a = bySlug("death-note");
  const b = bySlug("monster");
  assert.equal(kinship(a, a).score, 1);
  assert.equal(kinship(a, b).score, kinship(b, a).score);
  assert.ok(kinship(a, b).score > kinship(a, bySlug("your-name")).score, "two Madhouse thrillers are closer than a thriller and a romance");
  assert.ok(kinship(a, b).shared.includes("made by MADHOUSE"));
});

test("mds recovers a known shape from its distances alone", () => {
  const square: [number, number][] = [[0, 0], [3, 0], [3, 3], [0, 3], [1.5, 1.5]];
  const dist = square.map((p) => square.map((q) => gap(p, q)));
  const found = mds(dist);
  for (let i = 0; i < square.length; i++) for (let j = 0; j < square.length; j++) assert.ok(Math.abs(gap(found[i], found[j]) - dist[i][j]) < 1e-6);
});

test("spread separates crowded points and leaves distant ones alone", () => {
  const out = spread([[0, 0], [1, 0], [100, 100]], 10);
  assert.ok(gap(out[0], out[1]) >= 10 - 1e-6);
  assert.deepEqual(out[2], [100, 100]);
});

test("the thread walks through what lies between, and straight to a neighbour", () => {
  const line = [0, 1, 2, 3].map((x) => [0, 1, 2, 3].map((y) => Math.abs(x - y)));
  assert.deepEqual(thread(line, 0, 3), [0, 1, 2, 3]);
  assert.deepEqual(thread(line, 2, 1), [2, 1]);
});

test("on the real archive every thread starts and ends where asked and never repeats a title", () => {
  const dist = distances(anime);
  for (let from = 0; from < anime.length; from++) {
    for (let to = 0; to < anime.length; to++) {
      if (from === to) continue;
      const path = thread(dist, from, to);
      assert.equal(path[0], from);
      assert.equal(path.at(-1), to);
      assert.equal(new Set(path).size, path.length);
    }
  }
});
