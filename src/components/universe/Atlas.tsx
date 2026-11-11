"use client";

import { ChevronLeft, ChevronRight, Maximize, Minus, Plus, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ANIME, CAST } from "@/lib/catalog";
import { spotlightCharacter, ui, useClientValue } from "@/lib/store";
import { useCatalog } from "@/lib/useCatalog";
import { AtlasPanel } from "./AtlasPanel";
import { drawSky, paintBackdrop } from "./drawSky";
import type { View } from "./drawSky";
import { ARRANGEMENT_INFO, nearest, PLACES, route, SKY, WORLD } from "./sky";
import type { Arrangement, Star } from "./sky";

type Selection = { index: number; star: number | null } | null;
interface Hover {
  key: string;
  x: number;
  y: number;
  text: string;
  star: Star | null;
}

const MAX_ZOOM = 2.6;
/** Space the controls take from the sky: a column on the left when wide, a block along the top when narrow. */
const insets = (v: View) => (v.w >= 900 ? { left: 372, top: 0 } : { left: 0, top: 250 });
/** The zoom at which the whole sky fits in the space the panels leave free. */
const fitScale = (v: View) => Math.min((v.w - insets(v).left) / WORLD.w, (v.h - insets(v).top) / WORLD.h) * 0.96;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * THE CHARACTER UNIVERSE, as a star atlas.
 * Each series is a constellation and each character a star (brighter = more favourited).
 * Where a constellation stands means something: by default, likeness to its neighbours.
 * One canvas draws all of it; portraits load only for what is hovered or selected.
 */
export function Atlas() {
  const { bySlug } = useCatalog();
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const backdrop = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const loop = useRef<FrameRequestCallback>(() => {});
  const morph = useRef<{ from: [number, number][]; to: [number, number][]; t: number } | null>(null);
  const still = useRef(false); // reduced motion: the camera cuts instead of gliding
  const view = useRef<View>({ w: 0, h: 0, dpr: 1, x: 0, y: 0, k: 0.3, tx: 0, ty: 0, tk: 0.3, places: PLACES.kinship, arrangement: "kinship", focus: null, star: null, hoverStar: null, stops: [], threadT: 1, font: "sans-serif" });

  const [arrangement, setArrangement] = useState<Arrangement>("kinship");
  const [ends, setEnds] = useState({ from: "", to: "" });
  const [hover, setHover] = useState<Hover | null>(null);
  // A character sent here from a profile ("Find in the universe") arrives already selected.
  const [sel, setSel] = useState<Selection>(() => {
    const member = CAST.find((c) => c.id === ui.get().spotlight);
    return member ? { index: ANIME.indexOf(member.anime), star: member.id } : null;
  });
  const path = useMemo(() => route(ends.from, ends.to), [ends]);
  // On a phone the thread controls start folded away so the sky keeps most of the screen.
  const roomy = useClientValue(() => window.innerWidth >= 640, true);

  /* ── Frame loop: runs only while something is moving ── */
  const tick = useCallback(() => {
    raf.current = 0;
    const v = view.current;
    let busy = false;
    const glide = still.current ? 1 : 0.16;
    for (const [now, goal] of [["x", "tx"], ["y", "ty"], ["k", "tk"]] as const) {
      const gap = v[goal] - v[now];
      if (Math.abs(gap) > (now === "k" ? 0.0004 : 0.3)) {
        v[now] += gap * glide;
        busy = true;
      } else v[now] = v[goal];
    }
    const m = morph.current;
    if (m) {
      m.t = still.current ? 1 : Math.min(1, m.t + 0.02);
      const e = ease(m.t);
      v.places = m.from.map((p, i) => [p[0] + (m.to[i][0] - p[0]) * e, p[1] + (m.to[i][1] - p[1]) * e]);
      if (m.t < 1) busy = true;
      else morph.current = null;
    }
    if (v.stops.length && v.threadT < 1) {
      v.threadT = still.current ? 1 : Math.min(1, v.threadT + 0.028);
      busy = true;
    }
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawSky(ctx, v, backdrop.current);
    if (busy) raf.current = requestAnimationFrame(loop.current);
  }, []);
  // The loop re-schedules itself through a ref, so the callback never has to name itself.
  useEffect(() => {
    loop.current = tick;
  }, [tick]);
  const redraw = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  }, [tick]);

  /* ── Camera ── */
  const flyTo = useCallback(
    (wx: number, wy: number, k: number, besidePanel: boolean) => {
      const v = view.current;
      // Aim at the part of the sky that is not under a panel.
      const { left, top } = insets(v);
      const right = besidePanel && v.w >= 1280 ? 400 : 0;
      const below = besidePanel && v.w < 1280 ? v.h * 0.3 : 0; // on narrower screens the detail panel is a bottom sheet
      v.tk = k;
      v.tx = left + (v.w - left - right) / 2 - wx * k;
      v.ty = top + (v.h - top - below) / 2 - wy * k;
      redraw();
    },
    [redraw],
  );
  const overview = useCallback(() => flyTo(WORLD.w / 2, WORLD.h / 2, fitScale(view.current), false), [flyTo]);
  const zoomAt = (px: number, py: number, factor: number) => {
    const v = view.current;
    const next = Math.min(MAX_ZOOM, Math.max(fitScale(view.current), v.tk * factor));
    v.tx = px - (px - v.tx) * (next / v.tk);
    v.ty = py - (py - v.ty) * (next / v.tk);
    v.tk = next;
    if (still.current) [v.x, v.y, v.k] = [v.tx, v.ty, v.tk];
    redraw();
  };

  const select = useCallback(
    (index: number | null, star: number | null = null) => {
      setSel(index == null ? null : { index, star });
      setHover(null);
      if (index == null) return overview();
      const [cx, cy] = PLACES[view.current.arrangement][index];
      flyTo(cx, cy, Math.max(view.current.tk, 1.15), true);
    },
    [flyTo, overview],
  );

  /* ── Size, first frame, wheel ── */
  useEffect(() => {
    const el = frame.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const v = view.current;
    still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    v.font = `${getComputedStyle(document.documentElement).getPropertyValue("--font-shoulders").trim() || "sans-serif"}, sans-serif`;
    let first = true;
    const size = () => {
      const box = el.getBoundingClientRect();
      v.w = box.width;
      v.h = box.height;
      v.dpr = Math.min(window.devicePixelRatio, 2);
      cv.width = v.w * v.dpr;
      cv.height = v.h * v.dpr;
      backdrop.current = paintBackdrop(v.w, v.h, v.dpr);
      if (first) {
        first = false;
        const start = v.focus != null ? PLACES.kinship[v.focus] : null;
        if (start) flyTo(start[0], start[1], 1.15, true);
        else flyTo(WORLD.w / 2, WORLD.h / 2, fitScale(view.current), false);
        [v.x, v.y, v.k] = [v.tx, v.ty, v.tk]; // no fly-in on arrival
        spotlightCharacter(null);
      }
      redraw();
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0 && v.tk <= fitScale(view.current) * 1.01) return; // fully zoomed out: let the page scroll on
      e.preventDefault();
      const box = el.getBoundingClientRect();
      zoomAt(e.clientX - box.left, e.clientY - box.top, Math.exp(-e.deltaY * 0.0016));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    document.fonts?.ready.then(redraw); // labels are drawn with the display face once it has arrived
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    // Set up once; everything it touches lives in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── React state → renderer ── */
  useEffect(() => {
    const v = view.current;
    v.focus = sel?.index ?? null;
    v.star = sel?.star ?? null;
    v.hoverStar = hover?.star?.c.id ?? null;
    redraw();
  }, [sel, hover, redraw]);

  useEffect(() => {
    const v = view.current;
    v.stops = path?.stops ?? [];
    v.threadT = 0;
    if (path) {
      // Frame the whole thread.
      const pts = path.stops.map((i) => PLACES[v.arrangement][i]);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const k = Math.min(1.2, (v.w * 0.8) / (Math.max(...xs) - Math.min(...xs) + 600), (v.h * 0.8) / (Math.max(...ys) - Math.min(...ys) + 600));
      flyTo((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, Math.max(fitScale(view.current), k), false);
    }
    redraw();
  }, [path, flyTo, redraw]);

  const arrange = (next: Arrangement) => {
    const v = view.current;
    morph.current = { from: v.places, to: PLACES[next], t: 0 };
    v.arrangement = next;
    setArrangement(next);
    if (sel) flyTo(PLACES[next][sel.index][0], PLACES[next][sel.index][1], v.tk, true);
    else overview();
  };

  /* ── Pointer: drag to pan, pinch to zoom, click to select, hover to identify ── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, pinch: 0 });

  const pick = (px: number, py: number): { index: number; star: Star | null; pair: [Star, Star] | null } | null => {
    const v = view.current;
    let best: { index: number; star: Star; d: number } | null = null;
    let line: { index: number; pair: [Star, Star] } | null = null;
    let body: number | null = null;
    SKY.forEach((con, index) => {
      const [cx, cy] = v.places[index];
      const at = (s: Star) => [(cx + s.dx) * v.k + v.x, (cy + s.dy) * v.k + v.y] as const;
      for (const star of con.stars) {
        const [x, y] = at(star);
        const d = Math.hypot(x - px, y - py);
        if (d < 15 && (!best || d < best.d)) best = { index, star, d };
      }
      for (let n = 1; n < con.figure.length && !line; n++) {
        const a = con.stars[con.figure[n - 1]];
        const b = con.stars[con.figure[n]];
        const [ax, ay] = at(a);
        const [bx, by] = at(b);
        const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
        if (Math.hypot(ax + (bx - ax) * t - px, ay + (by - ay) * t - py) < 6) line = { index, pair: [a, b] };
      }
      if (Math.hypot(cx * v.k + v.x - px, (cy + 205) * v.k + v.y - py) < 70 * Math.max(0.5, v.k)) body = index; // the name label
    });
    const hit = best as { index: number; star: Star } | null;
    const edge = line as { index: number; pair: [Star, Star] } | null;
    if (hit) return { index: hit.index, star: hit.star, pair: null };
    if (edge) return { index: edge.index, star: null, pair: edge.pair };
    return body == null ? null : { index: body, star: null, pair: null };
  };

  const local = (e: ReactPointerEvent) => {
    const box = frame.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("[data-panel]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    gesture.current = { moved: false, pinch: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0 };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = local(e);
    const held = pointers.current.get(e.pointerId);
    const v = view.current;
    if (!held) {
      if (e.pointerType !== "mouse" || (e.target as Element).closest("[data-panel]")) return;
      const hit = pick(p.x, p.y);
      const con = hit ? SKY[hit.index] : null;
      const key = !hit ? "" : hit.star ? `s${hit.star.c.id}` : hit.pair ? `l${hit.pair[0].c.id}-${hit.pair[1].c.id}` : `c${hit.index}`;
      if (key === (hover?.key ?? "")) return;
      if (!hit || !con) return setHover(null);
      const [cx, cy] = v.places[hit.index];
      setHover({
        key,
        star: hit.star,
        x: hit.star ? (cx + hit.star.dx) * v.k + v.x : p.x,
        y: hit.star ? (cy + hit.star.dy) * v.k + v.y : p.y,
        text: hit.star
          ? `${hit.star.c.name} · ${con.a.title.display}`
          : hit.pair
            ? `${hit.pair[0].c.name} and ${hit.pair[1].c.name} both appear in ${con.a.title.display}. The line groups a cast; it is not a story link.`
            : `${con.a.title.display}: ${con.stars.length} stars`,
      });
      return;
    }
    const pts = [...pointers.current.entries()];
    if (pts.length === 2) {
      pointers.current.set(e.pointerId, p);
      const [a, b] = [...pointers.current.values()];
      const span = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinch) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, span / gesture.current.pinch);
      gesture.current = { moved: true, pinch: span };
      [v.x, v.y, v.k] = [v.tx, v.ty, v.tk];
      return;
    }
    if (Math.hypot(p.x - held.x, p.y - held.y) > 4) gesture.current.moved = true;
    if (!gesture.current.moved) return;
    v.x = v.tx = v.tx + p.x - held.x;
    v.y = v.ty = v.ty + p.y - held.y;
    pointers.current.set(e.pointerId, p);
    if (hover) setHover(null);
    redraw();
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const held = pointers.current.delete(e.pointerId);
    if (!held || gesture.current.moved || pointers.current.size) return;
    const p = local(e);
    const hit = pick(p.x, p.y);
    if (hit) select(hit.index, hit.star?.c.id ?? null);
    else if (sel) select(null);
  };

  const step = (by: number) => select(((sel?.index ?? (by > 0 ? -1 : 0)) + by + SKY.length) % SKY.length);
  const centreZoom = (factor: number) => zoomAt(view.current.w / 2, view.current.h / 2, factor);

  const active = sel ? SKY[sel.index] : null;
  const activeStar = active && sel?.star != null ? active.stars.find((s) => s.c.id === sel.star) ?? null : null;

  return (
    <div className="pt-(--nav-h)">
      <div
        ref={frame}
        tabIndex={0}
        role="application"
        aria-label="Star atlas of characters. Drag to pan, scroll or pinch to zoom, arrow keys to move, plus and minus to zoom, Escape to return to the whole sky. Every series and character is also reachable from the controls and the panel."
        className="relative h-[calc(100dvh-var(--nav-h))] min-h-[32rem] touch-none select-none overflow-hidden bg-ink [cursor:grab] active:[cursor:grabbing]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onPointerLeave={() => hover && setHover(null)}
        onKeyDown={(e) => {
          if ((e.target as Element).closest("select, input, button, a")) return;
          const v = view.current;
          if (e.key === "ArrowLeft") v.tx += 90;
          else if (e.key === "ArrowRight") v.tx -= 90;
          else if (e.key === "ArrowUp") v.ty += 90;
          else if (e.key === "ArrowDown") v.ty -= 90;
          else if (e.key === "+" || e.key === "=") centreZoom(1.35);
          else if (e.key === "-") centreZoom(1 / 1.35);
          else if (e.key === "Escape") select(null);
          else if (e.key === "]") step(1);
          else if (e.key === "[") step(-1);
          else return;
          e.preventDefault();
          redraw();
        }}
      >
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" />

        {/* What the pointer is over: a caption, and for a star, its face through the eyepiece. */}
        {hover && (
          <div className="pointer-events-none absolute z-20 -translate-x-1/2" style={{ left: hover.x, top: hover.y }} role="tooltip">
            {hover.star ? (
              <div className="-translate-y-[calc(100%+18px)] bg-paper p-1 shadow-[0_18px_40px_-12px_#000]">
                <span className="relative block h-28 w-[5.25rem] overflow-hidden bg-ink">
                  {hover.star.c.image && <Image src={hover.star.c.image} alt="" fill sizes="96px" className="object-cover object-[50%_12%]" />}
                </span>
                <span className="t-label block max-w-[5.25rem] truncate px-0.5 pt-1 !text-[0.56rem] text-ink">{hover.star.c.name}</span>
              </div>
            ) : (
              <p className="max-w-64 -translate-y-[calc(100%+14px)] bg-bone px-2.5 py-1.5 text-xs font-medium text-ink">{hover.text}</p>
            )}
          </div>
        )}

        {/* ── Controls ── */}
        <div data-panel className="absolute left-3 top-3 z-10 max-h-[calc(100%-1.5rem)] w-[min(22rem,calc(100%-1.5rem))] cursor-auto overflow-y-auto border border-rule bg-ink/92 p-4 sm:left-5 sm:top-5">
          <p lang="ja" aria-hidden="true" className="t-jp text-sm text-red">
            群像
          </p>
          <h1 className="t-display text-[clamp(1.7rem,3.2vw,2.6rem)]">The character universe</h1>
          <p className="mt-1.5 hidden text-sm text-mute sm:block">
            {CAST.length} characters in {ANIME.length} constellations. Brighter stars are characters with more AniList favourites. A line joins a cast to itself only — nothing here says two stories share a world.
          </p>

          <div className="mt-3 flex" role="group" aria-label="Arrange the sky by">
            {(Object.keys(ARRANGEMENT_INFO) as Arrangement[]).map((key) => (
              <button key={key} type="button" className="chip -ml-px flex-1 justify-center first:ml-0" aria-pressed={arrangement === key} onClick={() => arrange(key)}>
                {ARRANGEMENT_INFO[key].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute" aria-live="polite">
            {ARRANGEMENT_INFO[arrangement].hint}
          </p>

          <div className="mt-3 flex gap-1.5">
            <button type="button" onClick={() => step(-1)} aria-label="Previous constellation" className="field grid w-10 shrink-0 place-items-center !px-0">
              <ChevronLeft size={16} />
            </button>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Go to a constellation</span>
              <select className="field w-full" value={sel ? SKY[sel.index].a.slug : ""} onChange={(e) => select(e.target.value ? ANIME.findIndex((a) => a.slug === e.target.value) : null)}>
                <option value="">The whole sky</option>
                {ANIME.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.title.display}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => step(1)} aria-label="Next constellation" className="field grid w-10 shrink-0 place-items-center !px-0">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* The red thread */}
          <details open={roomy} className="group mt-4 border-t border-rule pt-3">
            <summary className="t-label flex cursor-pointer list-none items-center gap-2 text-bone [&::-webkit-details-marker]:hidden">
              <span className="h-px w-5 bg-red" /> The red thread
              <ChevronRight size={13} aria-hidden="true" className="ml-auto transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {(["from", "to"] as const).map((end) => (
                <label key={end}>
                  <span className="sr-only">{end === "from" ? "Thread starts at" : "Thread ends at"}</span>
                  <select className="field w-full" value={ends[end]} onChange={(e) => (setSel(null), setEnds((s) => ({ ...s, [end]: e.target.value })))}>
                    <option value="">{end === "from" ? "From…" : "To…"}</option>
                    {ANIME.map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.title.display}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {path ? (
              <div aria-live="polite">
                <ol className="mt-3 space-y-2">
                  {path.hops.map((hop, n) => (
                    <li key={hop.to.slug} className="grid grid-cols-[1.4rem_1fr] gap-2 text-sm">
                      <span className="t-num grid size-[1.4rem] place-items-center rounded-full bg-red text-xs text-bone">{n + 2}</span>
                      <span>
                        <button type="button" className="link font-semibold" onClick={() => select(ANIME.indexOf(hop.to))}>
                          {hop.to.title.display}
                        </button>
                        <span className="block text-xs text-mute">{hop.shared.length ? `shares ${hop.shared.join(", ")} with ${hop.from.title.display}` : `closest step from ${hop.from.title.display}`}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-mute">Each step is the smallest jump in genre, theme, studio or director — likeness, not shared canon.</p>
                <button type="button" className="t-label link mt-2 inline-flex items-center gap-1 text-mute hover:text-bone" onClick={() => (setEnds({ from: "", to: "" }), overview())}>
                  <X size={12} aria-hidden="true" /> Clear the thread
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-mute">Pick two stories and the atlas finds the gentlest path between them, one like-minded title at a time.</p>
            )}
          </details>
        </div>

        <div data-panel className="absolute bottom-5 left-3 z-10 flex cursor-auto flex-col sm:left-5">
          <button type="button" onClick={() => centreZoom(1.4)} aria-label="Zoom in" className="grid size-11 place-items-center border border-rule bg-ink/90 hover:border-bone">
            <Plus size={18} />
          </button>
          <button type="button" onClick={() => centreZoom(1 / 1.4)} aria-label="Zoom out" className="-mt-px grid size-11 place-items-center border border-rule bg-ink/90 hover:border-bone">
            <Minus size={18} />
          </button>
          <button type="button" onClick={() => select(null)} aria-label="Show the whole sky" className="-mt-px grid size-11 place-items-center border border-rule bg-ink/90 hover:border-bone">
            <Maximize size={16} />
          </button>
        </div>

        <AnimatePresence>
          {active && (
            <AtlasPanel
              key="panel"
              con={active}
              star={activeStar}
              score={bySlug.get(active.a.slug)?.consensus ?? null}
              kin={nearest(sel!.index)}
              onStar={(id) => select(sel!.index, id)}
              onGo={(slug) => select(ANIME.findIndex((a) => a.slug === slug))}
              onThread={(to) => (setSel(null), setEnds({ from: active.a.slug, to }))}
              onClose={() => select(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
