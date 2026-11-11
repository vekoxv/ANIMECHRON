"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_WEIGHTS } from "./scoring";
import type { Weights } from "./scoring";
import type { LiveRatings } from "./types";

export interface Store<T> {
  initial: T;
  get(): T;
  set(next: T | ((state: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

/**
 * A few lines of shared state. With a `storageKey` the value lives in localStorage;
 * it is read on first subscribe (after hydration), so server and client markup agree.
 */
export function createStore<T>(initial: T, storageKey?: string): Store<T> {
  let state = initial;
  let loaded = !storageKey;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const saved = localStorage.getItem(storageKey!);
      if (saved) state = { ...initial, ...JSON.parse(saved) };
    } catch {
      // Unreadable or blocked storage: carry on with defaults.
    }
  };

  return {
    initial,
    get: () => state,
    set(next) {
      load();
      state = typeof next === "function" ? (next as (s: T) => T)(state) : next;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
          // Storage full or blocked: the change still applies for this visit.
        }
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      load();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const useStore = <T,>(store: Store<T>): T =>
  useSyncExternalStore(store.subscribe, store.get, () => store.initial);

/* ───────── The app's stores ───────── */

export type WatchStatus = "planned" | "watching" | "completed";
export const WATCH_LABEL: Record<WatchStatus, string> = { planned: "Planned", watching: "Watching", completed: "Completed" };
export const watchlist = createStore<Record<string, WatchStatus>>({}, "animechron:watchlist");

export type ViewMode = "grid" | "manga" | "rank";
export interface Prefs {
  /** How much each platform counts toward your personal score. */
  weights: Weights;
  /** 0–1: how much audience size is blended into your personal score. */
  crowd: number;
  view: ViewMode;
}
export const prefs = createStore<Prefs>({ weights: DEFAULT_WEIGHTS, crowd: 0, view: "grid" }, "animechron:prefs");

/** Dojo results: an Elo rating per title built from head-to-head picks, and how often each has fought. */
export const dojo = createStore<{ elo: Record<string, number>; seen: Record<string, number>; played: number }>({ elo: {}, seen: {}, played: 0 }, "animechron:dojo");

export const live = createStore<{ status: "idle" | "loading" | "ready" | "error"; data: LiveRatings | null }>({
  status: "idle",
  data: null,
});

/**
 * `ready` flips once the opening sequence is over (or was skipped), so the hero can make its entrance.
 * `spotlight` names a character whose profile should open on the next detail page.
 */
export const ui = createStore<{ palette: boolean; ready: boolean; spotlight: number | null }>({ palette: false, ready: false, spotlight: null });

/** Ask the detail page to open a character's profile (used by search and the universe). */
export const spotlightCharacter = (id: number | null) => ui.set((s) => ({ ...s, spotlight: id }));

/** A value that only exists in the browser, read without a hydration mismatch. */
const never = () => () => {};
export const useClientValue = <T,>(read: () => T, onServer: T): T => useSyncExternalStore(never, read, () => onServer);
