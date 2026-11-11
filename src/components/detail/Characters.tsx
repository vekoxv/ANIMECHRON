"use client";

import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Art } from "@/components/ui/Art";
import { SectionHeading } from "@/components/ui/Bits";
import { useTilt } from "@/components/ui/motion";
import { Reveal } from "@/components/ui/Reveal";
import { compact } from "@/lib/catalog";
import { spotlightCharacter, ui, useStore } from "@/lib/store";
import type { Anime, Character } from "@/lib/types";

function Portrait({ c, index, backdrop, onOpen }: { c: Character; index: number; /** Series cover: given only for the lead, who is then set as a print against it. */ backdrop?: string; onOpen: () => void }) {
  const featured = !!backdrop;
  const tilt = useTilt(9);
  const main = c.role === "MAIN";
  return (
    <Reveal from={index % 2 ? "up" : "left"} delay={(index % 4) * 90}>
      <button type="button" onClick={onOpen} data-cursor="Profile" aria-haspopup="dialog" className="tilt group relative block w-full text-left" {...tilt}>
        {/* Two offset sheets behind the portrait give it the weight of a stacked print. */}
        <span aria-hidden="true" className="tone absolute inset-0 translate-x-2.5 translate-y-2.5 bg-accent/15 text-accent/70 transition-transform duration-500 ease-ink group-hover:translate-x-4 group-hover:translate-y-4" />
        <span aria-hidden="true" className="absolute inset-0 translate-x-1 translate-y-1 border border-accent/60 transition-transform duration-500 ease-ink group-hover:translate-x-2 group-hover:translate-y-2" />
        <span className="relative block overflow-hidden bg-deep">
          {backdrop ? (
            <>
              {/* AniList portraits are small. The lead is shown at its true size, pinned over the cover, instead of being blown up. */}
              <Art src={backdrop} alt="" sizes="(max-width: 1024px) 100vw, 46vw" className="aspect-[3/4] w-full" imgClassName="tilt-depth opacity-45 saturate-50" />
              <span aria-hidden="true" className="tone absolute inset-0 text-accent/35" />
              <span className="absolute right-[7%] top-[7%] block w-[44%] rotate-3 bg-paper p-1 shadow-[0_24px_50px_-18px_#000] transition-transform duration-500 ease-ink group-hover:rotate-1 group-hover:scale-[1.03]">
                <Art src={c.image} alt={`${c.name}, lead character`} sizes="(max-width: 1024px) 44vw, 20vw" position="50% 12%" className="aspect-[3/4] w-full" />
              </span>
            </>
          ) : (
            <Art src={c.image} alt={`${c.name}, ${main ? "main" : "supporting"} character`} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw" position="50% 12%" className="aspect-[3/4] w-full" imgClassName="tilt-depth" />
          )}
          <span aria-hidden="true" className="tilt-glare" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent px-3.5 pb-3 pt-14">
            <span className={`t-label !text-[0.6rem] ${main ? "text-accent" : "text-mute"}`}>{featured ? "Lead" : main ? "Main" : "Supporting"}</span>
            <span className={`t-display mt-0.5 block ${featured ? "text-[clamp(2.4rem,6.4vw,6rem)]" : "text-[1.7rem]"}`}>{c.name}</span>
            {c.nativeName && (
              <span lang="ja" className={`t-jp block overflow-hidden text-bone/70 transition-[max-height] duration-500 ease-ink ${featured ? "text-lg" : "max-h-0 text-sm group-hover:max-h-8 group-focus-visible:max-h-8"}`}>
                {c.nativeName}
              </span>
            )}
          </span>
        </span>
      </button>
    </Reveal>
  );
}

function Profile({ anime, cast, index, onMove, onClose }: { anime: Anime; cast: Character[]; index: number; onMove: (i: number) => void; onClose: () => void }) {
  const c = cast[index];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  const facts = [
    ...(c.voiceActor ? [{ label: "Japanese voice", value: c.voiceActor }] : []),
    ...(c.age ? [{ label: "Age", value: c.age }] : []),
    ...(c.gender ? [{ label: "Gender", value: c.gender }] : []),
    ...c.facts,
    ...(c.favourites ? [{ label: "AniList favourites", value: compact(c.favourites) }] : []),
  ];

  return (
    <motion.div className="fixed inset-0 z-[75] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="absolute inset-0 bg-ink/80" onClick={onClose} aria-hidden="true" />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`${c.name} — character profile`}
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto overscroll-contain border-l border-rule bg-ink-2"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowRight") onMove((index + 1) % cast.length);
          if (e.key === "ArrowLeft") onMove((index - 1 + cast.length) % cast.length);
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rule bg-ink-2 px-5 py-3">
          <p className="t-label truncate text-mute">
            {index + 1} of {cast.length} · {anime.title.display}
          </p>
          <div className="flex gap-1.5">
            <button type="button" className="grid size-10 place-items-center border border-rule hover:border-bone" onClick={() => onMove((index - 1 + cast.length) % cast.length)} aria-label="Previous character">
              <ArrowLeft size={16} />
            </button>
            <button type="button" className="grid size-10 place-items-center border border-rule hover:border-bone" onClick={() => onMove((index + 1) % cast.length)} aria-label="Next character">
              <ArrowRight size={16} />
            </button>
            <button ref={closeRef} type="button" className="grid size-10 place-items-center border border-rule hover:border-red hover:text-red" onClick={onClose} aria-label="Close profile">
              <X size={16} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="p-5 sm:p-7">
            <div className="grid grid-cols-[minmax(0,11rem)_1fr] items-end gap-5">
              <div className="bg-paper p-1">
                <Art src={c.image} alt={c.name} sizes="176px" position="50% 12%" className="aspect-[3/4] w-full" />
              </div>
              <div className="min-w-0 pb-1">
                <p className={`t-label ${c.role === "MAIN" ? "text-accent" : "text-mute"}`}>{c.role === "MAIN" ? "Main character" : "Supporting character"}</p>
                <h3 className="t-display mt-1 text-[clamp(2.2rem,6vw,3.4rem)]">{c.name}</h3>
                {c.nativeName && (
                  <p lang="ja" className="t-jp mt-1 text-bone/70">
                    {c.nativeName}
                  </p>
                )}
              </div>
            </div>

            {facts.length > 0 && (
              <dl className="mt-7 border-t border-rule">
                {facts.map((f) => (
                  <div key={f.label} className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-rule py-2 text-sm">
                    <dt className="t-label pt-0.5 text-mute">{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="t-serif mt-6 text-bone/85">{c.description || "AniList has no written profile for this character yet."}</p>
            <p className="t-label mt-3 text-mute">Profile text and image from AniList. Spoiler-tagged passages are removed.</p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <a href={c.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                Full profile on AniList <ExternalLink size={14} aria-hidden="true" />
              </a>
              <Link href="/universe" onClick={() => spotlightCharacter(c.id)} className="btn btn-sm">
                Find in the universe
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.aside>
    </motion.div>
  );
}

/** D. The cast: stacked portrait prints that open into a full profile, with a way to walk from one to the next. */
export function Characters({ a }: { a: Anime }) {
  const [picked, setPicked] = useState<number | null>(null);
  const spotlight = useStore(ui).spotlight;
  // A character chosen in search or the universe opens here on arrival.
  const fromSpotlight = spotlight == null ? -1 : a.characters.findIndex((c) => c.id === spotlight);
  const open = picked ?? (fromSpotlight >= 0 ? fromSpotlight : null);

  const close = () => {
    setPicked(null);
    spotlightCharacter(null);
  };

  return (
    <section id="cast" aria-label="Characters" className="scroll-mt-(--nav-h) bg-deep py-[clamp(4rem,9vw,8rem)]">
      <div className="shell">
        <SectionHeading jp="登場人物" title="The cast">
          {a.characters.length} characters from {a.title.display}, main cast first. Open a portrait for the profile; inside, the arrows walk through the cast.
        </SectionHeading>
        {/* A line-up, not a grid: the lead stands large, the rest step up and down, and each drifts at its own rate on scroll. */}
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:pb-14">
          {a.characters.map((c, i) => (
            <div key={c.id} className={`drift ${i === 0 ? "col-span-2 row-span-2" : i % 2 ? "lg:mt-14" : ""}`} style={{ "--drift": i === 0 ? "12px" : i % 2 ? "46px" : "22px" } as CSSProperties}>
              <Portrait c={c} index={i} backdrop={i === 0 ? a.cover : undefined} onOpen={() => setPicked(i)} />
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>{open != null && <Profile anime={a} cast={a.characters} index={open} onMove={setPicked} onClose={close} />}</AnimatePresence>
    </section>
  );
}
