import assert from "node:assert/strict";
import { test } from "node:test";
import { duel, expected, nextPair, spearman, START_ELO } from "./taste.ts";

test("equal ratings are a coin flip, and a win between equals moves 16 points", () => {
  assert.equal(expected(1500, 1500), 0.5);
  const elo = duel({}, "a", "b");
  assert.equal(elo.a, START_ELO + 16);
  assert.equal(elo.b, START_ELO - 16);
});

test("an upset moves ratings more than an expected win", () => {
  const start = { strong: 1700, weak: 1300 };
  const upset = duel(start, "weak", "strong").weak - 1300;
  const routine = duel(start, "strong", "weak").strong - 1700;
  assert.ok(upset > 16 && routine < 16);
});

test("spearman: identical order is 1, reversed is −1, ties are averaged", () => {
  assert.equal(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]), 1);
  assert.equal(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]), -1);
  const tied = spearman([1, 2, 2, 4], [1, 2, 3, 4]);
  assert.ok(tied !== null && tied > 0.9 && tied < 1);
});

test("spearman refuses to answer on too little evidence", () => {
  assert.equal(spearman([1, 2, 3], [1, 2, 3]), null);
  assert.equal(spearman([1, 1, 1, 1], [1, 2, 3, 4]), null);
});

test("the next duel never pits a title against itself or repeats the last pair", () => {
  const slugs = ["a", "b", "c", "d", "e", "f"];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  let previous: string[] = [];
  for (let i = 0; i < 200; i++) {
    const [x, y] = nextPair(slugs, { a: 1600, b: 1400 }, { a: i, b: 2 }, previous, rand);
    assert.notEqual(x, y);
    assert.ok(slugs.includes(x) && slugs.includes(y));
    assert.ok(!(previous.includes(x) && previous.includes(y)), "same pair twice in a row");
    previous = [x, y];
  }
});
