"use client";

import { useEffect, useRef } from "react";

/**
 * Slow motes rising through the hero, in the featured title's colour.
 * Fewer on small screens, none under reduced motion, and the loop sleeps
 * whenever the hero is off screen or the tab is hidden.
 */
export function Embers({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tint = useRef(color);
  useEffect(() => {
    tint.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio, 1.5);
    let w = 0;
    let h = 0;
    const size = () => {
      w = canvas.width = canvas.offsetWidth * dpr;
      h = canvas.height = canvas.offsetHeight * dpr;
    };
    size();
    const count = canvas.offsetWidth < 768 ? 16 : 44;
    const motes = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      speed: 0.00035 + Math.random() * 0.0011,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.15 + Math.random() * 0.55,
    }));

    let frame = 0;
    let visible = true;
    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = tint.current;
      for (const m of motes) {
        m.y -= m.speed;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        ctx.globalAlpha = m.alpha * (0.6 + 0.4 * Math.sin(t / 900 + m.sway));
        ctx.beginPath();
        ctx.arc((m.x + Math.sin(t / 2600 + m.sway) * 0.012) * w, m.y * h, m.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}
