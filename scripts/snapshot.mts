/**
 * Builds src/data/snapshot.json — the locally stored dataset the site renders from.
 * Every number in it is read from a provider at run time; nothing is typed in by hand.
 *
 *   npm run snapshot            (Node 23.6+ runs TypeScript directly)
 *
 * Optional env: TMDB_API_KEY. Without it TMDB is recorded as "unavailable", not guessed.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { SEEDS } from "../src/lib/seeds.ts";
import { anilist, toReading } from "../src/lib/sources/anilist.ts";
import { fetchJson } from "../src/lib/sources/http.ts";
import type { Reading } from "../src/lib/sources/http.ts";
import { fetchMalRatings } from "../src/lib/sources/jikan.ts";
import { imdbUrl } from "../src/lib/sources/omdb.ts";
import { fetchTmdbRating, tmdbUrl } from "../src/lib/sources/tmdb.ts";
import type { Anime, Character, Palette, PlatformRating, Snapshot, SourceId, Studio } from "../src/lib/types.ts";

const OUT = new URL("../src/data/snapshot.json", import.meta.url);
const now = new Date().toISOString();
const log = (...a: unknown[]) => console.log("·", ...a);

/* ---------- AniList: metadata, characters, studios ---------- */

interface ALMedia {
  id: number;
  idMal: number | null;
  siteUrl: string;
  title: { romaji: string; english: string | null; native: string | null };
  format: string;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  source: string | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  genres: string[];
  tags: { name: string; rank: number; isMediaSpoiler: boolean; isGeneralSpoiler: boolean }[];
  description: string | null;
  coverImage: { extraLarge: string; color: string | null };
  bannerImage: string | null;
  averageScore: number | null;
  popularity: number | null;
  favourites: number | null;
  stats: { scoreDistribution: { amount: number }[] | null } | null;
  studios: { edges: { isMain: boolean; node: { id: number; name: string } }[] };
  staff: { edges: { role: string; node: { name: { full: string } } }[] };
  characters: {
    edges: {
      role: "MAIN" | "SUPPORTING" | "BACKGROUND";
      voiceActors: { name: { full: string } }[];
      node: {
        id: number;
        siteUrl: string;
        favourites: number | null;
        gender: string | null;
        age: string | null;
        name: { full: string; native: string | null };
        image: { large: string | null };
        description: string | null;
      };
    }[];
  };
}

const MEDIA_QUERY = `query ($ids: [Int]) { Page(perPage: 10) { media(id_in: $ids, type: ANIME) {
  id idMal siteUrl title { romaji english native } format status episodes duration source seasonYear
  startDate { year month day } endDate { year month day } genres
  tags { name rank isMediaSpoiler isGeneralSpoiler }
  description(asHtml: false) coverImage { extraLarge color } bannerImage
  averageScore popularity favourites stats { scoreDistribution { amount } }
  studios { edges { isMain node { id name } } }
  staff(sort: [RELEVANCE], perPage: 12) { edges { role node { name { full } } } }
  characters(sort: [ROLE, RELEVANCE, ID], perPage: 9) { edges { role
    voiceActors(language: JAPANESE, sort: [RELEVANCE]) { name { full } }
    node { id siteUrl favourites gender age name { full native } image { large } description(asHtml: false) } } }
} } }`;

async function fetchMedia(ids: number[]): Promise<Map<number, ALMedia>> {
  const out = new Map<number, ALMedia>();
  for (let i = 0; i < ids.length; i += 5) {
    const data = await anilist<{ Page: { media: ALMedia[] } }>(MEDIA_QUERY, { ids: ids.slice(i, i + 5) });
    for (const m of data.Page.media) out.set(m.id, m);
  }
  return out;
}

async function fetchStudios(ids: number[]): Promise<Map<number, Studio>> {
  const fields = `id name siteUrl favourites media(sort: POPULARITY_DESC, isMain: true, perPage: 7) { nodes {
    id format seasonYear startDate { year } title { english romaji } coverImage { large color } siteUrl } }`;
  type Node = {
    id: number;
    name: string;
    siteUrl: string;
    favourites: number | null;
    media: {
      nodes: {
        id: number;
        format: string | null;
        seasonYear: number | null;
        startDate: { year: number | null };
        title: { english: string | null; romaji: string };
        coverImage: { large: string | null; color: string | null };
        siteUrl: string;
      }[];
    };
  };
  const data = await anilist<Record<string, Node>>(
    `{ ${ids.map((id) => `s${id}: Studio(id: ${id}) { ${fields} }`).join("\n")} }`,
  );
  return new Map(
    Object.values(data).map((s) => [
      s.id,
      {
        id: s.id,
        name: s.name,
        url: s.siteUrl,
        favourites: s.favourites,
        works: s.media.nodes.map((n) => ({
          id: n.id,
          title: n.title.english ?? n.title.romaji,
          year: n.seasonYear ?? n.startDate.year,
          format: n.format,
          cover: n.coverImage.large,
          color: n.coverImage.color,
          url: n.siteUrl,
        })),
      },
    ]),
  );
}

/** Walks AniList SEQUEL edges and counts the TV entries each series grew into. */
async function countInstalments(roots: number[]): Promise<Map<number, number>> {
  type Rel = { id: number; format: string | null; relations: { edges: { relationType: string; node: { id: number; type: string } }[] } };
  const seen = new Map(roots.map((r) => [r, new Set([r])]));
  const tv = new Map(roots.map((r) => [r, 1]));
  let frontier = new Map(roots.map((r) => [r, [r]])); // media id -> roots that reached it
  for (let hop = 0; hop < 16 && frontier.size; hop++) {
    const data = await anilist<{ Page: { media: Rel[] } }>(
      `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids) { id format
        relations { edges { relationType node { id type } } } } } }`,
      { ids: [...frontier.keys()] },
    );
    const next = new Map<number, number[]>();
    for (const m of data.Page.media) {
      for (const root of frontier.get(m.id) ?? []) {
        if (hop > 0 && m.format === "TV") tv.set(root, tv.get(root)! + 1);
        for (const e of m.relations.edges) {
          if (e.relationType !== "SEQUEL" || e.node.type !== "ANIME" || seen.get(root)!.has(e.node.id)) continue;
          seen.get(root)!.add(e.node.id);
          next.set(e.node.id, [...(next.get(e.node.id) ?? []), root]);
        }
      }
    }
    frontier = next;
  }
  return tv;
}

/* ---------- Text clean-up for AniList's markdown-ish prose ---------- */

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };

function plain(text: string): string {
  return text
    .replace(/~!([\s\S]*?)!~/g, "") // spoiler blocks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)([\s\S]*?)\1/g, "$2")
    .replace(/(^|\s)[*_]([^*_\n]+)[*_](?=[\s.,;:!?)]|$)/g, "$1$2")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/g, (m, n) => ENTITIES[n] ?? m)
    .replace(/[ \t]+/g, " ");
}

/** Keeps whole sentences up to `max` characters. */
function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s*\n+\s*/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > max * 0.4 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function synopsisOf(description: string | null): string {
  const paragraphs = plain(description ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !/^\(?(source|note)s?:/i.test(p) && !/^\(source/i.test(p));
  return excerpt(paragraphs.join(" "), 900);
}

function characterText(description: string | null): Pick<Character, "description" | "facts"> {
  const facts: Character["facts"] = [];
  const prose: string[] = [];
  for (const raw of (description ?? "").replace(/~!([\s\S]*?)!~/g, "").split(/\n+/)) {
    const fact = raw.match(/^\s*(?:__|\*\*)([^_*:]{2,24}):?(?:__|\*\*):?\s*(.+)$/);
    if (fact) {
      const value = plain(fact[2]).trim();
      if (value && value.length <= 80 && facts.length < 5) facts.push({ label: fact[1].trim(), value });
    } else if (plain(raw).trim()) prose.push(plain(raw).trim());
  }
  return { description: excerpt(prose.join(" "), 460), facts };
}

/* ---------- Palette: read the cover's own colours ---------- */

function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Buckets saturated pixels by hue; the heaviest bucket is the accent, the next distinct one the second. */
async function extractPalette(coverUrl: string): Promise<Palette> {
  const res = await fetch(coverUrl);
  const { data } = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(48, 68, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, x: 0, y: 0, s: 0 }));
  for (let i = 0; i < data.length; i += 3) {
    const [h, s, l] = toHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.22 || l < 0.12 || l > 0.92) continue;
    // Faces fill most covers; skin tones are down-weighted so they don't decide the palette.
    const skin = h > 8 && h < 46 && l > 0.5 && s < 0.75 ? 0.15 : 1;
    const w = s * s * (1 - Math.abs(l - 0.5) * 1.2) * skin;
    const b = buckets[Math.floor(h / 15) % 24];
    b.w += w; b.s += s * w;
    b.x += Math.cos((h * Math.PI) / 180) * w; b.y += Math.sin((h * Math.PI) / 180) * w;
  }
  const ranked = buckets.filter((b) => b.w > 0).sort((a, b) => b.w - a.w)
    .map((b) => ({ w: b.w, s: b.s / b.w, h: ((Math.atan2(b.y, b.x) * 180) / Math.PI + 360) % 360 }));
  if (!ranked.length) return { accent: "#d8d2c4", second: "#8f8a80", deep: "#0f0f10" }; // monochrome cover
  const first = ranked[0];
  const apart = (h: number) => Math.min(Math.abs(h - first.h), 360 - Math.abs(h - first.h));
  const other = ranked.find((b) => apart(b.h) >= 40 && b.w >= first.w * 0.1) ?? { h: (first.h + 32) % 360, s: first.s };
  return {
    accent: hsl(first.h, clamp(first.s * 1.15, 0.62, 0.92), 0.58),
    second: hsl(other.h, clamp(other.s * 1.1, 0.55, 0.88), 0.62),
    deep: hsl(first.h, 0.42, 0.075),
  };
}

/* ---------- Wikidata: cross-site identifiers ---------- */

/**
 * IMDb and TMDB keep one page per series, while MyAnimeList ids often sit on a
 * "season 1" item. When the item itself has no id, its parent series (P179) is used.
 */
async function fetchExternalIds(malIds: number[]) {
  const sparql = `SELECT ?mal ?imdb ?tv ?movie ?sImdb ?sTv WHERE { VALUES ?mal { ${malIds.map((i) => `"${i}"`).join(" ")} }
    ?item wdt:P4086 ?mal. OPTIONAL { ?item wdt:P345 ?imdb } OPTIONAL { ?item wdt:P4983 ?tv } OPTIONAL { ?item wdt:P4947 ?movie }
    OPTIONAL { ?item wdt:P179 ?series. OPTIONAL { ?series wdt:P345 ?sImdb } OPTIONAL { ?series wdt:P4983 ?sTv } } }`;
  const data = await fetchJson<{ results: { bindings: Record<string, { value: string }>[] } }>(
    "Wikidata",
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
    { headers: { "User-Agent": "animechron-snapshot/1.0 (local build script)" } },
    { timeoutMs: 30000 },
  );
  const out = new Map<number, { imdb: string | null; tmdb: number | null }>();
  for (const row of data.results.bindings) {
    const id = Number(row.mal.value);
    const prev = out.get(id) ?? { imdb: null, tmdb: null };
    out.set(id, {
      imdb: prev.imdb ?? row.imdb?.value ?? row.sImdb?.value ?? null,
      tmdb: prev.tmdb ?? (Number(row.tv?.value ?? row.movie?.value ?? row.sTv?.value) || null),
    });
  }
  return out;
}

/* ---------- IMDb: official non-commercial ratings dataset ---------- */

async function fetchImdbDataset(ids: Set<string>) {
  const res = await fetch("https://datasets.imdbws.com/title.ratings.tsv.gz");
  assert(res.ok && res.body, `IMDb dataset: HTTP ${res.status}`);
  const fileDate = res.headers.get("last-modified");
  const found = new Map<string, { score: number; votes: number }>();
  let tail = "";
  const text = res.body.pipeThrough(new DecompressionStream("gzip")).pipeThrough(new TextDecoderStream());
  for await (const chunk of text as unknown as AsyncIterable<string>) {
    const lines = (tail + chunk).split("\n");
    tail = lines.pop() ?? "";
    for (const line of lines) {
      const tab = line.indexOf("\t");
      if (!ids.has(line.slice(0, tab))) continue;
      const [id, score, votes] = line.split("\t");
      found.set(id, { score: Number(score), votes: Number(votes) });
    }
  }
  return { found, fileDate: fileDate ? new Date(fileDate).toISOString().slice(0, 10) : "unknown date" };
}

/* ---------- Assemble ---------- */

const iso = (d: { year: number | null; month: number | null; day: number | null }) =>
  d.year ? [d.year, d.month, d.day].filter(Boolean).map((n) => String(n).padStart(2, "0")).join("-") : null;

const rating = (source: SourceId, r: Reading | null, note: string, url: string | null = null): PlatformRating =>
  r && r.score != null
    ? { source, score: r.score, max: r.max, votes: r.votes, url: r.url, retrievedAt: now, origin: "snapshot", note }
    : { source, score: null, max: source === "anilist" ? 100 : 10, votes: null, url, retrievedAt: null, origin: "unavailable", note };

const staffNamed = (m: ALMedia, pattern: RegExp) => m.staff.edges.find((e) => pattern.test(e.role))?.node.name.full ?? null;

log("AniList: metadata and characters");
const media = await fetchMedia(SEEDS.map((s) => s.anilistId));
for (const seed of SEEDS) {
  const m = media.get(seed.anilistId);
  assert(m, `AniList returned nothing for ${seed.slug} (#${seed.anilistId})`);
  const titles = `${m.title.english} ${m.title.romaji}`.toLowerCase();
  assert(titles.includes(seed.expect), `#${seed.anilistId} is "${m.title.english ?? m.title.romaji}", expected ${seed.title}`);
}

log("AniList: studios and sequel chains");
const mainStudio = (m: ALMedia) => (m.studios.edges.find((e) => e.isMain) ?? m.studios.edges[0])?.node ?? null;
const studios = await fetchStudios([...new Set([...media.values()].map((m) => mainStudio(m)?.id).filter((id) => id != null))]);
const instalments = await countInstalments(SEEDS.map((s) => s.anilistId));

const malIds = [...media.values()].map((m) => m.idMal).filter((id) => id != null);
log("Wikidata: IMDb and TMDB identifiers");
const external = await fetchExternalIds(malIds).catch((e: Error) => (log("  failed —", e.message), new Map()));
log("IMDb: non-commercial ratings dataset");
const imdbIds = new Set([...external.values()].map((x) => x.imdb).filter((x) => x != null));
const imdb = await fetchImdbDataset(imdbIds).catch((e: Error) => (log("  failed —", e.message), null));
log(`MyAnimeList via Jikan: ${malIds.length} titles, one per second`);
const mal = await fetchMalRatings(malIds);
const tmdbKey = process.env.TMDB_API_KEY;

const anime: Anime[] = [];
for (const seed of SEEDS) {
  const m = media.get(seed.anilistId)!;
  const ids = (m.idMal != null && external.get(m.idMal)) || { imdb: null, tmdb: null };
  const format = m.format === "MOVIE" ? "MOVIE" : "TV";
  const kind = format === "MOVIE" ? "movie" : "tv";
  const malReading = m.idMal != null ? mal.get(m.idMal) : undefined;
  const imdbHit = ids.imdb ? imdb?.found.get(ids.imdb) : undefined;

  let tmdb: PlatformRating = rating("tmdb", null, "TMDB needs an API key. None is configured, so this source was not queried.", ids.tmdb ? tmdbUrl(kind, ids.tmdb) : null);
  if (tmdbKey && ids.tmdb) {
    const r = await fetchTmdbRating(kind, ids.tmdb, tmdbKey).catch(() => null);
    tmdb = rating("tmdb", r, r ? "TMDB user score, read from the TMDB API." : "TMDB did not answer when the snapshot was taken.", tmdbUrl(kind, ids.tmdb));
  }

  const studio = mainStudio(m);
  anime.push({
    id: m.id,
    slug: seed.slug,
    rank: seed.rank,
    title: { display: seed.title, english: m.title.english, romaji: m.title.romaji, native: m.title.native },
    cover: m.coverImage.extraLarge,
    banner: m.bannerImage,
    palette: await extractPalette(m.coverImage.extraLarge),
    synopsis: synopsisOf(m.description),
    genres: m.genres,
    tags: m.tags.filter((t) => !t.isMediaSpoiler && !t.isGeneralSpoiler).sort((a, b) => b.rank - a.rank).slice(0, 6).map((t) => t.name),
    studio: studio ? studios.get(studio.id) ?? null : null,
    partners: m.studios.edges.filter((e) => e.node.id !== studio?.id).map((e) => e.node.name),
    year: m.seasonYear ?? m.startDate.year,
    startDate: iso(m.startDate),
    endDate: iso(m.endDate),
    format,
    episodes: m.episodes,
    duration: m.duration,
    instalments: format === "TV" ? instalments.get(m.id) ?? null : null,
    source: m.source,
    status: m.status,
    creator: staffNamed(m, /original (creator|story)/i),
    director: staffNamed(m, /^(chief )?director/i),
    popularity: m.popularity,
    favourites: m.favourites,
    ratings: {
      anilist: rating("anilist", toReading(m), "AniList weighted average score, read from the AniList GraphQL API."),
      mal: malReading && !(malReading instanceof Error)
        ? rating("mal", malReading, "MyAnimeList score, read through the Jikan API.")
        : rating("mal", null, `MyAnimeList could not be read when the snapshot was taken${malReading ? ` (${malReading.message})` : ""}.`, m.idMal ? `https://myanimelist.net/anime/${m.idMal}` : null),
      imdb: imdbHit
        ? rating("imdb", { ...imdbHit, max: 10, url: imdbUrl(ids.imdb!) }, `IMDb non-commercial dataset (title.ratings), file dated ${imdb!.fileDate}.`)
        : rating("imdb", null, ids.imdb ? "This title is missing from the IMDb ratings dataset." : "Wikidata lists no IMDb id for this entry, so IMDb was not queried.", ids.imdb ? imdbUrl(ids.imdb) : null),
      tmdb,
    },
    ids: { anilist: m.id, mal: m.idMal, imdb: ids.imdb, tmdb: ids.tmdb },
    characters: m.characters.edges
      .filter((e) => e.role !== "BACKGROUND")
      .slice(0, 8)
      .map((e) => ({
        id: e.node.id,
        name: e.node.name.full,
        nativeName: e.node.name.native,
        role: e.role as "MAIN" | "SUPPORTING",
        image: e.node.image.large,
        ...characterText(e.node.description),
        gender: e.node.gender,
        age: e.node.age,
        favourites: e.node.favourites,
        voiceActor: e.voiceActors[0]?.name.full ?? null,
        url: e.node.siteUrl,
      })),
  });
}

// A provider that is down today must not erase a reading taken on an earlier run:
// keep the older value, with its own retrieval date, until a fresh one replaces it.
const previous = await readFile(OUT, "utf8").then((t) => JSON.parse(t) as Snapshot, () => null);
for (const a of anime) {
  const old = previous?.anime.find((p) => p.slug === a.slug)?.ratings;
  for (const source of ["mal", "imdb", "tmdb"] as const) {
    if (a.ratings[source].score == null && old?.[source]?.score != null) a.ratings[source] = old[source];
  }
}

for (const a of anime) {
  assert(a.cover && a.characters.length >= 2, `${a.slug}: missing cover or characters`);
  assert(typeof a.ratings.anilist.score === "number", `${a.slug}: AniList score missing`);
}

const snapshot: Snapshot = {
  meta: {
    generatedAt: now,
    sources: {
      anilist: { name: "AniList", url: "https://anilist.co", note: "Titles, artwork, characters, studios, scores and popularity via the AniList GraphQL API." },
      mal: { name: "MyAnimeList", url: "https://myanimelist.net", note: "Scores and rating counts via the unofficial Jikan API (jikan.moe)." },
      imdb: { name: "IMDb", url: "https://www.imdb.com", note: `Ratings from the IMDb Non-Commercial Datasets (file dated ${imdb?.fileDate ?? "n/a"}). Information courtesy of IMDb (https://www.imdb.com). Used with permission, for personal and non-commercial use.` },
      tmdb: { name: "TMDB", url: "https://www.themoviedb.org", note: tmdbKey ? "User scores via the TMDB API. This product uses the TMDB API but is not endorsed or certified by TMDB." : "Not queried: no TMDB_API_KEY was configured when this snapshot was taken." },
      wikidata: { name: "Wikidata", url: "https://www.wikidata.org", note: "IMDb and TMDB identifiers matched from MyAnimeList ids (CC0)." },
    },
  },
  anime,
};

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);

console.table(anime.map((a) => ({
  "#": a.rank, title: a.title.display.slice(0, 22), year: a.year, fmt: a.format, ep: a.episodes, tvs: a.instalments,
  AL: a.ratings.anilist.score, MAL: a.ratings.mal.score, IMDb: a.ratings.imdb.score, imdb: a.ids.imdb, tmdb: a.ids.tmdb,
  studio: a.studio?.name.slice(0, 14), chars: a.characters.length, accent: a.palette.accent, banner: a.banner ? "y" : "-",
})));
log(`wrote src/data/snapshot.json (${anime.length} titles)`);
