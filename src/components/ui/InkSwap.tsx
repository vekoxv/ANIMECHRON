"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { InkStage } from "@/lib/ink";
import { Art } from "./Art";

const INK: [number, number, number] = [7, 8, 11];
const drawable = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;

interface Props {
  src: string | null;
  alt: string;
  sizes: string;
  preload?: boolean;
  position?: string;
  /** Which way the user travelled: positive bleeds in from the right, negative from the left. */
  dir?: number;
  /** Start from a sheet of ink instead of the previous picture (and animate on first appearance). */
  fromInk?: boolean;
  className?: string;
}

/**
 * An image slot whose picture changes by ink bleed (see lib/ink.ts).
 * The real <img> is always in the document — for assistive tech, for first paint, and as the
 * fallback: without WebGL, or under reduced motion, the picture simply swaps.
 * The canvas sits on top of it and is visible only while a transition runs.
 * The GPU context is created on the first transition, so slots that never change cost nothing.
 */
export function InkSwap({ src, alt, sizes, preload, position, dir = 1, fromInk = false, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<InkStage | null>(null);
  const unusable = useRef(false);
  /** The picture currently at rest, kept so it can be the "from" side of the next bleed. */
  const resting = useRef<HTMLImageElement | null>(null);
  const first = useRef(true);

  useEffect(
    () => () => {
      stage.current?.destroy();
      stage.current = null;
    },
    [],
  );

  // Runs before paint: the canvas takes over with the old picture before the new <img> can flash in.
  useLayoutEffect(() => {
    const img = box.current?.querySelector("img") ?? null;
    const cover = canvas.current;
    if (!img || !cover) return;
    const animate = !(first.current && !fromInk) && !unusable.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    first.current = false;
    let cancelled = false;
    const loaded = drawable(img) ? Promise.resolve() : new Promise<void>((done) => img.addEventListener("load", () => done(), { once: true }));
    const rest = () => {
      if (cancelled) return;
      resting.current = img;
      cover.style.visibility = "hidden";
    };

    if (animate) {
      try {
        stage.current ??= new InkStage(cover);
        const before = resting.current;
        stage.current.show(!fromInk && before && drawable(before) ? before : INK);
        cover.style.visibility = "visible";
      } catch {
        unusable.current = true; // no WebGL here: plain swaps from now on
      }
    }
    const live = stage.current;
    if (!animate || unusable.current || !live) loaded.then(rest);
    else
      loaded
        .then(() => img.decode().catch(() => undefined))
        .then(() => (cancelled || live.lost ? undefined : live.to(img, [dir > 0 ? -1 : 1, 0.28], INK)))
        .then(rest);
    return () => {
      cancelled = true;
      if (drawable(img)) resting.current = img; // interrupted mid-bleed: the next one starts from where this was heading
    };
    // `dir` and `fromInk` describe the change that `src` triggers; they must not re-run it on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <Art key={src} src={src} alt={alt} sizes={sizes} preload={preload} position={position} className="size-full" />
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" style={{ visibility: "hidden" }} />
    </div>
  );
}
