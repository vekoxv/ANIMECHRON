/**
 * The editorial collection. Order is curatorial, not a claim of objective rank.
 * `expect` is checked against the title AniList returns, so a wrong id fails loudly.
 */
export const SEEDS = [
  { rank: 1, slug: "fullmetal-alchemist-brotherhood", anilistId: 5114, title: "Fullmetal Alchemist: Brotherhood", expect: "fullmetal alchemist" },
  { rank: 2, slug: "attack-on-titan", anilistId: 16498, title: "Attack on Titan", expect: "attack on titan" },
  { rank: 3, slug: "frieren", anilistId: 154587, title: "Frieren: Beyond Journey's End", expect: "frieren" },
  { rank: 4, slug: "steins-gate", anilistId: 9253, title: "Steins;Gate", expect: "steins;gate" },
  { rank: 5, slug: "hunter-x-hunter", anilistId: 11061, title: "Hunter x Hunter (2011)", expect: "hunter" },
  { rank: 6, slug: "death-note", anilistId: 1535, title: "Death Note", expect: "death note" },
  { rank: 7, slug: "one-piece", anilistId: 21, title: "One Piece", expect: "one piece" },
  { rank: 8, slug: "vinland-saga", anilistId: 101348, title: "Vinland Saga", expect: "vinland saga" },
  { rank: 9, slug: "monster", anilistId: 19, title: "Monster", expect: "monster" },
  { rank: 10, slug: "cowboy-bebop", anilistId: 1, title: "Cowboy Bebop", expect: "cowboy bebop" },
  { rank: 11, slug: "code-geass", anilistId: 1575, title: "Code Geass", expect: "code geass" },
  { rank: 12, slug: "neon-genesis-evangelion", anilistId: 30, title: "Neon Genesis Evangelion", expect: "evangelion" },
  { rank: 13, slug: "mob-psycho-100", anilistId: 21507, title: "Mob Psycho 100", expect: "mob psycho" },
  { rank: 14, slug: "jujutsu-kaisen", anilistId: 113415, title: "Jujutsu Kaisen", expect: "jujutsu kaisen" },
  { rank: 15, slug: "demon-slayer", anilistId: 101922, title: "Demon Slayer", expect: "demon slayer" },
  { rank: 16, slug: "naruto-shippuden", anilistId: 1735, title: "Naruto: Shippuden", expect: "naruto" },
  { rank: 17, slug: "gintama", anilistId: 918, title: "Gintama", expect: "gintama" },
  { rank: 18, slug: "your-name", anilistId: 21519, title: "Your Name", expect: "your name" },
  { rank: 19, slug: "spirited-away", anilistId: 199, title: "Spirited Away", expect: "spirited away" },
  { rank: 20, slug: "a-silent-voice", anilistId: 20954, title: "A Silent Voice", expect: "silent voice" },
];
