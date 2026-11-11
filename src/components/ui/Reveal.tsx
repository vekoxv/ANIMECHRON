"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

/** True once the element has scrolled into view. Fires once, then stops observing. */
export function useInView<T extends Element>(margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { rootMargin: margin, threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Opens the element like a manga panel from this side. Omit to only trigger child animations. */
  from?: "left" | "right" | "up";
  delay?: number;
}

/**
 * Marks its subtree `data-in` when scrolled into view. CSS does the animating
 * (`.reveal`, `.split`, `.rise`, `.draw` in globals.css), so nothing runs per frame in JS.
 */
export function Reveal({ from, delay = 0, className = "", style, children, ...rest }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-in={inView} className={className} style={{ "--d": `${delay}ms`, ...style } as CSSProperties} {...rest}>
      {/* The clip lives on an inner box: an element clipped to nothing never reports as intersecting. */}
      {from ? (
        <div className="reveal size-full" data-from={from} data-in={inView}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** Splits a line into words that rise one after another when an ancestor is `data-in`. */
export function Split({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`split ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      <span className="sr-only">{text}</span>
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden="true">
          <span style={{ "--i": i } as CSSProperties}>{word}</span>
          {" "}
        </span>
      ))}
    </span>
  );
}
