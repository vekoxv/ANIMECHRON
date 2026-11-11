import type { Anime } from "./types.ts";

/**
 * Likeness between titles, computed only from metadata they really share.
 * Three things are built on it: a 2-D map where distance means difference (`mds`),
 * and the "red thread" — the gentlest chain of titles from one story to another (`thread`).
 */

export interface Kinship {
  /** 0 (nothing in common) to 1 (the same title). */
  score: number;
  /** What the two share, in words, most telling first. */
  shared: string[];
}

const both = (x: string[], y: string[]) => x.filter((v) => y.includes(v));
const jaccard = (x: string[], y: string[]) => {
  const union = new Set([...x, ...y]).size;
  return union ? both(x, y).length / union : 0;
};

export function kinship(a: Anime, b: Anime): Kinship {
  if (a.slug === b.slug) return { score: 1, shared: [] };
  const studio = !!a.studio && a.studio.id === b.studio?.id;
  const director = !!a.director && a.director === b.director;
  const era = a.year && b.year ? Math.max(0, 1 - Math.abs(a.year - b.year) / 15) : 0;
  return {
    score: 0.55 * jaccard(a.genres, b.genres) + 0.15 * jaccard(a.tags, b.tags) + (studio ? 0.12 : 0) + (director ? 0.08 : 0) + 0.1 * era,
    shared: [
      ...both(a.genres, b.genres).slice(0, 3),
      ...both(a.tags, b.tags).slice(0, 2),
      ...(studio ? [`made by ${a.studio!.name}`] : []),
      ...(director ? [`directed by ${a.director}`] : []),
    ],
  };
}

/** Pairwise difference, 1 − kinship. */
export const distances = (titles: Anime[]): number[][] => titles.map((a) => titles.map((b) => 1 - kinship(a, b).score));

/**
 * Classical multidimensional scaling: 2-D points whose mutual distances approximate `dist`.
 * Double-centre the squared distances, then take the two strongest eigenvectors by power
 * iteration. Deterministic (fixed start vectors), no dependencies.
 */
export function mds(dist: number[][]): [number, number][] {
  const n = dist.length;
  const sq = dist.map((row) => row.map((d) => d * d));
  const rowMean = sq.map((row) => row.reduce((s, v) => s + v, 0) / n);
  const mean = rowMean.reduce((s, v) => s + v, 0) / n;
  const B = sq.map((row, i) => row.map((v, j) => -0.5 * (v - rowMean[i] - rowMean[j] + mean)));
  const times = (v: number[]) => B.map((row) => row.reduce((s, b, j) => s + b * v[j], 0));
  const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);

  const axes: number[][] = [];
  const scale: number[] = [];
  for (let k = 0; k < 2; k++) {
    let v = Array.from({ length: n }, (_, i) => ((i * 7 + k * 13) % 11) - 5 + 0.5);
    for (let step = 0; step < 300; step++) {
      let w = times(v);
      for (const axis of axes) {
        const along = dot(w, axis);
        w = w.map((x, i) => x - along * axis[i]); // stay orthogonal to the axes already found
      }
      const length = Math.sqrt(dot(w, w)) || 1;
      v = w.map((x) => x / length);
    }
    axes.push(v);
    scale.push(Math.sqrt(Math.max(0, dot(v, times(v)))));
  }
  return Array.from({ length: n }, (_, i) => [axes[0][i] * scale[0], axes[1][i] * scale[1]]);
}

/** Nudges points apart until none sit closer than `gap`, moving each as little as possible. */
export function spread(points: [number, number][], gap: number, passes = 60): [number, number][] {
  const out = points.map(([x, y]) => [x, y] as [number, number]);
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j][0] - out[i][0] || 0.01 * (j - i);
        const dy = out[j][1] - out[i][1] || 0.01;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= gap) continue;
        const push = (gap - d) / d / 2;
        out[i][0] -= dx * push; out[i][1] -= dy * push;
        out[j][0] += dx * push; out[j][1] += dy * push;
      }
    }
  }
  return out;
}

/**
 * How strongly a long hop is punished. Titles in the archive are all fairly unlike each other
 * (distances 0.46–0.97), so a mild penalty always picks the direct hop; at 5 the typical thread
 * passes through one or two stepping stones (measured on the real data).
 */
const LEAP_PENALTY = 5;

/**
 * The red thread: indices of the gentlest chain from `from` to `to`.
 * Each hop costs its distance raised to LEAP_PENALTY, so several small steps beat one leap and
 * the route passes through the titles that lie "between" the two ends (Dijkstra).
 */
export function thread(dist: number[][], from: number, to: number): number[] {
  const n = dist.length;
  const cost = new Array<number>(n).fill(Infinity);
  const previous = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  cost[from] = 0;
  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || cost[i] < cost[u])) u = i;
    if (u < 0 || u === to) break;
    done[u] = true;
    for (let v = 0; v < n; v++) {
      const next = cost[u] + dist[u][v] ** LEAP_PENALTY;
      if (!done[v] && next < cost[v]) {
        cost[v] = next;
        previous[v] = u;
      }
    }
  }
  const path = [to];
  while (path[0] !== from && previous[path[0]] >= 0) path.unshift(previous[path[0]]);
  return path;
}
