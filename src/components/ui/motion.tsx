"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

/**
 * 3D tilt for cards. Writes CSS variables straight onto the element — no React
 * re-render per pointer move; `.tilt` in globals.css turns them into transforms.
 */
export function useTilt(max = 8) {
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (e.pointerType !== "mouse") return;
      const el = e.currentTarget;
      const box = el.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width;
      const y = (e.clientY - box.top) / box.height;
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--px", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--py", `${(y * 100).toFixed(1)}%`);
      el.dataset.active = "true";
    },
    onPointerLeave(e: PointerEvent<HTMLElement>) {
      const el = e.currentTarget;
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
      el.dataset.active = "false";
    },
  };
}

/** Pulls its child a little toward the pointer, and lets go with a spring. */
export function Magnetic({ children, strength = 0.28, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 240, damping: 16, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 240, damping: 16, mass: 0.5 });
  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const box = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (box.left + box.width / 2)) * strength);
        y.set((e.clientY - (box.top + box.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Odometer numerals: each digit rolls to its new value when the number changes. */
export function Rolling({ value, className = "" }: { value: string; className?: string }) {
  const chars = value.split("");
  return (
    <span className={`inline-flex h-[1em] overflow-hidden leading-none ${className}`}>
      <span className="sr-only">{value}</span>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <span
            key={chars.length - i}
            aria-hidden="true"
            className="inline-flex flex-col transition-transform duration-[900ms] ease-ink"
            style={{ transform: `translateY(-${Number(ch)}em)`, transitionDelay: `${(chars.length - 1 - i) * 70}ms` } as CSSProperties}
          >
            {DIGITS.map((d) => (
              <span key={d} className="block h-[1em]">
                {d}
              </span>
            ))}
          </span>
        ) : (
          <span key={chars.length - i} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
