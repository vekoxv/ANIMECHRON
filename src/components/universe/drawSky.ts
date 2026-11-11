import { YEAR_MAX, YEAR_MIN } from "@/lib/catalog";
import { SKY, STUDIO_GROUPS, WORLD } from "./sky";
import type { Arrangement } from "./sky";

/** Everything the renderer needs. Mutated in place by the Atlas; never held in React state. */
export interface View {
  w: number;
  h: number;
  dpr: number;
  /** Camera now, and where it is heading. screen = world × k + (x, y). */
  x: number;
  y: number;
  k: number;
  tx: number;
  ty: number;
  tk: number;
  /** Current centre of each constellation (mid-flight while an arrangement changes). */
  places: [number, number][];
  arrangement: Arrangement;
  focus: number | null;
  star: number | null;
  hoverStar: number | null;
  /** Constellations the red thread passes through, in order, and how much of it is drawn. */
  stops: number[];
  threadT: number;
  font: string;
}

const BONE = "244,239,227";
const RED = "#d91a2f";

/** A still field of faint background stars, painted once per size and reused every frame. */
export function paintBackdrop(w: number, h: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  let seed = 20;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < Math.round((w * h) / 5200); i++) {
    ctx.fillStyle = `rgba(${BONE},${0.06 + rnd() * 0.22})`;
    ctx.fillRect(rnd() * w, rnd() * h, rnd() < 0.85 ? 1 : 1.6, rnd() < 0.85 ? 1 : 1.6);
  }
  return canvas;
}

/** One frame of the atlas. Drawn in screen space so type and hairlines stay crisp at any zoom. */
export function drawSky(ctx: CanvasRenderingContext2D, v: View, backdrop: HTMLCanvasElement | null) {
  const { w, h, dpr, x, y, k } = v;
  const sx = (wx: number) => wx * k + x;
  const sy = (wy: number) => wy * k + y;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (backdrop) ctx.drawImage(backdrop, 0, 0, w, h);

  // Graticule: the rings and meridians of a star chart, centred on the world.
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${BONE},0.07)`;
  for (const r of [420, 840, 1260, 1680]) {
    ctx.beginPath();
    ctx.ellipse(sx(WORLD.w / 2), sy(WORLD.h / 2), r * k, r * k * 0.64, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    ctx.moveTo(sx(WORLD.w / 2 - Math.cos(a) * 1680), sy(WORLD.h / 2 - Math.sin(a) * 1075));
    ctx.lineTo(sx(WORLD.w / 2 + Math.cos(a) * 1680), sy(WORLD.h / 2 + Math.sin(a) * 1075));
  }
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelSize = Math.max(10, Math.min(22, 26 * Math.sqrt(k)));

  if (v.arrangement === "era") {
    ctx.font = `700 ${labelSize}px ${v.font}`;
    for (let year = YEAR_MIN; year <= YEAR_MAX; year++) {
      if (year % 5) continue;
      const px = sx(400 + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (WORLD.w - 800));
      ctx.strokeStyle = `rgba(${BONE},0.12)`;
      ctx.beginPath();
      ctx.moveTo(px, sy(120));
      ctx.lineTo(px, sy(WORLD.h - 120));
      ctx.stroke();
      ctx.fillStyle = `rgba(${BONE},0.45)`;
      ctx.fillText(String(year), px, sy(WORLD.h - 80));
    }
  }
  if (v.arrangement === "studio") {
    ctx.font = `700 ${labelSize * 0.8}px ${v.font}`;
    ctx.fillStyle = `rgba(${BONE},0.4)`;
    for (const g of STUDIO_GROUPS) {
      const cx = g.members.reduce((n, i) => n + v.places[i][0], 0) / g.members.length;
      const cy = g.members.reduce((n, i) => n + v.places[i][1], 0) / g.members.length;
      ctx.fillText(g.name.toUpperCase(), sx(cx), sy(cy));
    }
  }

  const near = k > 0.95;
  SKY.forEach((con, i) => {
    const [cx, cy] = v.places[i];
    if (sx(cx) < -260 * k - 80 || sx(cx) > w + 260 * k + 80 || sy(cy) < -260 * k - 80 || sy(cy) > h + 260 * k + 80) return; // off screen
    const focused = v.focus === i;
    const dim = v.focus != null ? (focused ? 1 : 0.14) : v.stops.length && !v.stops.includes(i) ? 0.28 : 1;
    const tint = con.a.palette.accent;

    // The figure: one unbroken line through the cast.
    ctx.globalAlpha = dim * (focused ? 0.95 : 0.5);
    ctx.strokeStyle = tint;
    ctx.lineWidth = focused ? 1.5 : 1;
    ctx.beginPath();
    con.figure.forEach((s, n) => {
      const st = con.stars[s];
      if (n) ctx.lineTo(sx(cx + st.dx), sy(cy + st.dy));
      else ctx.moveTo(sx(cx + st.dx), sy(cy + st.dy));
    });
    ctx.stroke();

    for (const st of con.stars) {
      const px = sx(cx + st.dx);
      const py = sy(cy + st.dy);
      const r = (1.3 + st.mag * 3.8) * Math.min(1.9, Math.max(0.8, k * 1.3));
      ctx.globalAlpha = dim * 0.17;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(px, py, r * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = dim;
      ctx.fillStyle = `rgb(${BONE})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      const marked = st.c.id === v.star || st.c.id === v.hoverStar;
      if (marked) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      if ((focused || near || marked) && dim > 0.5) {
        ctx.font = `600 ${focused ? 12 : 10.5}px ${v.font}`;
        ctx.fillStyle = marked ? `rgb(${BONE})` : `rgba(${BONE},0.72)`;
        ctx.fillText(st.c.name.toUpperCase(), px, py + r + 11);
      }
    }

    ctx.globalAlpha = dim;
    ctx.font = `800 ${focused ? labelSize * 1.25 : labelSize}px ${v.font}`;
    ctx.fillStyle = `rgb(${BONE})`;
    ctx.fillText(con.a.title.display.toUpperCase(), sx(cx), sy(cy + 205));
    ctx.font = `700 ${labelSize * 0.72}px ${v.font}`;
    ctx.fillStyle = tint;
    ctx.fillText(`${con.a.year} · ${con.a.studio?.name ?? ""}`.toUpperCase(), sx(cx), sy(cy + 205) + labelSize * 1.05);
  });
  ctx.globalAlpha = 1;

  // The red thread, drawn stop to stop.
  if (v.stops.length > 1) {
    const pts = v.stops.map((i) => [sx(v.places[i][0]), sy(v.places[i][1])] as const);
    const drawn = v.threadT * (pts.length - 1);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let s = 1; s < pts.length; s++) {
      const part = Math.min(1, Math.max(0, drawn - (s - 1)));
      if (part <= 0) break;
      ctx.lineTo(pts[s - 1][0] + (pts[s][0] - pts[s - 1][0]) * part, pts[s - 1][1] + (pts[s][1] - pts[s - 1][1]) * part);
    }
    ctx.stroke();
    ctx.font = `800 12px ${v.font}`;
    pts.forEach(([px, py], n) => {
      if (n > drawn + 0.01) return;
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${BONE})`;
      ctx.fillText(String(n + 1), px, py + 1);
    });
  }
}
