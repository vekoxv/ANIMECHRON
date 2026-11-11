"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { live } from "@/lib/store";
import type { LiveRatings } from "@/lib/types";

/** App-wide client setup: honours reduced motion, and asks the server once for fresh ratings. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (live.get().status !== "idle") return;
    live.set({ status: "loading", data: null });
    fetch("/api/ratings")
      .then((res) => (res.ok ? (res.json() as Promise<LiveRatings>) : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(
        (data) => live.set({ status: "ready", data }),
        () => live.set({ status: "error", data: null }), // the stored snapshot keeps the site complete
      );
  }, []);

  // Artwork morph: when a link to a title is activated, the cover inside that link takes the
  // transition name its detail page uses, so the browser carries one into the other. Only the
  // activated cover is ever named, which keeps every name unique on screen.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-art-live]")) {
        el.style.viewTransitionName = "";
        el.removeAttribute("data-art-live");
      }
      const link = (e.target as Element | null)?.closest?.('a[href^="/anime/"]');
      const art = link?.querySelector<HTMLElement>("[data-art]");
      if (!art) return;
      art.style.viewTransitionName = `art-${art.dataset.art}`;
      art.setAttribute("data-art-live", "");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
