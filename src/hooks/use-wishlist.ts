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

function write(next: string[]) {
  skus = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do; the in-memory list still works for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  // First subscriber pulls the stored list. Reading here rather than at module
  // scope keeps this file importable on the server.
  if (!hydrated) {
    hydrated = true;
    skus = read();
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
