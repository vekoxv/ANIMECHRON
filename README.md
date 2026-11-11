# ANIMÉCHRON

A cinematic archive of twenty legendary anime: artwork, casts, studios, and ratings
compared honestly across platforms. Next.js 16 (App Router), React 19, TypeScript (strict),
Tailwind CSS 4, Motion.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start
npm test           # scoring, archive filters, dojo maths (node:test, no extra deps)
npm run snapshot   # re-read every provider and rewrite src/data/snapshot.json
```

Node 23.6 or newer is needed for `npm test` and `npm run snapshot` (they run TypeScript directly).

## What is in it

| Route | What it is |
| --- | --- |
| `/` | Opening sequence, the hero with the character strip (covers change by WebGL ink bleed), the kinetic "manifesto" spread, the scroll-driven Top 20 on three depth planes, the Chronoscope, random discovery, a shelf of six volumes |
| `/archive` | The twenty in three modes (cinematic grid, manga layout, ranking table) with search, six combined filters and nine sorts |
| `/anime/[slug]` | The full file on a title: header, story and record sheet, platform verdicts, cast with profiles, studio spotlight, related titles |
| `/universe` | The character universe as a star atlas: 160 characters in 20 constellations, arranged by likeness, era or studio, with a route finder between any two stories |
| `/intel` | Rating intelligence: the field (one sheet, four questions, all twenty titles move), weighting console, personal ranking, methodology |
| `/lab` | Comparison lab for two or three titles |
| `/dojo` | Versus dojo: rank by head-to-head picks |
| `/watchlist` | Watchlist with statuses, hours, and a generated seal |

`Ctrl/Cmd + K` opens the command palette anywhere.

## Where the numbers come from

Nothing in the dataset is typed in by hand. `scripts/snapshot.mts` reads every provider and
writes `src/data/snapshot.json`, with a source note and a retrieval time on every rating.

| Data | Source | Key needed |
| --- | --- | --- |
| Titles, artwork, synopsis, characters, studios, AniList score and audience | AniList GraphQL API | no |
| MyAnimeList score and rating count | Jikan API | no |
| IMDb rating and vote count (stored snapshot) | IMDb Non-Commercial Datasets, `title.ratings` | no |
| IMDb rating (live) | OMDb API | `OMDB_API_KEY` |
| TMDB score | TMDB API | `TMDB_API_KEY` |
| IMDb and TMDB ids for each title | Wikidata (matched from the MyAnimeList id) | no |
| Each title's palette | Extracted from its own cover image at snapshot time | no |

Rules the code follows:

- A platform with no verified score is shown as **Unavailable** with the reason. It is left out
  of the overall score and the remaining weights are renormalised; it is never counted as zero.
- A source that was not queried (no key) says so. It is not described as "checked".
- The site renders from the stored snapshot, so it is complete with every API down. On each
  visit `GET /api/ratings` refreshes what it can server-side (cached six hours; keys never
  reach the browser) and the interface marks each value **Live** or **Snapshot**.
- A provider that is down when the snapshot is retaken does not erase an older reading; the
  older value stays, with its own date.

Optional keys go in `.env.local` (see `.env.example`).

**State of this snapshot:** AniList and IMDb are present for all twenty titles. MyAnimeList is
"Unavailable" because the Jikan API could not be reached from the build machine on the day
(connection timeouts); it fills in automatically, live, wherever Jikan is reachable, and
`npm run snapshot` stores it. TMDB is "Unavailable" because no key was configured.

IMDb data is from the IMDb Non-Commercial Datasets: personal and non-commercial use only.
A commercial deployment needs a licence from IMDb or should rely on the OMDb path.

## Architecture

```
scripts/snapshot.mts        builds the dataset (self-checks ids against titles before writing)
src/data/snapshot.json      the stored dataset, with provenance
src/lib/
  types.ts                  Anime, Character, PlatformRating, Snapshot, LiveRatings
  sources/                  one adapter per provider (anilist, jikan, omdb, tmdb) + shared http
  server/live.ts            server-only live refresh behind /api/ratings
  scoring.ts                normalise, weighted score, disagreement, ranking   (tested)
  taste.ts                  Elo, Spearman, duel scheduling                     (tested)
  kinship.ts                likeness between titles, MDS layout, shortest thread (tested)
  ink.ts                    WebGL ink-bleed transition between two images
  catalog.ts                the dataset as modules: lookups, related titles, formatting
  store.ts                  ~40-line external store with localStorage persistence
  useCatalog.ts             titles + live ratings + the visitor's weights -> scores and ranks
src/components/
  ui/                       Art, Reveal/Split, tilt, magnetic, rolling numerals, watch controls
  chrome/                   nav, command palette, cursor, intro, footer, providers
  charts/                   radar, field strip, bars (hand-drawn SVG/HTML, no chart library)
  home/ archive/ detail/ intel/ lab/ universe/ dojo/ watchlist/
```

Dependencies added to the scaffold: `motion` (interface and layout animation) and
`lucide-react` (icons). Charts, the star atlas, particles, the seal and the ink shader are
hand-written (the shader is raw WebGL 1, about forty lines of GLSL); route transitions use the
browser View Transitions API through React. No Three.js: one quad and two textures do not need it.

## Motion

- **Intro**: a red line is drawn, ink gathers on it, the wordmark rises from it, and the screen
  splits along that line. Once per session, skippable, never under reduced motion, and gated by
  a pre-paint script so return visits do not flash it.
- **Route transitions**: pages wipe in on a slanted edge; a cover you click expands into the
  same cover on its detail page (`view-transition-name` is given to the clicked cover only).
- **Panel reveals**: frames open along slanted gutters as they scroll in (CSS `clip-path`,
  triggered by one IntersectionObserver hook; nothing runs per frame in JS).
- **Kinetic numerals**: rank and year digits roll like an odometer when order changes.
- **Depth**: the hero has five planes on one pair of springs; cards tilt with a glare and a
  second layer of art under each cover.
- **Scroll**: the Top 20 pins and travels sideways on wide screens; detail headers drift.
- **Ink bleed**: when the hero changes title, or the discovery card lands, the new artwork
  soaks through the old along a ragged noise-driven front with a wet dark rim (fragment shader).
  The real `<img>` stays underneath; without WebGL the picture simply swaps.
- **Scroll-linked depth**: the manifesto headline's three lines slide against each other, its
  artwork sits on separate planes, and the red thread is drawn through the spread by the scroll.
  Section headings carry a giant outlined ghost of their Japanese title that drifts behind them
  (CSS scroll timelines, no JavaScript).
- `prefers-reduced-motion` disables all of it; touch devices get swipe instead of pinning.

## Three original features

1. **Chronoscope** (`/#chronoscope`). Drag a playhead across 1995–2023 and the shelf rewinds to
   what had premiered by that year; standings re-form around each arrival with rolling ranks.
   The playhead is a restyled native range input, so it is draggable, focusable and
   arrow-key driven with no custom pointer code.
2. **Versus Dojo** (`/dojo`). Instead of asking for scores it asks "which of these two?".
   Each pick updates an Elo rating; duels are scheduled between the least-tested titles of
   similar rating so every choice is informative. After eight duels it shows your full ranking
   and, by Spearman rank correlation, which platform's taste is closest to yours.
3. **Hanko** (`/watchlist`). A personal seal generated from your watchlist: genre shares form
   the outer band, one tick per title encodes its status, and a mirrored block is cut from a
   hash of the exact list. It is deterministic, exports as PNG, and the whole list travels in a
   20-character link (`/watchlist#s=...`) that anyone can open and choose to save.

## Version 2: what was rebuilt, and why

The first version is kept untouched in `animechron-v1/` (source only; run `npm install` there to
start it). Version 2 took the five weakest parts of it and rebuilt them rather than decorating them.

| Weakness in v1 | What replaced it |
| --- | --- |
| **The universe was a node diagram.** Circles on rings, hub and spoke, positions that meant nothing, and 180 images loaded on arrival. | **A star atlas on one canvas.** Each series is a constellation drawn as a single figure through its cast; a star's brightness is the character's AniList favourites. Position now means something: by default the sky is a map of likeness, laid out by classical multidimensional scaling over shared genres, themes, studio and director (`lib/kinship.ts`). It can be re-arranged by era or studio and the constellations fly to their new places. Portraits load only for what is hovered or selected. |
| **Nothing connected one story to another.** | **The red thread** (new feature). Pick any two titles and the atlas finds the gentlest chain between them: Dijkstra over the likeness graph with a steep penalty on long hops, so the route passes through the titles that lie between. Every hop says what the two share. It is labelled as likeness, never as shared canon. |
| **Intelligence was a dashboard**: a grid of four separate charts. | **The field.** One sheet on which all twenty covers stay put as objects; choosing a question (standings, loved vs watched, disputes, through time) or moving a weight makes them travel to new positions. Genre and studio statistics became lenses on the same sheet. Positions are CSS custom properties resolved in container units, so the browser animates plain transforms and no layout is measured in JavaScript. |
| **Motion was all wipes and fades.** | **A WebGL ink engine** (`lib/ink.ts`) for image-to-image transitions, plus scroll-linked typography and depth planes described under Motion. |
| **Flat, templated sections**: a two-column manifesto, a four-card "portals" grid, four identical rating cards, a uniform cast grid. | The manifesto is now a kinetic spread with artwork between its lines; the portals became a **shelf of six volumes** with spines that open; the ratings became a **verdict sheet** where each score drops onto one shared scale; the cast became a staggered **line-up** with the lead set at true size over the series cover. |

Measured in the production build, same machine:

| Page | v1 | v2 |
| --- | --- | --- |
| `/universe` DOM nodes | 1,479 | 258 |
| `/universe` image requests on arrival | 180 | 0 |
| `/intel` DOM nodes | 1,326 | 1,141 |
| JavaScript loaded (compressed), `/universe` · `/intel` · `/` | 289 · 299 · 300 KB | 291 · 304 · 305 KB |

Unit tests grew from 15 to 20 (likeness, MDS, thread).

## Known limits

- The ink bleed needs WebGL and the drifting ghost headings need CSS scroll timelines (current
  Chrome, Edge and Safari). Elsewhere the image swaps directly and the headings stay still.

- The cover-to-cover morph and page wipes need the View Transitions API (current Chrome, Edge,
  Safari, Firefox). Older browsers navigate without the animation.
- Browser back/forward restores the previous page instantly, without a transition.
- Character portraits from AniList are small (about 230px wide), so they are composed as framed
  prints rather than blown up full-screen.
- "TV instalments" counts TV entries in a title's AniList sequel chain; for long franchises that
  includes follow-up series, which is why it is labelled that way rather than "seasons".
- Japanese text uses the reader's system Mincho instead of a webfont (a CJK webfont is hundreds
  of files).
