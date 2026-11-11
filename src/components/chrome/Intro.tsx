"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ui, useClientValue } from "@/lib/store";

const CUT = [0.76, 0, 0.24, 1] as const;
const INK = [0.16, 1, 0.3, 1] as const;
const LETTERS = "ANIMECHRON".split("");
const HOLD_MS = 3300;

/** The <head> script in layout.tsx sets this before paint for return visits and reduced motion. */
const shouldSkip = () => document.documentElement.dataset.intro === "skip";

/**
 * First-visit opening: a red line is drawn in the dark, ink gathers on it, the
 * wordmark rises from it, and the screen splits along that same line onto the page.
 * Plays once per session, can be skipped at any moment, and never runs under reduced motion.
 */
export function Intro() {
  const skipped = useClientValue(shouldSkip, false);
  const [phase, setPhase] = useState<"play" | "exit" | "done">("play");

  const leave = useCallback(() => {
    try {
      sessionStorage.setItem("animechron:intro", "1");
    } catch {
      // Private mode: the intro will simply play again next visit.
    }
    ui.set((s) => ({ ...s, ready: true }));
    setPhase((p) => (p === "play" ? "exit" : p));
  }, []);

  useEffect(() => {
    if (skipped) {
      ui.set((s) => ({ ...s, ready: true }));
      return;
    }
    document.documentElement.style.overflow = "hidden";
    const timer = window.setTimeout(leave, HOLD_MS);
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && leave();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [skipped, leave]);

  if (skipped || phase === "done") return null;
  const exiting = phase === "exit";

  return (
    <div id="intro" className="fixed inset-0 z-[90] overflow-hidden" role="dialog" aria-modal="true" aria-label="Opening sequence">
      {/* Everything sits in one slanted plane, so the line, the type and the split share an angle. */}
      <div className="absolute inset-x-0 -inset-y-[30%] -skew-y-[5deg]">
        <motion.div className="absolute inset-x-0 top-0 h-[calc(50%+1px)] bg-ink" animate={{ y: exiting ? "-101%" : 0 }} transition={{ duration: 0.95, ease: CUT }} />
        <motion.div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-ink"
          animate={{ y: exiting ? "101%" : 0 }}
          transition={{ duration: 0.95, ease: CUT }}
          onAnimationComplete={() => {
            if (!exiting) return;
            document.documentElement.dataset.intro = "skip";
            document.documentElement.style.overflow = "";
            setPhase("done");
          }}
        />

        {!exiting && <InkField />}

        <motion.div className="absolute inset-x-0 top-1/2" animate={{ opacity: exiting ? 0 : 1 }} transition={{ duration: 0.3 }}>
          <div className="absolute inset-x-0 bottom-0 flex justify-center overflow-hidden pb-[0.5vw]">
            <p className="t-display flex text-[clamp(3.2rem,15.5vw,15rem)] leading-[0.8] text-bone">
              <span className="sr-only">Animéchron</span>
              {LETTERS.map((ch, i) => (
                <motion.span key={i} aria-hidden="true" className="relative inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.95 + i * 0.055, duration: 0.9, ease: INK }}>
                  {ch}
                  {i === 4 && (
                    <motion.span
                      className="absolute left-[30%] top-[-0.17em] block h-[0.085em] w-[0.5em] origin-left -rotate-[28deg] bg-red"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 1.75, duration: 0.45, ease: CUT }}
                    />
                  )}
                </motion.span>
              ))}
            </p>
          </div>
          <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 pt-5 text-center">
            <motion.p lang="ja" className="t-jp text-[clamp(1rem,2.4vw,1.75rem)] text-bone" initial={{ opacity: 0, letterSpacing: "1.4em" }} animate={{ opacity: 1, letterSpacing: "0.55em" }} transition={{ delay: 1.75, duration: 1.1, ease: INK }}>
              アニメクロン
            </motion.p>
            <motion.p className="t-label text-mute" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 0.8 }}>
              An archive of twenty legendary anime
            </motion.p>
          </div>
        </motion.div>

        {/* The red line: drawn first, and the seam the screen opens along. */}
        <motion.div className="absolute inset-x-0 top-1/2 h-px origin-center bg-red" initial={{ scaleX: 0 }} animate={{ scaleX: 1, opacity: exiting ? 0 : 1 }} transition={{ scaleX: { delay: 0.2, duration: 1.1, ease: CUT }, opacity: { duration: 0.5 } }} />
      </div>

      {!exiting && (
        <motion.button type="button" onClick={leave} className="t-label absolute bottom-6 right-6 border border-bone/30 px-4 py-3 text-bone/80 transition-colors hover:border-bone hover:text-bone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} autoFocus>
          Skip intro
        </motion.button>
      )}
    </div>
  );
}

/** Ink motes that drift in from the dark and settle along the line. Canvas, ~3 seconds, then gone. */
function InkField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = (canvas.width = canvas.offsetWidth * dpr);
    const h = (canvas.height = canvas.offsetHeight * dpr);
    const count = w / dpr < 700 ? 70 : 150;
    const motes = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      tx: Math.random() * w,
      ty: h / 2 + (Math.random() - 0.5) * h * 0.035 * (i % 5 ? 1 : 6),
      r: (0.6 + Math.random() * 1.8) * dpr,
      pull: 0.012 + Math.random() * 0.03,
      red: i % 9 === 0,
    }));
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += (m.tx - m.x) * m.pull;
        m.y += (m.ty - m.y) * m.pull + Math.sin(t * 2 + m.tx) * 0.25 * dpr;
        ctx.globalAlpha = Math.min(1, t / 0.9) * (m.red ? 0.9 : 0.5);
        ctx.fillStyle = m.red ? "#d91a2f" : "#f4efe3";
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 size-full" />;
}
