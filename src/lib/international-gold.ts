import { createIsomorphicFn } from "@tanstack/react-start";

import type { InternationalGold } from "@/routes/api/international-gold";

/**
 * The international gold quote, however the caller happens to be running.
 *
 * A route loader runs in both places: on the server for the first request, and
 * in the browser on every navigation after it. The two cannot reach this figure
 * the same way — the upstream sends no CORS headers, so a page cannot read it
 * directly, and the server has no page to ask.
 *
 * So each side takes the route open to it. On the server that is the reader
 * behind /api/international-gold, called directly rather than the server making
 * an HTTP request to itself; in the browser it is that endpoint, which is what
 * the panel already used. The import is dynamic so the upstream call, its keys
 * and its cache stay out of the browser bundle.
 *
 * Either way it answers null rather than throwing. This is a comparison figure
 * beside the shop's own board, and it is not worth failing a page over — the
 * panel removes itself when there is nothing to show, exactly as before.
 */
export const loadInternationalGold = createIsomorphicFn()
  .server(async (): Promise<InternationalGold | null> => {
    try {
      const { readInternationalGold } = await import("@/routes/api/international-gold");
      return await readInternationalGold();
    } catch (e) {
      console.error("[international-gold] server read failed", e);
      return null;
    }
  })
  .client(async (): Promise<InternationalGold | null> => {
    try {
      const res = await fetch("/api/international-gold");
      if (!res.ok) return null;
      return (await res.json()) as InternationalGold;
    } catch {
      return null;
    }
  });
