import { useCallback, useSyncExternalStore } from "react";

import { serverSnapshot, snapshot, subscribe, toggle } from "@/lib/wishlist";

/**
 * React's view of the wishlist.
 *
 * All of the thinking is in lib/wishlist.ts — where the list is kept, and why
 * that differs inside the Android app. This is only the binding, and
 * useSyncExternalStore is what keeps every card and the header count in step
 * with it. The server snapshot is empty, so SSR and the first client render
 * agree about a list that only exists on the device.
 */
export function useWishlist() {
  const { skus, ready } = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const has = useCallback((sku: string) => skus.includes(sku), [skus]);

  return { skus, has, toggle, ready };
}
