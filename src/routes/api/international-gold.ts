import { createFileRoute } from "@tanstack/react-router";

import { TOLA_IN_GRAMS } from "@/lib/rates";

/**
 * The international gold price, fetched on the server.
 *
 * Fetched here rather than in the browser for two reasons. The upstream sends
 * no CORS headers, so a page cannot read it directly; and one request per
 * visitor would be both rude and slow, where one request per few minutes
 * serves everybody.
 *
 * The figure is COMEX gold futures — the contract, not spot metal. The two
 * differ by a few dollars and the page says "international gold" rather than
 * "spot" because of it. Nothing on this site should print a number under a
 * name that is not quite its own.
 */

const GRAMS_PER_TROY_OUNCE = 31.1034768;

/** COMEX gold, and the rupee, from the same source so they share a timestamp. */
const GOLD = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d";
const USD_PKR = "https://query1.finance.yahoo.com/v8/finance/chart/USDPKR=X?interval=1d&range=1d";

export type InternationalGold = {
  /** USD per troy ounce, as quoted. */
  usdPerOunce: number;
  usdPerGram: number;
  /** What an ounce of pure gold is worth in rupees at the day's exchange rate. */
  pkrPerTola: number;
  usdPkr: number;
  /** When the upstream last moved, not when we asked. */
  quotedAt: string;
};

type YahooChart = {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number; regularMarketTime?: number };
    }[];
  };
};

async function quote(url: string): Promise<{ price: number; at: number }> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; almadinajeweller.com)" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`upstream ${res.status}`);

  const body = (await res.json()) as YahooChart;
  const meta = body.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("upstream returned no price");
  }

  return { price, at: meta?.regularMarketTime ?? Math.floor(Date.now() / 1000) };
}

/*
 * A short memory, so a burst of visitors is one request upstream.
 *
 * Deliberately small: this is a live figure and a stale one is worth less than
 * none. The CDN is told the same number, so most requests never reach here.
 */
const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: InternationalGold } | null = null;

async function read(): Promise<InternationalGold> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const [gold, fx] = await Promise.all([quote(GOLD), quote(USD_PKR)]);

  const usdPerGram = gold.price / GRAMS_PER_TROY_OUNCE;

  const value: InternationalGold = {
    usdPerOunce: gold.price,
    usdPerGram,
    pkrPerTola: usdPerGram * TOLA_IN_GRAMS * fx.price,
    usdPkr: fx.price,
    quotedAt: new Date(gold.at * 1000).toISOString(),
  };

  cached = { at: Date.now(), value };
  return value;
}

export const Route = createFileRoute("/api/international-gold")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const value = await read();

          return new Response(JSON.stringify(value), {
            headers: {
              "content-type": "application/json; charset=utf-8",
              // Five minutes fresh, and an hour of staleness is far better
              // than an empty panel while the upstream is having a moment.
              "cache-control": "public, max-age=300, stale-while-revalidate=3600",
            },
          });
        } catch (e) {
          console.error("[international-gold] upstream failed", e);

          /*
           * 503 rather than a made-up number. The page hides the panel when
           * this fails, which is the right outcome: a gold price nobody can
           * vouch for is worse than no gold price.
           */
          return new Response(JSON.stringify({ error: "unavailable" }), {
            status: 503,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        }
      },
    },
  },
});
