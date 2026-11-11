"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ANIME, CAST } from "@/lib/catalog";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";
import { prefs, spotlightCharacter, ui, useStore } from "@/lib/store";
import type { ViewMode } from "@/lib/store";

interface Command {
  id: string;
  group: "Titles" | "Characters" | "Go to" | "Actions";
  label: string;
  hint: string;
  image?: string | null;
  /** Everything this command can be found by, lower-cased. */
  haystack: string;
  run: () => void;
}

const PAGES = [
  ["/", "Home", "The opening spread"],
  ["/archive", "Archive", "All twenty titles"],
  ["/universe", "Character Universe", "The constellation of casts"],
  ["/intel", "Rating Intelligence", "Weights, charts and your ranking"],
  ["/intel#method", "Rating methodology", "How the overall score is built"],
  ["/lab", "Comparison Lab", "Set two or three titles side by side"],
  ["/dojo", "Versus Dojo", "Rank by head-to-head picks"],
  ["/watchlist", "Watchlist", "Your saved titles and seal"],
  ["/#chronoscope", "Chronoscope", "Scrub the collection through time"],
  ["/#discover", "Discover", "Draw a title at random"],
] as const;

const VIEWS: [ViewMode, string][] = [["grid", "cinematic grid"], ["manga", "manga layout"], ["rank", "ranking table"]];

export function CommandPalette() {
  const open = useStore(ui).palette;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  const close = () => ui.set((s) => ({ ...s, palette: false }));

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      ...ANIME.map((a): Command => ({
        id: `t-${a.slug}`,
        group: "Titles",
        label: a.title.display,
        hint: `${a.year} · ${a.studio?.name ?? ""}`,
        image: a.cover,
        haystack: [a.title.display, a.title.english, a.title.romaji, a.title.native, a.studio?.name, ...a.genres].join(" ").toLowerCase(),
        run: go(`/anime/${a.slug}`),
      })),
      ...CAST.map((c): Command => ({
        id: `c-${c.anime.slug}-${c.id}`,
        group: "Characters",
        label: c.name,
        hint: c.anime.title.display,
        image: c.image,
        haystack: `${c.name} ${c.nativeName ?? ""} ${c.anime.title.display}`.toLowerCase(),
        run: () => {
          spotlightCharacter(c.id);
          router.push(`/anime/${c.anime.slug}#cast`);
        },
      })),
      ...PAGES.map(([href, label, hint]): Command => ({ id: `p-${href}`, group: "Go to", label, hint, haystack: `${label} ${hint} go open page`.toLowerCase(), run: go(href) })),
      ...VIEWS.map(([view, name]): Command => ({
        id: `v-${view}`,
        group: "Actions",
        label: `Show the archive as a ${name}`,
        hint: "Switch display mode",
        haystack: `view mode display switch archive ${name}`,
        run: () => {
          prefs.set((p) => ({ ...p, view }));
          router.push("/archive");
        },
      })),
      {
        id: "a-reset",
        group: "Actions",
        label: "Reset rating weights",
        hint: "Back to the editorial default",
        haystack: "reset weights rating default personal ranking",
        run: () => prefs.set((p) => ({ ...p, weights: DEFAULT_WEIGHTS, crowd: 0 })),
      },
      {
        id: "a-intro",
        group: "Actions",
        label: "Replay the opening sequence",
        hint: "Returns to the home page",
        haystack: "replay intro opening sequence animation",
        run: () => {
          sessionStorage.removeItem("animechron:intro");
          // A full reload on purpose: the intro is gated by a script that runs before first paint.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/");
        },
      },
    ];
  }, [router]);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return commands.filter((c) => c.group === "Go to" || c.group === "Actions");
    const q = tokens.join(" ");
    const order = { Titles: 0, Characters: 1, "Go to": 2, Actions: 3 };
    const perGroup = new Map<string, number>();
    return commands
      .filter((c) => tokens.every((t) => c.haystack.includes(t)))
      .map((c) => ({ c, score: c.label.toLowerCase().startsWith(q) ? 0 : c.label.toLowerCase().includes(q) ? 1 : 2 }))
      .sort((a, b) => order[a.c.group] - order[b.c.group] || a.score - b.score)
      .map(({ c }) => c)
      .filter((c) => {
        const n = perGroup.get(c.group) ?? 0;
        perGroup.set(c.group, n + 1);
        return n < 7;
      });
  }, [commands, query]);

  // Ctrl/Cmd+K anywhere toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.set((s) => ({ ...s, palette: !s.palette }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus moves in on open and back to where it was on close.
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    inputRef.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    close();
    setQuery("");
    setActive(0);
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className="absolute inset-0 bg-ink/85" onClick={close} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-2xl border border-rule bg-ink-2 shadow-[0_40px_120px_-20px_#000]"
            initial={{ y: -18, clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
            animate={{ y: 0, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={onKeyDown}
          >
            <div className="h-0.5 bg-red" />
            <div className="flex items-center gap-3 border-b border-rule px-4">
              <Search size={18} className="shrink-0 text-mute" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
                aria-autocomplete="list"
                aria-label="Search titles, characters, pages and actions"
                placeholder="Search a title, a character, or a command"
                className="h-14 w-full bg-transparent text-lg outline-none placeholder:text-mute"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="t-label shrink-0 border border-rule px-1.5 py-1 text-mute">Esc</kbd>
            </div>

            <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="max-h-[min(58vh,30rem)] overflow-y-auto overscroll-contain p-2">
              {results.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-mute">
                  Nothing matches “{query}”. Try a title, a character name, a genre or a studio.
                </p>
              )}
              {results.map((c, i) => (
                <div key={c.id}>
                  {c.group !== results[i - 1]?.group && <p className="t-label px-3 pb-1.5 pt-3 text-mute">{c.group}</p>}
                  <div
                    id={`palette-${c.id}`}
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    onPointerMove={() => i !== active && setActive(i)}
                    onClick={() => run(c)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-bone text-ink" : ""}`}
                  >
                    {c.image !== undefined && (
                      <span className="relative block h-11 w-8 shrink-0 overflow-hidden bg-ink-3">
                        {c.image && <Image src={c.image} alt="" fill sizes="32px" className="object-cover" />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.label}</span>
                      <span className={`block truncate text-xs ${i === active ? "text-ink/60" : "text-mute"}`}>{c.hint}</span>
                    </span>
                    {i === active && <CornerDownLeft size={15} className="shrink-0 opacity-60" aria-hidden="true" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="t-label flex gap-5 border-t border-rule px-4 py-2.5 text-mute">
              <span>↑↓ Move</span>
              <span>↵ Open</span>
              <span className="ml-auto">{results.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
