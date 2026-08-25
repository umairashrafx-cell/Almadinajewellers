import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * The cart, persisted in localStorage.
 *
 * Same shape as the wishlist store next door: a module-level value, a set of
 * listeners, and an empty server snapshot so SSR and the first client render
 * agree. A provider would work too, but the wishlist established the pattern
 * and two different mechanisms for two adjacent features is worse than one.
 *
 * Only the SKU and a quantity are kept. Names, weights and prices are looked up
 * from the catalogue when the cart is rendered, so a piece that was re-priced,
 * renamed or withdrawn after it was added cannot show a stale figure — which
 * matters here more than it would elsewhere, because prices move with the gold
 * rate every day.
 */

const KEY = "amj:cart";

export type CartLine = { sku: string; quantity: number };

let lines: CartLine[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const EMPTY: CartLine[] = [];

/** Nobody is ordering ninety-nine bridal sets; this is a typo guard. */
const MAX_QUANTITY = 20;

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (v): v is CartLine =>
          typeof v === "object" && v !== null && typeof v.sku === "string" && v.sku.length > 0,
      )
      .map((v) => ({
        sku: v.sku,
        quantity: Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(v.quantity) || 1))),
      }));
  } catch {
    // Private-mode localStorage or corrupt JSON — an empty cart is fine.
    return [];
  }
}

function write(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do; the in-memory cart still works for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    lines = read();
  }
  listeners.add(listener);

  // Keeps two open tabs agreeing about what is in the cart.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      lines = read();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const list = useSyncExternalStore(
    subscribe,
    () => lines,
    () => EMPTY,
  );

  const add = useCallback((sku: string, quantity = 1) => {
    const existing = lines.find((l) => l.sku === sku);
    if (existing) {
      write(
        lines.map((l) =>
          l.sku === sku ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) } : l,
        ),
      );
      return;
    }
    write([...lines, { sku, quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)) }]);
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    const q = Math.floor(quantity);
    if (q < 1) {
      write(lines.filter((l) => l.sku !== sku));
      return;
    }
    write(lines.map((l) => (l.sku === sku ? { ...l, quantity: Math.min(MAX_QUANTITY, q) } : l)));
  }, []);

  const remove = useCallback((sku: string) => {
    write(lines.filter((l) => l.sku !== sku));
  }, []);

  const clear = useCallback(() => write([]), []);

  /**
   * Drops everything except the given SKUs.
   *
   * The cart calls this once the catalogue has answered, so a piece withdrawn
   * from sale stops being counted in the header badge as well as in the totals.
   * It must only ever be called with a *successful* catalogue response —
   * pruning against a failed fetch would quietly empty someone's cart.
   */
  const keepOnly = useCallback((skus: readonly string[]) => {
    const keep = new Set(skus);
    // Writing unconditionally would notify subscribers on every render and spin
    // the effect that calls this.
    if (lines.every((l) => keep.has(l.sku))) return;
    write(lines.filter((l) => keep.has(l.sku)));
  }, []);

  const has = useCallback((sku: string) => list.some((l) => l.sku === sku), [list]);

  const count = useMemo(() => list.reduce((n, l) => n + l.quantity, 0), [list]);

  return {
    lines: list,
    add,
    setQuantity,
    remove,
    clear,
    keepOnly,
    has,
    count,
    maxQuantity: MAX_QUANTITY,
  };
}
