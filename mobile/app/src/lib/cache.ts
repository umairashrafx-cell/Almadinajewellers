import { Preferences } from "@capacitor/preferences";
import { useCallback, useEffect, useState } from "react";

/**
 * What the app keeps on the phone, so its screens open with no connection.
 *
 * Capacitor Preferences rather than localStorage, for one reason that matters:
 * the bundled screens are served from https://localhost and the website from
 * www.almadinajeweller.com, which are different origins with different
 * localStorage. Preferences belongs to the app, so it is the one place both
 * halves can see — it is how the wishlist saved while browsing the shop
 * reaches the Saved screen.
 */

export const RATES_KEY = "amj:cache:rates";
export const SAVED_KEY = "amj:cache:saved";
/** The catalogue as the app last saw it, so the grid opens with no connection. */
export const PIECES_KEY = "amj:cache:pieces";
/** The international board, so it opens with something rather than nothing. */
export const MARKETS_KEY = "amj:cache:markets";

/**
 * The wishlist, mirrored by the website. Written by src/hooks/use-wishlist.ts
 * whenever a piece is saved or removed inside the app; this is the only reader.
 * The name is the same as that hook's localStorage key on purpose.
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
  } catch {
    // The screen still has what it just fetched; it simply will not survive
    // being closed. Not worth telling anybody about.
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
export function useCached<T>(key: string, load: () => Promise<T>): Cached<T> {
  const [data, setData] = useState<T>();
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);

      const kept = await remembered<T>(key);
      if (cancelled) return;
      if (kept !== undefined) {
        setData(kept);
        setStale(true);
      }

      try {
        const fresh = await load();
        if (cancelled) return;
        setData(fresh);
        setStale(false);
        await remember(key, fresh);
      } catch {
        // Keep whatever was shown. stale stays true when there was something,
        // and data stays undefined when there was not.
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

  return { data, stale, empty: data === undefined && !loading, loading, refresh };
}
