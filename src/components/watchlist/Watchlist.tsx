"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Art } from "@/components/ui/Art";
import { Empty, SectionHeading } from "@/components/ui/Bits";
import { WatchControl } from "@/components/ui/Watch";
import { fixed, lengthOf, minutesOf, pad2, theme } from "@/lib/catalog";
import { useClientValue, useStore, WATCH_LABEL, watchlist } from "@/lib/store";
import type { WatchStatus } from "@/lib/store";
import { useCatalog } from "@/lib/useCatalog";
import { decodeList, Seal } from "./Seal";

type Tab = "all" | WatchStatus;
const TABS: Tab[] = ["all", "planned", "watching", "completed"];
const readSharedCode = () => new URLSearchParams(window.location.hash.slice(1)).get("s") ?? "";

export function Watchlist() {
  const { list } = useCatalog();
  const mine = useStore(watchlist);
  const [tab, setTab] = useState<Tab>("all");
  const [dismissed, setDismissed] = useState(false);

  // A link like /watchlist#s=p-w-c… carries someone else's list. It is shown, never applied without consent.
  const sharedCode = useClientValue(readSharedCode, "");
  const shared = dismissed ? null : decodeList(sharedCode);
  const leaveShared = () => {
    setDismissed(true);
    window.history.replaceState(null, "", window.location.pathname);
  };

  const entries = shared ?? mine;
  const saved = list.filter((a) => entries[a.slug]);
  const shown = saved.filter((a) => tab === "all" || entries[a.slug] === tab);
  const count = (t: Tab) => (t === "all" ? saved.length : saved.filter((a) => entries[a.slug] === t).length);
  const hoursOf = (statuses: WatchStatus[]) => saved.filter((a) => statuses.includes(entries[a.slug])).reduce((n, a) => n + (minutesOf(a) ?? 0), 0) / 60;
  const openEnded = saved.some((a) => entries[a.slug] !== "completed" && minutesOf(a) == null);

  return (
    <div className="pt-[calc(var(--nav-h)+3rem)]">
      <div className="shell pb-16">
        <SectionHeading as="h1" jp="鑑賞録" title={shared ? "A shared watchlist" : "Your watchlist"}>
          {shared ? "Someone sent you their list. Look it over, and save it as your own if you like — nothing changes until you do." : "Everything you have saved, what you are in the middle of, and what you have finished. It lives in this browser only."}
        </SectionHeading>

        {shared && (
          <div className="mt-8 flex flex-wrap items-center gap-3 border border-violet bg-violet/10 p-4" role="status">
            <p className="mr-auto text-sm">
              Viewing a shared list of <strong>{saved.length}</strong> titles. Your own list has {Object.keys(mine).length} and is untouched.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-solid"
              onClick={() => {
                watchlist.set(shared);
                leaveShared();
              }}
            >
              Replace my list with this one
            </button>
            <button type="button" className="btn btn-sm" onClick={leaveShared}>
              Back to my list
            </button>
          </div>
        )}

        {saved.length === 0 ? (
          <div className="mt-12">
            <Empty
              title="Nothing saved yet"
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/archive" className="btn btn-solid">
                    Browse the archive
                  </Link>
                  <Link href="/#discover" className="btn">
                    Draw a title at random
                  </Link>
                </div>
              }
            >
              Use the bookmark on any cover to save it here. You can then mark it as planned, watching or completed, and the list will cut you a seal.
            </Empty>
          </div>
        ) : (
          <>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule py-6 md:grid-cols-4">
              <div>
                <dt className="t-label text-mute">Saved</dt>
                <dd className="t-num text-5xl">{pad2(saved.length)}</dd>
              </div>
              <div>
                <dt className="t-label text-mute">Completed</dt>
                <dd className="t-num text-5xl text-violet">{pad2(count("completed"))}</dd>
              </div>
              <div>
                <dt className="t-label text-mute">Hours watched</dt>
                <dd className="t-num text-5xl">{fixed(hoursOf(["completed"]), 0)}</dd>
              </div>
              <div>
                <dt className="t-label text-mute">Hours still ahead</dt>
                <dd className="t-num text-5xl">
                  {fixed(hoursOf(["planned", "watching"]), 0)}
                  {openEnded && <span className="text-2xl text-mute">+</span>}
                </dd>
                {openEnded && <dd className="t-label mt-1 !text-[0.62rem] text-mute">Plus a series that is still airing</dd>}
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter the watchlist">
              {TABS.map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className="chip min-h-10" onClick={() => setTab(t)}>
                  {t === "all" ? "All" : WATCH_LABEL[t]} <span className="t-num text-base">{count(t)}</span>
                </button>
              ))}
            </div>

            <ul className="mt-6 grid gap-3 lg:grid-cols-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {shown.map((a) => (
                  <motion.li key={a.slug} layout style={theme(a)} className="grid grid-cols-[5rem_1fr] gap-4 border border-rule bg-ink-2 p-3 sm:grid-cols-[6rem_1fr]" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.35, layout: { type: "spring", stiffness: 260, damping: 30 } }}>
                    <Link href={`/anime/${a.slug}`} aria-label={`Open ${a.title.display}`}>
                      <Art src={a.cover} alt="" sizes="96px" className="aspect-[2/3] w-full" />
                    </Link>
                    <div className="min-w-0 py-1">
                      <p className="t-num text-accent">
                        № {pad2(a.rank)} · {a.year} · {fixed(a.consensus, 2)}
                      </p>
                      <h2 className="t-display mt-0.5 truncate text-2xl">
                        <Link href={`/anime/${a.slug}`} className="hover:text-accent">
                          {a.title.display}
                        </Link>
                      </h2>
                      <p className="t-label mt-1 text-mute">
                        {lengthOf(a)} · {minutesOf(a) == null ? "open-ended" : `${fixed(minutesOf(a)! / 60, 1)} h`} · {a.studio?.name}
                      </p>
                      <div className="mt-3">{shared ? <span className="chip" data-on="true">{WATCH_LABEL[entries[a.slug]]}</span> : <WatchControl slug={a.slug} title={a.title.display} />}</div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {shown.length === 0 && <p className="t-serif mt-8 text-mute">Nothing marked “{WATCH_LABEL[tab as WatchStatus]}” yet. Change a title’s status with the buttons on its row.</p>}
          </>
        )}
      </div>

      <section aria-label="Your seal" className="paper py-16">
        <div className="shell">
          <p lang="ja" aria-hidden="true" className="t-jp mb-6 text-red">
            判子
          </p>
          <Seal list={entries} readOnly={!!shared} />
        </div>
      </section>
    </div>
  );
}
