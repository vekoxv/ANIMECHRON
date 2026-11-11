"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Art } from "@/components/ui/Art";
import { Rolling, useTilt } from "@/components/ui/motion";
import { WatchToggle } from "@/components/ui/Watch";
import { fixed, lead, pad2, theme } from "@/lib/catalog";
import type { Scored } from "@/lib/useCatalog";

export interface Item {
  a: Scored;
  /** Place in the whole collection under the current sort. */
  position: number;
  /** Why a search matched, when it was not the title itself. */
  match: string;
}

export const LAYOUT_SPRING = { type: "spring", stiffness: 240, damping: 30 } as const;

function Card({ item, sortShort }: { item: Item; sortShort: string }) {
  const { a, position, match } = item;
  const tilt = useTilt(7);
  const hero = lead(a);
  return (
    <motion.li layout initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ layout: LAYOUT_SPRING, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={theme(a)} className="relative">
      <Link href={`/anime/${a.slug}`} data-cursor="Open" className="tilt group block" {...tilt}>
        <div className="relative aspect-[2/3] overflow-hidden bg-deep shadow-[0_45px_60px_-48px_var(--a)]">
          {/* Beneath the cover: the lead character, shown when the cover is cut back on hover. */}
          <div className="absolute inset-x-0 bottom-0 h-[46%]">
            <Art src={hero.image} alt="" sizes="(max-width: 640px) 50vw, 22vw" position="50% 14%" className="size-full" />
            <div aria-hidden="true" className="tone absolute inset-0 text-accent/50" />
            <p className="t-label absolute bottom-2.5 left-3 bg-ink px-1.5 py-1 text-bone">{hero.name}</p>
          </div>
          <div className="absolute inset-0 transition-[clip-path] duration-700 ease-cut [clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] group-hover:[clip-path:polygon(0_0,100%_0,100%_54%,0_68%)] group-focus-visible:[clip-path:polygon(0_0,100%_0,100%_54%,0_68%)]">
            <Art share={a.slug} src={a.cover} alt={`${a.title.display} cover art`} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw" className="size-full" imgClassName="tilt-depth" />
          </div>
          <div aria-hidden="true" className="tilt-glare" />
          <div className="absolute left-0 top-0 flex items-end gap-2 bg-ink py-1.5 pl-2.5 pr-3">
            <Rolling value={pad2(position)} className="t-num text-4xl" />
            <span className="t-label pb-0.5 !text-[0.6rem] text-mute">{sortShort}</span>
          </div>
          <p className="t-num absolute bottom-0 right-0 bg-accent px-2.5 py-1.5 text-2xl text-ink" data-tip="Consensus: mean of the platforms with a verified score" data-tip-side="right">
            {fixed(a.consensus, 2)}
          </p>
        </div>

        <div className="mt-3 border-t border-rule pt-2.5 transition-colors duration-500 group-hover:border-accent">
          {/* The title lifts to show its original Japanese name. */}
          <div className="h-8 overflow-hidden">
            <div className="transition-transform duration-500 ease-ink group-hover:-translate-y-1/2 group-focus-visible:-translate-y-1/2">
              <h3 className="t-display truncate text-[1.7rem] !leading-8">{a.title.display}</h3>
              <p lang="ja" aria-hidden="true" className="t-jp truncate !leading-8 text-accent">
                {a.title.native}
              </p>
            </div>
          </div>
          <p className="t-label mt-1.5 text-mute">
            {a.year} · {a.format === "MOVIE" ? "Film" : "TV"} · {a.studio?.name}
          </p>
          <p className="t-label mt-1 text-bone/55">{a.genres.slice(0, 3).join(" / ")}</p>
          {match && <p className="t-label mt-1.5 text-cyan">{match}</p>}
        </div>
      </Link>
      <WatchToggle slug={a.slug} title={a.title.display} className="absolute right-2 top-2" />
    </motion.li>
  );
}

/** Mode A — large artwork cards with depth, glare, and a second layer of art under each cover. */
export function GridView({ items, sortShort }: { items: Item[]; sortShort: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 2xl:grid-cols-5">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <Card key={item.a.slug} item={item} sortShort={sortShort} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
