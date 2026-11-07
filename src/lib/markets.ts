import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * The international markets, as the shop's own server last saw them.
 *
 * Gold and silver an ounce, the dollar index, bitcoin and crude. None of it is
 * the shop's own figure and none of it settles a transaction: it is the
 * context a customer in a Sarafa bazaar already follows, shown beside the
 * counter rate rather than mixed into it.
 *
 * Everything comes from the market-rates edge function, never from the APIs
 * directly. That is not a detail — Yahoo sends no CORS headers, so a browser
 * request for the dollar index dies where it stands, and five free tiers
 * cannot survive every phone asking them separately. The function fetches once
 * and the answer is shared.
 */

const untyped = supabase as unknown as SupabaseClient;

/**
 * The high and the low an instrument has traded between, where its source
 * publishes them.
 *
 * `window` is the honest part. Bitcoin's range is a genuine rolling
 * twenty-four hours from CoinGecko; the rest is the current trading session
 * from Yahoo, which early on a Monday is a few minutes wide. The screen says
 * which rather than calling both "24h".
 *
 * `instrument` is set only when the range is not the same instrument as the
 * price beside it. That is the metals: gold and silver are quoted here at spot,
 * and no free spot source publishes a range, so the figures come from the COMEX
 * contract and say so. A spot price can sit outside a futures range, which is
 * why nothing here assumes it does not.
 */
export type MarketRange = {
  high: number;
  low: number;
  window: "24h" | "session";
  instrument?: string;
  /**
   * The move over the same window, from the same instrument as the range.
   * Present only where that instrument differs from the one the price came
   * from — the metals — since otherwise it is the quote's own `change` again.
   */
  change?: number;
};

export type MarketQuote = {
  /** Price in US dollars. */
  usd: number;
  /** Move on the day, per cent, where the source gives one. */
  changePercent?: number;
  /**
   * The same move in the instrument's own units: dollars for the metals,
   * bitcoin and crude, index points for the dollar index — which is why this
   * is formatted through formatChange rather than with a dollar sign bolted
   * on. Set only where it comes from the same quote as the price.
   */
  change?: number;
  /** The high and the low, where the source publishes them. */
  range?: MarketRange;
  /** When the figure was taken, ISO. */
  at: string;
};

/** The five instruments. Any of them may be missing: an API that would not
 *  answer and had nothing kept leaves its place on the board empty. */
export type MarketBoard = {
  gold?: MarketQuote;
  silver?: MarketQuote;
  dollarIndex?: MarketQuote;
  bitcoin?: MarketQuote;
  crude?: MarketQuote;
};

export type MarketSnapshot = {
  board: MarketBoard;
  /** When the server last went out for these, ISO. */
  fetchedAt: string;
};

/** How the five read on a board, in the order they belong in. */
export const MARKET_ROWS = [
  { key: "gold", label: "Gold", unit: "per ounce" },
  { key: "silver", label: "Silver", unit: "per ounce" },
  { key: "dollarIndex", label: "Dollar index", unit: "DXY" },
  { key: "bitcoin", label: "Bitcoin", unit: "per coin" },
  { key: "crude", label: "Crude oil", unit: "WTI, per barrel" },
] as const satisfies ReadonlyArray<{ key: keyof MarketBoard; label: string; unit: string }>;

/**
 * Formats a dollar figure the way each instrument is actually quoted: gold and
 * bitcoin to the dollar, because the cents are noise at those sizes; silver
 * and crude to the cent, because they are not.
 */
export function formatUSD(value: number, decimals: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatQuote(key: keyof MarketBoard, value: number): string {
  if (key === "dollarIndex") return value.toFixed(3);
  if (key === "silver" || key === "crude") return formatUSD(value, 2);
  return formatUSD(value, 0);
}

/**
 * A move, signed, in the instrument's own units.
 *
 * Routed through formatQuote so each instrument keeps its own convention: the
 * dollar index moves in index points and must not be given a dollar sign,
 * gold and bitcoin round to the dollar, silver and crude to the cent. A move
 * of exactly nothing gets no sign.
 */
export function formatChange(key: keyof MarketBoard, value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatQuote(key, Math.abs(value))}`;
}

/** What to call the window over which a range was measured. */
export function rangeWindowLabel(window: MarketRange["window"]): string {
  return window === "24h" ? "24-hour range" : "Range today";
}

/**
 * Where the current price sits inside a range, 0 at the low and 1 at the high,
 * for drawing a marker on a track.
 *
 * Null whenever a marker would be a lie rather than a position, and there are
 * three ways for that to happen. A range with no width cannot place anything.
 * A price below the low or above the high is not inside the range it is being
 * drawn on — real for the metals, whose price is spot and whose range is the
 * futures contract, and real for anyone whose two sources were read seconds
 * apart. And a figure that is not a finite number cannot be placed at all.
 *
 * The caller shows the two numbers either way. It is only the marker that
 * needs the price to actually be somewhere.
 */
export function rangePosition(price: number, range: MarketRange): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(range.high) || !Number.isFinite(range.low)) {
    return null;
  }

  const span = range.high - range.low;
  if (span <= 0) return null;
  if (price < range.low || price > range.high) return null;

  return (price - range.low) / span;
}

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const { data, error } = await untyped.functions.invoke("market-rates", { method: "GET" });

  if (error) throw new Error(error.message);

  const snapshot = data as Partial<MarketSnapshot> | null;
  if (!snapshot?.board || typeof snapshot.board !== "object") {
    throw new Error("market-rates returned no board");
  }

  return { board: snapshot.board, fetchedAt: snapshot.fetchedAt ?? new Date().toISOString() };
}
