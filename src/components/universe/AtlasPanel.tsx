"use client";

import { ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Art } from "@/components/ui/Art";
import { ANIME, fixed, theme } from "@/lib/catalog";
import { spotlightCharacter } from "@/lib/store";
import type { Constellation, Star } from "./sky";

interface Props {
  con: Constellation;
  star: Star | null;
  score: number | null;
  /** The titles most like this one. */
  kin: (typeof ANIME)[number][];
  onStar: (id: number | null) => void;
  onGo: (slug: string) => void;
  onThread: (toSlug: string) => void;
  onClose: () => void;
}

/** What is known about the selected constellation or star, and the ways onward from it. */
export function AtlasPanel({ con, star, score, kin, onStar, onGo, onThread, onClose }: Props) {
  const { a } = con;
  return (
    <motion.aside
      data-panel
      aria-label={star ? `${star.c.name} — ${a.title.display}` : a.title.display}
      style={theme(a)}
      className="absolute inset-x-0 bottom-0 z-10 max-h-[60%] cursor-auto overflow-y-auto border-t border-rule bg-ink-2/95 p-5 xl:inset-y-0 xl:left-auto xl:right-0 xl:max-h-none xl:w-[25rem] xl:border-l xl:border-t-0"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <button type="button" onClick={onClose} aria-label="Close and return to the whole sky" className="absolute right-3 top-3 grid size-10 place-items-center border border-rule hover:border-red hover:text-red">
        <X size={16} />
      </button>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={star ? star.c.id : a.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {star ? (
            <>
              <div className="grid grid-cols-[7rem_1fr] items-end gap-4 pr-10">
                <div className="bg-paper p-1">
                  <Art src={star.c.image} alt={star.c.name} sizes="112px" position="50% 12%" className="aspect-[3/4] w-full" />
                </div>
                <div className="min-w-0">
                  <p className={`t-label ${star.c.role === "MAIN" ? "text-accent" : "text-mute"}`}>{star.c.role === "MAIN" ? "Main character" : "Supporting character"}</p>
                  <h2 className="t-display mt-1 text-4xl">{star.c.name}</h2>
                  {star.c.nativeName && (
                    <p lang="ja" className="t-jp text-sm text-bone/70">
                      {star.c.nativeName}
                    </p>
                  )}
                </div>
              </div>
              <p className="t-label mt-4 text-mute">
                A star of{" "}
                <button type="button" className="link text-accent" onClick={() => onStar(null)}>
                  {a.title.display}
                </button>
              </p>
              <p className="t-serif mt-3 line-clamp-6 text-[0.95rem] text-bone/85">{star.c.description || "AniList has no written profile for this character yet."}</p>
              <Link href={`/anime/${a.slug}#cast`} onClick={() => spotlightCharacter(star.c.id)} className="btn btn-sm btn-solid mt-4">
                Full profile <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <div className="grid grid-cols-[6rem_1fr] items-end gap-4 pr-10">
                <Art src={a.cover} alt="" sizes="96px" className="aspect-[2/3] w-full" />
                <div className="min-w-0">
                  <p className="t-num text-accent">
                    {a.year} · {a.studio?.name}
                  </p>
                  <h2 className="t-display mt-1 text-4xl">{a.title.display}</h2>
                  <p className="t-num mt-1 text-2xl">
                    {fixed(score, 2)} <span className="t-label text-mute">overall</span>
                  </p>
                </div>
              </div>
              <Link href={`/anime/${a.slug}`} className="btn btn-sm btn-solid mt-4">
                Open the file <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </>
          )}

          <h3 className="t-label mt-6 border-t border-rule pt-4 text-mute">{star ? "Others in this constellation" : `Its ${con.stars.length} stars, brightest first`}</h3>
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {[...con.stars]
              .filter((s) => s !== star)
              .sort((x, y) => y.mag - x.mag)
              .map((s) => (
                <li key={s.c.id}>
                  <button type="button" onClick={() => onStar(s.c.id)} className="group block w-full text-left" aria-label={`Go to ${s.c.name}`}>
                    <Art src={s.c.image} alt="" sizes="80px" position="50% 12%" className="aspect-square w-full" imgClassName="transition-transform duration-300 group-hover:scale-110" />
                    <span className="mt-1 block truncate text-xs text-bone/80 group-hover:text-accent">{s.c.name}</span>
                  </button>
                </li>
              ))}
          </ul>

          <h3 className="t-label mt-6 border-t border-rule pt-4 text-mute">Nearest in the sky</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {kin.map((k) => (
              <li key={k.slug}>
                <button type="button" className="chip" onClick={() => onGo(k.slug)}>
                  {k.title.display}
                </button>
              </li>
            ))}
          </ul>
          <label className="mt-5 block">
            <span className="t-label text-mute">Draw the red thread from here to</span>
            <select className="field mt-2 w-full" value="" onChange={(e) => e.target.value && onThread(e.target.value)}>
              <option value="">Choose a destination</option>
              {ANIME.filter((b) => b !== a).map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.title.display}
                </option>
              ))}
            </select>
          </label>
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  );
}
