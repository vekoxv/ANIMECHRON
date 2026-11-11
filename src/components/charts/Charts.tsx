"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useInView } from "@/components/ui/Reveal";
import { fixed } from "@/lib/catalog";
import type { Scored } from "@/lib/useCatalog";

/* Charts are drawn by hand in SVG and HTML so they share the site's type, colour and motion. */

export interface RadarSeries {
  name: string;
  color: string;
  /** One value per axis, 0–1. */
  values: number[];
}

/** Radar: one polygon per series over shared spokes. Polygons re-shape when values change. */
export function Radar({ axes, series, size = 340 }: { axes: string[]; series: RadarSeries[]; size?: number }) {
  const [ref, inView] = useInView<SVGSVGElement>();
  const c = size / 2;
  const R = size * 0.33;
  const point = (i: number, v: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    // Rounded: trig can differ in the last digit between server and browser, which would break hydration.
    return [Math.round((c + Math.cos(angle) * R * v) * 10) / 10, Math.round((c + Math.sin(angle) * R * v) * 10) / 10] as const;
  };
  const ring = (v: number) => axes.map((_, i) => point(i, v).join(",")).join(" ");
  const summary = series.map((s) => `${s.name}: ${axes.map((a, i) => `${a} ${Math.round(s.values[i] * 100)}%`).join(", ")}`).join(". ");

  return (
    <svg ref={ref} viewBox={`-44 -6 ${size + 88} ${size + 12}`} className="w-full max-w-lg" role="img" aria-label={`Radar chart. ${summary}`}>
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="currentColor" strokeOpacity={v === 1 ? 0.35 : 0.12} />
      ))}
      {axes.map((axis, i) => {
        const [x, y] = point(i, 1);
        const [lx, ly] = point(i, 1.2);
        return (
          <g key={axis}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.12" />
            <text x={lx} y={ly} textAnchor={Math.abs(lx - c) < 8 ? "middle" : lx > c ? "start" : "end"} dominantBaseline="middle" className="t-label fill-current opacity-70" style={{ fontSize: 11 }}>
              {axis}
            </text>
          </g>
        );
      })}
      {series.map((s, n) => {
        const points = s.values.map((v, i) => point(i, Math.max(0.04, v)).join(",")).join(" ");
        return (
          <motion.polygon
            key={s.name}
            fill={s.color}
            fillOpacity={n === 0 ? 0.22 : 0.06}
            stroke={s.color}
            strokeWidth={n === 0 ? 2 : 1.25}
            strokeDasharray={n === 0 ? undefined : "4 4"}
            initial={{ points: ring(0.04), opacity: 0 }}
            animate={inView ? { points, opacity: 1 } : undefined}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: n * 0.12 }}
          />
        );
      })}
    </svg>
  );
}

/** Where every title sits on the overall-score axis; one of them can be called out. */
export function FieldStrip({ list, highlight, value = (a) => a.consensus, label = "Overall" }: { list: Scored[]; highlight?: string; value?: (a: Scored) => number | null; label?: string }) {
  const scored = list.flatMap((a) => {
    const v = value(a);
    return v == null ? [] : [{ a, v }];
  });
  if (!scored.length) return null;
  const lo = Math.floor(Math.min(...scored.map((s) => s.v)) * 5) / 5 - 0.1;
  const hi = Math.ceil(Math.max(...scored.map((s) => s.v)) * 5) / 5 + 0.1;
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="relative h-24 select-none" role="group" aria-label={`${label} scores of all ${scored.length} titles, from ${fixed(lo, 1)} to ${fixed(hi, 1)}`}>
      <div className="absolute inset-x-0 bottom-6 h-px bg-current opacity-25" />
      {scored.map(({ a, v }) => {
        const on = a.slug === highlight;
        return (
          <Link
            key={a.slug}
            href={`/anime/${a.slug}`}
            aria-label={`${a.title.display}: ${fixed(v, 2)}`}
            data-tip={`${a.title.display} · ${fixed(v, 2)}`}
            className={`absolute bottom-6 w-3 -translate-x-1/2 transition-[left] duration-700 ease-ink ${on ? "z-10 h-14" : "h-6 opacity-60 hover:h-9 hover:opacity-100 focus-visible:opacity-100"}`}
            style={{ left: at(v) } as CSSProperties}
          >
            <span className="mx-auto block h-full transition-[height]" style={{ width: on ? 3 : 2, background: on ? "var(--a, var(--color-red))" : a.palette.accent }} />
            {on && <span className="t-num absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-lg text-accent">{fixed(v, 2)}</span>}
          </Link>
        );
      })}
      <span className="t-num absolute bottom-0 left-0 text-sm opacity-60">{fixed(lo, 1)}</span>
      <span className="t-num absolute bottom-0 right-0 text-sm opacity-60">{fixed(hi, 1)}</span>
    </div>
  );
}

/** One horizontal bar on a shared scale, drawn when it scrolls into view. */
export function Bar({ fraction, color, delay = 0 }: { fraction: number; color: string; delay?: number }) {
  return (
    <span className="block h-1.5 bg-current/10">
      <motion.span
        className="block h-full origin-left"
        style={{ background: color, width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay }}
      />
    </span>
  );
}
