import type { CSSProperties, ReactNode } from "react";
import { SOURCES } from "@/lib/catalog";
import type { PlatformRating } from "@/lib/types";
import { Reveal, Split } from "./Reveal";

/** ANIMÉCHRON, with the acute accent drawn as the red thread. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`t-display inline-flex items-baseline whitespace-nowrap ${className}`}>
      <span className="sr-only">Animéchron</span>
      <span aria-hidden="true">ANIM</span>
      <span aria-hidden="true" className="relative">
        E
        <span className="absolute left-[30%] top-[-0.17em] block h-[0.085em] w-[0.5em] origin-left -rotate-[28deg] bg-red" />
      </span>
      <span aria-hidden="true">CHRON</span>
    </span>
  );
}

/** The mark: a dial with one red hand. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 1.75v3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12 17.6 5.2" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="square" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

/**
 * Section opener: the Japanese word for the section runs down the margin like a
 * chapter mark, the title rises word by word, and the thread is drawn under it.
 */
export function SectionHeading({ jp, title, children, className = "", as: Heading = "h2" }: { jp: string; title: string; children?: ReactNode; className?: string; as?: "h1" | "h2" }) {
  return (
    <Reveal className={`relative isolate grid gap-x-5 gap-y-4 sm:grid-cols-[auto_1fr] ${className}`}>
      {/* Depth: the same word again, enormous and outlined, drifting behind the heading as the page scrolls. */}
      <span aria-hidden="true" lang="ja" className="t-jp t-outline drift pointer-events-none absolute -top-[0.28em] right-0 -z-10 select-none whitespace-nowrap text-[clamp(6rem,19vw,17rem)] leading-none text-current opacity-[0.09]" style={{ "--drift": "70px" } as CSSProperties}>
        {jp}
      </span>
      <span aria-hidden="true" lang="ja" className="t-jp t-vertical hidden text-xl text-red sm:block">
        {jp}
      </span>
      <div className="min-w-0">
        <Heading className="t-display text-[clamp(2.6rem,7vw,6.2rem)]">
          <Split text={title} />
        </Heading>
        <div className="thread draw mt-4 max-w-40" />
        {children && <p className="rise t-serif mt-5 max-w-[58ch] text-[1.02rem] opacity-80">{children}</p>}
      </div>
    </Reveal>
  );
}

/** Small circular gauge for a 0–10 score. */
export function Dial({ value, size = 96, color = "var(--color-red)", label, digits = 2 }: { value: number | null; size?: number; color?: string; label?: string; digits?: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Score"}: ${value == null ? "unavailable" : `${value.toFixed(digits)} out of 10`}`}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="3" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (value ?? 0) / 10)}
          style={{ transition: "stroke-dashoffset 1.1s var(--ease-ink), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="t-num" style={{ fontSize: size * 0.34 }}>
          {value == null ? "—" : value.toFixed(digits)}
        </span>
        {label && <span className="t-label mt-0.5 !text-[0.56rem] opacity-60">{label}</span>}
      </div>
    </div>
  );
}

/** Says, in a word, where a rating came from. Colour: cyan = live, bone = stored, grey = none. */
export function Origin({ rating }: { rating: PlatformRating }) {
  const style = {
    live: { text: "Live", cls: "text-cyan border-cyan/50" },
    snapshot: { text: "Snapshot", cls: "text-bone/70 border-bone/25" },
    unavailable: { text: "Unavailable", cls: "text-mute border-rule" },
  }[rating.origin];
  return (
    <span className={`t-label inline-flex items-center gap-1.5 border px-1.5 py-1 !text-[0.6rem] ${style.cls}`}>
      {rating.origin === "live" && <span className="size-1.5 rounded-full bg-cyan" style={{ animation: "pulse-dot 2s infinite" }} />}
      {style.text}
    </span>
  );
}

/** A platform's colour chip and name. */
export function SourceTag({ source, short = false }: { source: PlatformRating["source"]; short?: boolean }) {
  const meta = SOURCES[source];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-2" style={{ background: meta.color } as CSSProperties} />
      <span className="t-label">{short ? meta.short : meta.name}</span>
    </span>
  );
}

/** A quiet, useful blank state: says what is missing and offers the way forward. */
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative grid place-items-center overflow-hidden border border-dashed border-rule px-6 py-20 text-center">
      <div aria-hidden="true" className="speedlines absolute inset-0 text-bone/[0.05]" />
      <div className="relative max-w-md">
        <p className="t-display text-4xl">{title}</p>
        <p className="t-serif mt-3 text-sm text-mute">{children}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
