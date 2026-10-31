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

export type MarketQuote = {
  /** Price in US dollars. */
  usd: number;
  /** Move on the day, per cent, where the source gives one. */
  changePercent?: number;
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

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const { data, error } = await untyped.functions.invoke("market-rates", { method: "GET" });

  if (error) throw new Error(error.message);

  const snapshot = data as Partial<MarketSnapshot> | null;
  if (!snapshot?.board || typeof snapshot.board !== "object") {
    throw new Error("market-rates returned no board");
  }

  return { board: snapshot.board, fetchedAt: snapshot.fetchedAt ?? new Date().toISOString() };
}
