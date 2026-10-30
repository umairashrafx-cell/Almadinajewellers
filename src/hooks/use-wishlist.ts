import { useCallback, useSyncExternalStore } from "react";

/**
 * Wishlist of product SKUs, persisted in localStorage.
 * A module-level store keeps every card and the detail page in sync without a
 * provider, and useSyncExternalStore gives an empty server snapshot so SSR and
 * the first client render agree.
 */
const KEY = "amj:wishlist";

let skus: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const EMPTY: string[] = [];

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    // Private-mode localStorage or corrupt JSON — an empty wishlist is fine.
    return [];
  }
}

/**
 * A copy for the Android app's own screens.
 *
 * Those screens are bundled in the app and served from https://localhost,
 * while this page is served from the website — different origins, so they
 * cannot read each other's localStorage however the app got there. Capacitor's
 * Preferences belongs to the app rather than to an origin, which makes it the
 * one place both halves can see.
 *
 * Fire and forget, and loaded only inside the app: in a browser the import
 * never happens and nothing here costs anything. The list above stays the
 * original; this is the copy the Saved screen reads.
 */
function mirror(next: string[]) {
  if (typeof window === "undefined") return;

  void (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key: KEY, value: JSON.stringify(next) });
    } catch {
      // The wishlist itself is saved. A copy that did not arrive only means
      // the app's Saved screen is one piece behind until the next change.
    }
  })();
}

function write(next: string[]) {
  skus = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do; the in-memory list still works for this session.
  }
  mirror(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  // First subscriber pulls the stored list. Reading here rather than at module
  // scope keeps this file importable on the server.
  if (!hydrated) {
    hydrated = true;
    skus = read();
    // A list saved before the app had screens of its own still has to reach
    // them, so the first read mirrors what it found.
    mirror(skus);
  }
  listeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      skus = read();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWishlist() {
  const list = useSyncExternalStore(
    subscribe,
    () => skus,
    () => EMPTY,
  );

  const toggle = useCallback((sku: string) => {
    write(skus.includes(sku) ? skus.filter((s) => s !== sku) : [...skus, sku]);
  }, []);

  const has = useCallback((sku: string) => list.includes(sku), [list]);

  return { skus: list, toggle, has };
}
