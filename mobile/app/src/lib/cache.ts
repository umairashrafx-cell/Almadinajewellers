import { Preferences } from "@capacitor/preferences";
import { useCallback, useEffect, useRef, useState } from "react";

import { shouldRecheck } from "./recheck";

/**
 * What the app keeps on the phone, so its screens open with no connection.
 *
 * Capacitor Preferences rather than localStorage, for one reason that matters:
 * the bundled screens are served from https://localhost and the website from
 * www.almadinajeweller.com, which are different origins with different
 * localStorage. Preferences belongs to the app, so it is the one place both
 * halves can see — it is how a piece saved on either side reaches the other.
 */

export const RATES_KEY = "amj:cache:rates";
export const SAVED_KEY = "amj:cache:saved";
/** The catalogue as the app last saw it, so the grid opens with no connection. */
export const PIECES_KEY = "amj:cache:pieces";
/** The international board, so it opens with something rather than nothing. */
export const MARKETS_KEY = "amj:cache:markets";

/**
 * The saved pieces — and inside the app, the list itself rather than a copy of
 * one. src/lib/wishlist.ts reads and writes it from both halves and explains
 * why it has to be the single source of truth; this file only reads it, to
 * know which pieces to fetch. The name is the same as that store's
 * localStorage key on purpose.
 */
export const WISHLIST_KEY = "amj:wishlist";

export async function remembered<T>(key: string): Promise<T | undefined> {
  try {
    const { value } = await Preferences.get({ key });
    return value ? (JSON.parse(value) as T) : undefined;
  } catch {
    // Unreadable or not valid JSON: treat it as nothing kept.
    return undefined;
  }
}

export async function remember(key: string, value: unknown): Promise<void> {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) });
    await Preferences.set({ key: stampKey(key), value: String(Date.now()) });
  } catch {
    // The screen still has what it just fetched; it simply will not survive
    // being closed. Not worth telling anybody about.
  }
}

/**
 * When an entry was written, kept beside it rather than wrapped around it.
 *
 * A sibling key, not a `{ value, at }` envelope, because an app is upgraded
 * over the cache the old build left: an envelope would make every kept board
 * unreadable on the first launch after an update, which is exactly the launch
 * most likely to happen on a bad connection. A missing stamp simply means the
 * age is unknown, and the screens say the shorter true thing instead.
 */
function stampKey(key: string): string {
  return `${key}:at`;
}

/** When the entry under this key was last written, if that is known. */
export async function rememberedAt(key: string): Promise<number | undefined> {
  try {
    const { value } = await Preferences.get({ key: stampKey(key) });
    const at = value ? Number(value) : Number.NaN;
    return Number.isFinite(at) ? at : undefined;
  } catch {
    return undefined;
  }
}

/** The SKUs saved while browsing the shop. */
export async function savedSkus(): Promise<string[]> {
  const list = await remembered<unknown>(WISHLIST_KEY);
  return Array.isArray(list) ? list.filter((sku): sku is string => typeof sku === "string") : [];
}

export type Cached<T> = {
  data: T | undefined;
  /** Showing what was kept from last time, because this attempt did not land. */
  stale: boolean;
  /** Nothing kept and nothing fetched — the only state with nothing to show. */
  empty: boolean;
  loading: boolean;
  /**
   * When what is on screen was fetched, if the phone knows.
   *
   * Undefined on a cache written by a build older than the stamp. The screens
   * say the shorter true thing then rather than guessing an age — lib/kept.ts.
   */
  savedAt: number | undefined;
  refresh: () => void;
};

/**
 * What was kept, then what is live.
 *
 * Every screen in the app works the same way: it paints immediately from the
 * phone, so opening the app in the shop's basement still shows this morning's
 * board, and quietly replaces it when the network answers. A failed fetch is
 * not an error screen — it is yesterday's figures with a line saying so.
 */
export function useCached<T>(key: string, load: () => Promise<T>, everyMs?: number): Cached<T> {
  const [data, setData] = useState<T>();
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [savedAt, setSavedAt] = useState<number>();

  /** When the last successful fetch landed, so a return to the app can tell. */
  const freshAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);

      const kept = await remembered<T>(key);
      if (cancelled) return;
      if (kept !== undefined) {
        setData(kept);
        setStale(true);
        setSavedAt(await rememberedAt(key));
        if (cancelled) return;
      }

      try {
        const fresh = await load();
        if (cancelled) return;
        setData(fresh);
        setStale(false);
        const landed = Date.now();
        freshAt.current = landed;
        setSavedAt(landed);
        await remember(key, fresh);
      } catch {
        /*
         * Keep whatever was shown, and say that is what it is.
         *
         * Marked stale even when this attempt followed a successful one,
         * which it now can: the screens ask again when the app comes back,
         * and a board fetched this morning that cannot be checked this
         * evening is not a live figure. data stays undefined when nothing
         * was ever kept, and then no screen reaches this line at all.
         */
        if (!cancelled) setStale(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // load is rebuilt on every render by most callers; the key and the attempt
    // counter are what actually decide when to go again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  /*
   * Screens that want to keep moving say how often, in milliseconds. Only the
   * international board asks for this; a rate the shop sets by hand each
   * morning has nothing to gain from being asked for again.
   *
   * Never while the app is out of sight. A phone in a pocket fetching every
   * few seconds is battery and data spent on a figure nobody is reading, so
   * the clock stops when the app is hidden and goes again the moment it is
   * back — which also means the first thing somebody sees on returning is
   * current, not whatever was on screen when they put the phone down.
   */
  useEffect(() => {
    if (!everyMs) return;

    const tick = () => {
      if (document.visibilityState === "visible") setAttempt((n) => n + 1);
    };

    const timer = setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [everyMs]);

  /*
   * Asked again when the app comes back, if what is on screen has had time
   * to go out of date. recheck.ts carries the reasoning and the interval.
   *
   * visibilitychange rather than a native resume event: the WebView raises
   * it when Android pauses and resumes the activity, so it covers both
   * leaving the app and coming back to it, and needs no plugin to do so.
   *
   * Not for the international board, which says how often it wants asking
   * just above and handles coming back itself.
   */
  useEffect(() => {
    if (everyMs) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (shouldRecheck(freshAt.current, Date.now())) setAttempt((n) => n + 1);
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [everyMs]);

  return { data, stale, empty: data === undefined && !loading, loading, savedAt, refresh };
}
