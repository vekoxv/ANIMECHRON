"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Art } from "@/components/ui/Art";
import { lead, theme } from "@/lib/catalog";
import type { Anime } from "@/lib/types";

/**
 * A film strip of lead characters, one per title. Choosing a face turns the whole
 * hero into that character's world. Arrow keys move along the strip.
 */
export function CharacterStrip({ list, index, onSelect }: { list: Anime[]; index: number; onSelect: (i: number) => void }) {
  const track = useRef<HTMLDivElement>(null);

  // Keep the chosen frame centred without ever scrolling the page itself.
  useEffect(() => {
    const el = track.current;
    const frame = el?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    if (!el || !frame) return;
    el.scrollTo({ left: frame.offsetLeft - el.clientWidth / 2 + frame.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  return (
    <div
      ref={track}
      role="group"
      aria-label="Choose a character to change the featured title"
      className="flex snap-x gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = (index + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length;
        onSelect(next);
        track.current?.querySelector<HTMLElement>(`[data-i="${next}"]`)?.focus({ preventScroll: true });
      }}
    >
      {list.map((a, i) => {
        const c = lead(a);
        const on = i === index;
        return (
          <button
            key={a.slug}
            type="button"
            data-i={i}
            aria-pressed={on}
            aria-label={`${c.name} — ${a.title.display}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(i)}
            style={theme(a)}
            className={`group relative h-[5.5rem] shrink-0 snap-center overflow-hidden transition-[width] duration-700 ease-ink sm:h-24 ${on ? "w-48 sm:w-60" : "w-12 sm:w-16"}`}
          >
            <Art
              src={c.image}
              alt=""
              sizes="240px"
              position="50% 18%"
              className="absolute inset-0"
              imgClassName={on ? "" : "opacity-55 grayscale transition-[opacity,filter] duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100"}
            />
            {on && <motion.span layoutId="strip-thread" className="absolute inset-x-0 top-0 z-10 h-[3px] bg-red" transition={{ type: "spring", stiffness: 300, damping: 34 }} />}
            <span className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-2.5 pb-1.5 pt-6 text-left transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}>
              <span className="t-display block truncate text-xl text-bone">{c.name}</span>
              <span className="t-label block truncate !text-[0.6rem] text-accent">{a.title.display}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
