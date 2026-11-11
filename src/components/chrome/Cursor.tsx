"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * An ink ring that trails the pointer and reacts to what it is over.
 * It is purely additive: the native cursor stays, nothing is hidden, and
 * touch devices never see it. `data-cursor="Label"` gives an element a caption.
 */
export function Cursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 380, damping: 30, mass: 0.45 });
  const sy = useSpring(y, { stiffness: 380, damping: 30, mass: 0.45 });
  const [state, setState] = useState("idle"); // "idle" | "hover" | "hidden" | "label:<text>"

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.("[data-cursor], a, button, select, summary, [role='option'], [role='button'], input[type='range']");
      const label = target?.getAttribute("data-cursor");
      const typing = (e.target as Element | null)?.closest?.("input:not([type='range']), textarea");
      setState(typing ? "hidden" : label ? `label:${label}` : target ? "hover" : "idle");
    };
    const leave = () => setState("hidden");
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [x, y]);

  const label = state.startsWith("label:") ? state.slice(6) : null;

  return (
    <motion.div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[80] hidden [@media(pointer:fine)]:block" style={{ x: sx, y: sy }}>
      <div
        className={`grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border transition-[width,height,background-color,border-color,opacity] duration-300 ease-ink ${
          state === "hidden" ? "size-0 opacity-0" : label ? "h-16 w-16 border-red bg-red" : state === "hover" ? "size-12 border-red" : "size-7 border-bone/45"
        }`}
      >
        {label && <span className="t-label !text-[0.6rem] text-bone">{label}</span>}
      </div>
    </motion.div>
  );
}
