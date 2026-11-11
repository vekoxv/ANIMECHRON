/** Rating platforms the archive knows how to read. */
export type SourceId = "anilist" | "mal" | "imdb" | "tmdb";

export const SOURCE_IDS: SourceId[] = ["anilist", "mal", "imdb", "tmdb"];

/** One platform's verdict on one title. `score` is null when nothing verified exists. */
export interface PlatformRating {
  source: SourceId;
  /** Score on the provider's own scale. */
  score: number | null;
  /** Top of the provider's scale (100 for AniList, 10 elsewhere). */
  max: number;
  /** Number of ratings behind the score, when the provider publishes it. */
  votes: number | null;
  /** Public page for this title on the provider. */
  url: string | null;
  /** ISO time the value was read from the provider. */
  retrievedAt: string | null;
  origin: "live" | "snapshot" | "unavailable";
  /** Where the number came from, or why there is none. */
  note: string;
}

export type Ratings = Record<SourceId, PlatformRating>;

export interface Palette {
  /** Dominant vivid colour of the cover, tuned to stay legible on ink. */
  accent: string;
  /** Second colour family found in the cover. */
  second: string;
  /** Near-black tint of the accent, for atmosphere. */
  deep: string;
}

export interface Character {
  id: number;
  name: string;
  nativeName: string | null;
  role: "MAIN" | "SUPPORTING";
  image: string | null;
  description: string;
  /** Labelled facts lifted from the AniList profile (height, affiliation…). */
  facts: { label: string; value: string }[];
  gender: string | null;
  age: string | null;
  favourites: number | null;
  voiceActor: string | null;
  url: string;
}

export interface StudioWork {
  id: number;
  title: string;
  year: number | null;
  format: string | null;
  cover: string | null;
  color: string | null;
  url: string;
}

export interface Studio {
  id: number;
  name: string;
  url: string;
  favourites: number | null;
  /** Most popular productions where this studio is the main studio (AniList). */
  works: StudioWork[];
}

export interface Anime {
  id: number;
  slug: string;
  /** Editorial position in the ANIMÉCHRON collection, 1–20. */
  rank: number;
  title: { display: string; english: string | null; romaji: string; native: string | null };
  cover: string;
  banner: string | null;
  palette: Palette;
  synopsis: string;
  genres: string[];
  tags: string[];
  studio: Studio | null;
  /** Other companies credited on AniList (producers, co-studios). */
  partners: string[];
  year: number | null;
  startDate: string | null;
  endDate: string | null;
  format: "TV" | "MOVIE";
  episodes: number | null;
  /** Minutes per episode, or full runtime for a film. */
  duration: number | null;
  /** TV instalments in the AniList sequel chain, this entry included. */
  instalments: number | null;
  source: string | null;
  status: string | null;
  creator: string | null;
  director: string | null;
  /** Members who list the title on AniList. */
  popularity: number | null;
  favourites: number | null;
  ratings: Ratings;
  ids: { anilist: number; mal: number | null; imdb: string | null; tmdb: number | null };
  characters: Character[];
}

export interface Snapshot {
  meta: {
    generatedAt: string;
    /** Attribution and provenance for every provider that fed this file. */
    sources: Record<string, { name: string; url: string; note: string }>;
  };
  anime: Anime[];
}

/** Payload of GET /api/ratings: fresh ratings keyed by slug, plus per-source health. */
export interface LiveRatings {
  generatedAt: string;
  ratings: Record<string, Partial<Ratings>>;
  sources: Record<SourceId, { ok: boolean; message: string }>;
}
