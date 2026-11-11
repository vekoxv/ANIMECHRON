"use client";

import { RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { SOURCES } from "@/lib/catalog";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";
import { prefs, useStore } from "@/lib/store";
import { SOURCE_IDS } from "@/lib/types";
import type { Ratings } from "@/lib/types";

const PRESETS = [
  { name: "Editorial", weights: DEFAULT_WEIGHTS, crowd: 0, hint: "Every platform counts equally" },
  { name: "Anime fans", weights: { anilist: 2, mal: 2, imdb: 0.5, tmdb: 0.5 }, crowd: 0, hint: "Leans on AniList and MyAnimeList" },
  { name: "General audience", weights: { anilist: 0.5, mal: 0.5, imdb: 2, tmdb: 2 }, crowd: 0, hint: "Leans on IMDb and TMDB" },
  { name: "Crowd favourite", weights: DEFAULT_WEIGHTS, crowd: 0.4, hint: "Blends in audience size" },
];

/**
 * The weighting console. Changes are stored and apply everywhere at once:
 * every "your score" and "your rank" on the site recalculates as a slider moves.
 * Pass `ratings` to mark the platforms that have no score for one particular title.
 */
export function Weights({ ratings }: { ratings?: Ratings }) {
  const p = useStore(prefs);
  const isPreset = (preset: (typeof PRESETS)[number]) => preset.crowd === p.crowd && SOURCE_IDS.every((s) => preset.weights[s] === p.weights[s]);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weighting presets">
        {PRESETS.map((preset) => (
          <button key={preset.name} type="button" className="chip" aria-pressed={isPreset(preset)} data-tip={preset.hint} onClick={() => prefs.set((s) => ({ ...s, weights: preset.weights, crowd: preset.crowd }))}>
            {preset.name}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {SOURCE_IDS.map((id) => {
          const missing = ratings ? ratings[id].score == null : false;
          const value = p.weights[id];
          return (
            <label key={id} className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-3">
              <span className="t-label flex items-center gap-2">
                <span className="size-2 shrink-0" style={{ background: SOURCES[id].color }} />
                {SOURCES[id].name}
              </span>
              <input
                type="range"
                className="slider"
                min={0}
                max={3}
                step={0.25}
                value={value}
                onChange={(e) => prefs.set((s) => ({ ...s, weights: { ...s.weights, [id]: Number(e.target.value) } }))}
                style={{ "--p": `${(value / 3) * 100}%`, "--c": SOURCES[id].color, opacity: missing ? 0.45 : 1 } as CSSProperties}
                aria-valuetext={`${SOURCES[id].name} counts ${value} times${missing ? "; it has no score for this title, so it is left out here" : ""}`}
              />
              <span className="t-num text-right text-lg" data-tip={missing ? "No score for this title — left out, not counted as zero" : undefined} data-tip-side="right">
                {missing ? <span className="text-mute">n/a</span> : `×${value}`}
              </span>
            </label>
          );
        })}
        <label className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-3 border-t border-rule pt-3">
          <span className="t-label" data-tip="Blends in how many people list the title on AniList, ranked within the twenty" data-tip-side="left" tabIndex={0}>
            Audience size
          </span>
          <input type="range" className="slider" min={0} max={0.8} step={0.05} value={p.crowd} onChange={(e) => prefs.set((s) => ({ ...s, crowd: Number(e.target.value) }))} style={{ "--p": `${(p.crowd / 0.8) * 100}%`, "--c": "var(--color-violet)" } as CSSProperties} aria-valuetext={`${Math.round(p.crowd * 100)} percent of your score comes from audience size`} />
          <span className="t-num text-right text-lg">{Math.round(p.crowd * 100)}%</span>
        </label>
      </div>

      <button type="button" className="t-label link mt-4 inline-flex items-center gap-1.5 text-mute hover:text-bone" onClick={() => prefs.set((s) => ({ ...s, weights: DEFAULT_WEIGHTS, crowd: 0 }))}>
        <RotateCcw size={13} aria-hidden="true" /> Reset to the editorial weighting
      </button>
    </div>
  );
}
