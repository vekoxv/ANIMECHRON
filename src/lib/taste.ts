/** The maths behind the Versus Dojo: Elo for head-to-head picks, Spearman for "whose taste is yours". */

export const START_ELO = 1500;

/** Chance that a title rated `a` is picked over one rated `b`. */
export const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** New ratings after `winner` is chosen over `loser`. An upset moves both further. */
export function duel(elo: Record<string, number>, winner: string, loser: string, k = 32): Record<string, number> {
  const w = elo[winner] ?? START_ELO;
  const l = elo[loser] ?? START_ELO;
  const gain = k * (1 - expected(w, l));
  return { ...elo, [winner]: w + gain, [loser]: l - gain };
}

/** Positions with ties sharing the average position. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++;
    for (let k = i; k <= j; k++) out[order[k].i] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return out;
}

/**
 * Spearman rank correlation, −1 to 1: do two lists put the same things on top?
 * Null when there are fewer than four pairs or one list has no variation — too little to say.
 */
export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 4) return null;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (rx.length + 1) / 2;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < rx.length; i++) {
    cov += (rx[i] - mean) * (ry[i] - mean);
    vx += (rx[i] - mean) ** 2;
    vy += (ry[i] - mean) ** 2;
  }
  return vx === 0 || vy === 0 ? null : cov / Math.sqrt(vx * vy);
}

/**
 * Picks the next duel: one of the least-fought titles against an opponent of similar rating,
 * so every choice tells the ranking something new. `rand` is injectable for tests.
 */
export function nextPair(slugs: string[], elo: Record<string, number>, seen: Record<string, number>, previous: string[] = [], rand: () => number = Math.random): [string, string] {
  const pick = <T,>(pool: T[]) => pool[Math.floor(rand() * pool.length)];
  const fresh = [...slugs].sort((a, b) => (seen[a] ?? 0) - (seen[b] ?? 0));
  const a = pick(fresh.slice(0, 5).filter((s) => !previous.includes(s)).concat(fresh.slice(0, 1)));
  const rating = (s: string) => elo[s] ?? START_ELO;
  const rivals = slugs.filter((s) => s !== a && !previous.includes(s)).sort((x, y) => Math.abs(rating(x) - rating(a)) - Math.abs(rating(y) - rating(a)) || (seen[x] ?? 0) - (seen[y] ?? 0));
  const b = pick(rivals.slice(0, 4));
  return rand() < 0.5 ? [a, b] : [b, a];
}
