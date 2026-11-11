import { ANIME, CAST, YEAR_MAX, YEAR_MIN } from "@/lib/catalog";
import { distances, kinship, mds, spread, thread } from "@/lib/kinship";
import type { Anime, Character } from "@/lib/types";

/* The sky is a fixed world; the camera moves over it. Everything here is computed once from the dataset. */
export const WORLD = { w: 3400, h: 2200 };
const MARGIN = 400;

export interface Star {
  c: Character;
  /** Offset from the constellation's centre. */
  dx: number;
  dy: number;
  /** 0–1 brightness, from how many AniList users favourited the character. */
  mag: number;
}

export interface Constellation {
  a: Anime;
  stars: Star[];
  /** Order in which stars are joined into the figure. */
  figure: number[];
}

export type Arrangement = "kinship" | "era" | "studio";
export const ARRANGEMENT_INFO: Record<Arrangement, { label: string; hint: string }> = {
  kinship: { label: "Kinship", hint: "Stories that share genres, themes, studio or director sit close together." },
  era: { label: "Era", hint: "Left to right by year of premiere." },
  studio: { label: "Studio", hint: "Series made by the same studio stand side by side." },
};

/** Small seeded generator (mulberry32 step): the same id always scatters the same way. */
function noise(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const fame = CAST.map((c) => Math.log((c.favourites ?? 0) + 10));
const fameLo = Math.min(...fame);
const fameHi = Math.max(...fame);

export const SKY: Constellation[] = ANIME.map((a) => {
  const stars = a.characters.map((c, i): Star => {
    const angle = (i / a.characters.length) * Math.PI * 2 + noise(c.id) * 1.1 + a.rank;
    const reach = c.role === "MAIN" ? 55 + noise(c.id * 7) * 75 : 115 + noise(c.id * 7) * 85;
    return { c, dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach * 0.78, mag: (Math.log((c.favourites ?? 0) + 10) - fameLo) / (fameHi - fameLo) };
  });
  // The figure: start at the lead and always walk to the nearest star not yet joined.
  const figure = [0];
  while (figure.length < stars.length) {
    const last = stars[figure[figure.length - 1]];
    let best = -1;
    for (let i = 0; i < stars.length; i++) {
      if (figure.includes(i)) continue;
      if (best < 0 || Math.hypot(stars[i].dx - last.dx, stars[i].dy - last.dy) < Math.hypot(stars[best].dx - last.dx, stars[best].dy - last.dy)) best = i;
    }
    figure.push(best);
  }
  return { a, stars, figure };
});

/* ───────── Where each constellation stands, in each arrangement ───────── */

const DIST = distances(ANIME);

function fit(points: [number, number][]): [number, number][] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return points.map(([x, y]) => [MARGIN + ((x - x0) / (x1 - x0 || 1)) * (WORLD.w - 2 * MARGIN), MARGIN + ((y - y0) / (y1 - y0 || 1)) * (WORLD.h - 2 * MARGIN)]);
}

const byYear = [...ANIME].sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.rank - b.rank);
const studios = [...new Set(ANIME.map((a) => a.studio?.name ?? ""))]
  .map((name) => ({ name, titles: ANIME.filter((a) => (a.studio?.name ?? "") === name) }))
  .sort((a, b) => b.titles.length - a.titles.length || a.name.localeCompare(b.name));
const studioOrder = studios.flatMap((s) => s.titles);

export const PLACES: Record<Arrangement, [number, number][]> = {
  // Distance on the page is unlikeness: classical MDS over the kinship matrix, then un-crowded.
  kinship: fit(spread(fit(mds(DIST)), 430)),
  // A timeline, zig-zagged over four rows so neighbours in time don't collide.
  era: ANIME.map((a) => {
    const order = byYear.indexOf(a);
    return [MARGIN + (((a.year ?? YEAR_MIN) - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (WORLD.w - 2 * MARGIN), WORLD.h * (0.2 + (order % 4) * 0.2)];
  }),
  // Studios with several titles come first and share a stretch of the ring, inner and outer in turn.
  studio: ANIME.map((a) => {
    const slot = studioOrder.indexOf(a);
    const angle = (slot / ANIME.length) * Math.PI * 2 - Math.PI / 2;
    const reach = slot % 2 ? 1 : 0.56;
    return [WORLD.w / 2 + Math.cos(angle) * (WORLD.w / 2 - MARGIN) * reach, WORLD.h / 2 + Math.sin(angle) * (WORLD.h / 2 - MARGIN) * reach];
  }),
};

/** Labels drawn in the studio arrangement: one per studio with more than one title. */
export const STUDIO_GROUPS = studios.filter((s) => s.titles.length > 1).map((s) => ({ name: s.name, members: s.titles.map((a) => ANIME.indexOf(a)) }));

export interface Hop {
  from: Anime;
  to: Anime;
  shared: string[];
}

/** The red thread between two titles: the stops, and what each consecutive pair has in common. */
export function route(fromSlug: string, toSlug: string): { stops: number[]; hops: Hop[] } | null {
  const from = ANIME.findIndex((a) => a.slug === fromSlug);
  const to = ANIME.findIndex((a) => a.slug === toSlug);
  if (from < 0 || to < 0 || from === to) return null;
  const stops = thread(DIST, from, to);
  return { stops, hops: stops.slice(1).map((s, i) => ({ from: ANIME[stops[i]], to: ANIME[s], shared: kinship(ANIME[stops[i]], ANIME[s]).shared })) };
}

/** The titles most like a given one, nearest first. */
export const nearest = (index: number, count = 3) =>
  DIST[index].map((d, i) => ({ i, d })).filter((x) => x.i !== index).sort((x, y) => x.d - y.d).slice(0, count).map((x) => ANIME[x.i]);
