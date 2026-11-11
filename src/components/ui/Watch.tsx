"use client";

import { Bookmark, BookmarkCheck, X } from "lucide-react";
import { useStore, WATCH_LABEL, watchlist } from "@/lib/store";
import type { WatchStatus } from "@/lib/store";

export function setWatch(slug: string, status: WatchStatus | null) {
  watchlist.set((list) => {
    const next = { ...list };
    if (status) next[slug] = status;
    else delete next[slug];
    return next;
  });
}

/** One-tap save for cards: adds as "Planned", or removes. */
export function WatchToggle({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  const status = useStore(watchlist)[slug];
  return (
    <button
      type="button"
      aria-pressed={!!status}
      aria-label={status ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
      data-tip={status ? `${WATCH_LABEL[status]} — tap to remove` : "Add to watchlist"}
      data-tip-side="right"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setWatch(slug, status ? null : "planned");
      }}
      className={`grid size-10 place-items-center border transition-colors ${status ? "border-violet bg-violet text-ink" : "border-bone/30 bg-ink/70 text-bone hover:border-bone"} ${className}`}
    >
      {status ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
    </button>
  );
}

/** Full control for detail pages and the watchlist: pick a status, or remove. */
export function WatchControl({ slug, title }: { slug: string; title: string }) {
  const status = useStore(watchlist)[slug];
  return (
    <div role="group" aria-label={`Watchlist status for ${title}`} className="inline-flex flex-wrap items-stretch">
      {(Object.keys(WATCH_LABEL) as WatchStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={status === s}
          onClick={() => setWatch(slug, s)}
          className={`t-label -ml-px min-h-10 border px-3 transition-colors first:ml-0 ${status === s ? "z-10 border-violet bg-violet text-ink" : "border-current/30 hover:border-current"}`}
        >
          {WATCH_LABEL[s]}
        </button>
      ))}
      {status && (
        <button type="button" onClick={() => setWatch(slug, null)} aria-label={`Remove ${title} from watchlist`} className="-ml-px grid min-h-10 w-10 place-items-center border border-current/30 hover:border-red hover:text-red">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
