"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Art } from "@/components/ui/Art";
import { fixed, lead, pad2, theme } from "@/lib/catalog";
import { LAYOUT_SPRING } from "./GridView";
import type { Item } from "./GridView";

/**
 * A manga page is five frames: one dominant panel, a wide establishing shot,
 * two close-ups, and a full-width closing strip. Pages alternate sides.
 */
const FRAMES = [
  { span: "col-span-2 row-span-2 lg:col-span-6 lg:row-span-4", art: "cover", cut: "cut-a", big: true },
  { span: "col-span-2 lg:col-span-6 lg:row-span-2", art: "banner", cut: "cut-b", big: false },
  { span: "lg:col-span-3 lg:row-span-2", art: "lead", cut: "cut-c", big: false },
  { span: "lg:col-span-3 lg:row-span-2", art: "lead", cut: "cut-d", big: false },
  { span: "col-span-2 lg:col-span-12 lg:row-span-2", art: "banner", cut: "cut-a", big: true },
] as const;

function Frame({ item, index }: { item: Item; index: number }) {
  const { a, position, match } = item;
  const frame = FRAMES[index % 5];
  const mirrored = index % 5 === 0 && Math.floor(index / 5) % 2 === 1;
  const hero = lead(a);
  const src = frame.art === "banner" ? a.banner ?? a.cover : frame.art === "lead" ? hero.image : a.cover;
  const art = (
    <Art
      share={frame.art === "cover" ? a.slug : undefined}
      src={src}
      alt={frame.art === "lead" ? `${hero.name}, ${a.title.display}` : `${a.title.display} artwork`}
      sizes={frame.big ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 1024px) 50vw, 30vw"}
      position={frame.art === "banner" ? "center" : "50% 18%"}
      className="size-full"
      imgClassName="grayscale contrast-[1.15] transition-[filter,transform] duration-700 ease-ink group-hover:scale-105 group-hover:grayscale-0 group-focus-visible:grayscale-0"
    />
  );
  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ layout: LAYOUT_SPRING, duration: 0.5 }} style={theme(a)} className={`${frame.span} ${mirrored ? "lg:col-start-7" : ""}`}>
      <Link href={`/anime/${a.slug}`} data-cursor="Open" className={`group block size-full bg-ink p-[3px] ${frame.cut}`} style={{ "--k": "20px" } as CSSProperties}>
        <div className={`relative size-full overflow-hidden bg-ink ${frame.cut}`} style={{ "--k": "19px" } as CSSProperties}>
          {art}
          <div aria-hidden="true" className="tone absolute inset-0 text-ink/45 transition-opacity duration-500 group-hover:opacity-0" />
          <p aria-hidden="true" className={`t-display t-outline absolute -bottom-[0.1em] right-3 text-paper ${frame.big ? "text-[clamp(6rem,17vw,16rem)]" : "text-[clamp(4rem,9vw,8rem)]"}`}>
            {pad2(position)}
          </p>
          {/* Caption box, ruled like a narration panel. */}
          <div className="absolute left-3 top-3 max-w-[78%] border-2 border-ink bg-paper px-2.5 py-1.5 text-ink">
            <h3 className={`t-display ${frame.big ? "text-[clamp(1.6rem,3.2vw,3rem)]" : "text-xl"}`}>{a.title.display}</h3>
            <p className="t-label mt-0.5 !text-[0.62rem]">
              {a.year} · {a.studio?.name}
              {frame.art === "lead" ? ` · ${hero.name}` : ""}
            </p>
            {match && <p className="t-label mt-0.5 !text-[0.62rem] text-red">{match}</p>}
          </div>
          {frame.big && (
            <p lang="ja" aria-hidden="true" className="t-jp t-vertical absolute right-3 top-3 hidden max-h-[80%] overflow-hidden border-2 border-ink bg-paper px-1 py-2 text-sm text-ink sm:block">
              {a.title.native}
            </p>
          )}
          <p className="t-num absolute bottom-3 left-3 -rotate-3 bg-red px-2 py-1 text-2xl text-bone">
            <span className="sr-only">Consensus </span>
            {fixed(a.consensus, 2)}
          </p>
        </div>
      </Link>
    </motion.li>
  );
}

/** Mode B — the archive drawn as manga pages: ink frames on paper, colour only on approach. */
export function MangaView({ items }: { items: Item[] }) {
  return (
    <div className="paper -mx-(--gutter) px-(--gutter) py-8 lg:py-12">
      <ul className="grid auto-rows-[42vw] grid-cols-2 gap-2.5 [grid-auto-flow:dense] lg:auto-rows-[8.6vw] lg:grid-cols-12 lg:gap-3">
        <AnimatePresence mode="popLayout">
          {items.map((item, i) => (
            <Frame key={item.a.slug} item={item} index={i} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
