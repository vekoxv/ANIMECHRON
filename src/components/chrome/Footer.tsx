"use client";

import Link from "next/link";
import { Mark, Wordmark } from "@/components/ui/Bits";
import { formatStamp, SNAPSHOT, SOURCES } from "@/lib/catalog";
import { live, useStore } from "@/lib/store";
import { SOURCE_IDS } from "@/lib/types";
import { NAV_LINKS } from "./Nav";

/** Plain-language account of where each platform's numbers are coming from right now. */
export function DataStatus() {
  const { status, data } = useStore(live);
  return (
    <div aria-live="polite">
      <p className="t-label flex items-center gap-2 text-bone">
        <span className={`size-2 rounded-full ${status === "ready" ? "bg-cyan" : status === "error" ? "bg-red" : "bg-mute"}`} style={status === "loading" ? { animation: "pulse-dot 1s infinite" } : undefined} />
        {status === "ready" ? `Live check ${formatStamp(data!.generatedAt)}` : status === "error" ? "Live check failed — showing the stored snapshot" : "Checking live sources…"}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {SOURCE_IDS.map((id) => {
          const health = data?.sources[id];
          return (
            <li key={id} className="grid grid-cols-[5.5rem_1fr] gap-3">
              <span className="t-label pt-0.5" style={{ color: SOURCES[id].color }}>
                {SOURCES[id].name}
              </span>
              <span className="text-mute">
                {health ? (health.ok ? health.message : `Not live: ${health.message}`) : status === "loading" || status === "idle" ? "Waiting…" : "Stored snapshot in use."}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-rule bg-ink-2">
      <div className="thread" />
      <div className="shell grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr_1.4fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Animéchron — home">
            <Mark size={30} />
            <Wordmark className="text-5xl" />
          </Link>
          <p lang="ja" className="t-jp mt-3 tracking-[0.5em] text-mute">
            アニメクロン
          </p>
          <p className="t-serif mt-6 max-w-sm text-sm text-mute">
            Twenty titles, chosen and ordered by hand. The order is an editorial opinion, not a claim that any story objectively outranks another.
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="t-label text-mute">Sections</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="t-display inline-block py-1 text-2xl transition-colors hover:text-red">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/intel#method" className="t-display inline-block py-1 text-2xl transition-colors hover:text-red">
                Method
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="t-label text-mute">Where the numbers come from</p>
          <div className="mt-4">
            <DataStatus />
          </div>
          <p className="mt-5 text-xs leading-relaxed text-mute">
            Stored snapshot taken {formatStamp(SNAPSHOT.meta.generatedAt)}.{" "}
            {Object.values(SNAPSHOT.meta.sources).map((s) => (
              <span key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer" className="link text-bone/80">
                  {s.name}
                </a>
                : {s.note}{" "}
              </span>
            ))}
            Artwork and character images belong to their rights holders and are shown from AniList’s image host at the addresses its API returns.
          </p>
        </div>
      </div>
    </footer>
  );
}
