"use client";

import { Check, Download, Link2 } from "lucide-react";
import { useRef, useState } from "react";
import { ANIME, GENRES } from "@/lib/catalog";
import type { WatchStatus } from "@/lib/store";

const INK = "#d91a2f";
const PAPER = "#ebe4d4";
const CODES: Record<WatchStatus, string> = { planned: "p", watching: "w", completed: "c" };
const FROM_CODE: Record<string, WatchStatus> = { p: "planned", w: "watching", c: "completed" };

/** A watchlist as 20 characters, one per title in archive order: p, w, c, or - for "not listed". */
export const encodeList = (list: Record<string, WatchStatus>) => ANIME.map((a) => (list[a.slug] ? CODES[list[a.slug]] : "-")).join("");

/** Reads a shared code back into a watchlist. Anything that is not exactly a valid code is rejected. */
export function decodeList(code: string): Record<string, WatchStatus> | null {
  if (!new RegExp(`^[-pwc]{${ANIME.length}}$`).test(code)) return null;
  const out: Record<string, WatchStatus> = {};
  ANIME.forEach((a, i) => {
    if (code[i] !== "-") out[a.slug] = FROM_CODE[code[i]];
  });
  return out;
}

/** FNV-1a: a small stable hash, so the same list always cuts the same seal. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

const polar = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [Math.round((160 + r * Math.cos(rad)) * 100) / 100, Math.round((160 + r * Math.sin(rad)) * 100) / 100] as const;
};
const arc = (r: number, from: number, to: number) => {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/**
 * ORIGINAL FEATURE — the Hanko.
 * A personal seal generated from the watchlist, the way a carved name-stamp stands for its owner:
 *   · outer band  — one arc per genre, as long as that genre's share of the list
 *   · tick ring   — one mark per title in archive order; longer marks are further along (planned < watching < completed)
 *   · centre      — a mirrored 5×5 block cut from a hash of the exact list
 * Deterministic: the same list always makes the same seal, and it can be rebuilt from its 20-character code.
 */
export function Seal({ list, readOnly = false }: { list: Record<string, WatchStatus>; readOnly?: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);
  const code = encodeList(list);
  const titles = ANIME.filter((a) => list[a.slug]);
  const empty = titles.length === 0;
  const seed = hash(code);

  // Genre band: arcs proportional to how often each genre appears in the list.
  const counts = GENRES.map((g) => ({ g, n: titles.filter((a) => a.genres.includes(g)).length })).filter((c) => c.n > 0);
  const total = counts.reduce((n, c) => n + c.n, 0);
  const gap = 4;
  const band = counts.map((c, i) => {
    const start = (counts.slice(0, i).reduce((n, before) => n + before.n, 0) / total) * 360;
    return { ...c, from: start + gap / 2, to: start + (c.n / total) * 360 - gap / 2 };
  });
  const strongest = [...counts].sort((a, b) => b.n - a.n)[0];

  // Centre block: 15 hash bits fill the left three columns; the right two mirror them.
  const cells: [number, number][] = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) if ((seed >>> (row * 3 + col)) & 1) cells.push([row, col], ...(col < 2 ? [[row, 4 - col] as [number, number]] : []));

  const download = () => {
    if (!svg.current) return;
    const xml = new XMLSerializer().serializeToString(svg.current);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(image, 64, 64, 896, 896);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "animechron-seal.png";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };

  const shareUrl = () => `${window.location.origin}/watchlist#s=${code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link", shareUrl()); // clipboard blocked: hand the link over the plain way
    }
  };

  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320" className="h-auto w-full max-w-xs" role="img" aria-label={empty ? "An uncut seal: the watchlist is empty" : `Seal generated from a watchlist of ${titles.length} titles; strongest genre ${strongest.g}`}>
        <defs>
          <filter id="seal-ink" x="-6%" y="-6%" width="112%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed % 997} result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed={(seed % 499) + 3} result="grit" />
            <feColorMatrix in="grit" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="wear" />
            <feComposite in="rough" in2="wear" operator="in" />
          </filter>
        </defs>
        <g filter="url(#seal-ink)" transform={`rotate(${(seed % 11) - 5} 160 160)`} opacity={empty ? 0.25 : 1}>
          <circle cx="160" cy="160" r="150" fill="none" stroke={INK} strokeWidth="7" />
          {empty && <circle cx="160" cy="160" r="131" fill="none" stroke={INK} strokeWidth="9" strokeDasharray="2 10" />}
          {band.map((s) => (
            <path key={s.g} d={arc(131, s.from, Math.max(s.from + 0.5, s.to))} fill="none" stroke={INK} strokeWidth="11" />
          ))}
          {ANIME.map((a, i) => {
            const status = list[a.slug];
            const length = status === "completed" ? 17 : status === "watching" ? 11 : status === "planned" ? 6 : 0;
            if (!length) return <circle key={a.slug} cx={polar(111, i * 18)[0]} cy={polar(111, i * 18)[1]} r="1.1" fill={INK} />;
            const [x1, y1] = polar(118, i * 18);
            const [x2, y2] = polar(118 - length, i * 18);
            return <line key={a.slug} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="4.5" />;
          })}
          {empty ? (
            <rect x="94" y="94" width="132" height="132" fill="none" stroke={INK} strokeWidth="4" />
          ) : (
            cells.map(([row, col]) => <rect key={`${row}-${col}`} x={94 + col * 27} y={94 + row * 27} width="24.5" height="24.5" fill={INK} />)
          )}
        </g>
      </svg>

      <div>
        <h3 className="t-display text-3xl">{empty ? "Your seal is uncut" : readOnly ? "A shared seal" : "Your seal"}</h3>
        <p className="t-serif mt-2 max-w-md text-ink/80">
          {empty
            ? "Add titles and a seal is cut from them — a mark that belongs to your list alone."
            : `Cut from ${titles.length} title${titles.length === 1 ? "" : "s"}. The outer band is your genres, widest for ${strongest.g}; each mark on the inner ring is one title, longer the further along you are; the block in the centre is unique to this exact list.`}
        </p>
        {!empty && (
          <>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-sm" onClick={download}>
                <Download size={15} aria-hidden="true" /> Save as PNG
              </button>
              <button type="button" className="btn btn-sm" onClick={copy}>
                {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />} {copied ? "Link copied" : "Copy share link"}
              </button>
            </div>
            <p className="t-label mt-3 text-ink/55" aria-live="polite">
              {copied ? "Anyone with the link sees this seal and can save the list." : `List code ${code}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
