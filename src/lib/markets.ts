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

/**
 * A scheduled release, as the metals calendar lists it.
 *
 * `currency` is the feed's own code — "USD", "EUR" — and is what decides which
 * instrument a release belongs to. `at` carries the feed's offset, US Eastern,
 * so every reading of it here goes through a Date and comes out in the phone's
 * own time: a figure released at half past eight in New York is half past six
 * in the evening in Mandi Bahauddin, and that is the time worth printing.
 */
export type MarketEvent = {
  title: string;
  currency: string;
  at: string;
  impact: "High" | "Medium";
  /** What the market expects, where one is published. */
  forecast?: string;
  /** What it was last time, where the feed gives it. */
  previous?: string;
};

/**
 * The week of releases the server last managed to collect.
 *
 * `from` and `to` are the week the feed covered, and they are the difference
 * between two things a screen must not confuse: a day inside the week with no
 * releases on it, which is worth saying out loud, and a day the feed never
 * covered, about which the only honest thing is silence. Both are absent when
 * the server has never had a successful fetch.
 */
export type MarketCalendar = {
  events: MarketEvent[];
  from?: string;
  to?: string;
  /** When the server last collected these, ISO. */
  fetchedAt?: string;
};

export type MarketSnapshot = {
  board: MarketBoard;
  /** When the server last went out for these, ISO. */
  fetchedAt: string;
  /** The week's releases, where the server has them. */
  calendar?: MarketCalendar;
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

/**
 * Which currencies' releases move which instrument.
 *
 * Gold and silver are quoted in dollars, and it is American data that moves
 * them: a payrolls figure or an inflation print reprices the ounce within the
 * minute. Nothing else on the metals calendar does that reliably, so nothing
 * else is claimed to.
 *
 * The dollar index is a basket, and the basket is the list — the dollar against
 * the euro, the yen, sterling, the Canadian dollar, the Swiss franc and the
 * Swedish krona. A European rate decision moves DXY because the euro is more
 * than half of it, and that is worth a jeweller's attention even though it is
 * not American news.
 *
 * Bitcoin and crude are deliberately absent. The metals calendar is not their
 * calendar — the same publisher keeps separate ones for energy and for crypto —
 * and a row that showed American data under crude would be guessing.
 */
const CALENDAR_CURRENCIES = {
  gold: ["USD"],
  silver: ["USD"],
  dollarIndex: ["USD", "EUR", "JPY", "GBP", "CAD", "CHF", "SEK"],
} as const satisfies Partial<Record<keyof MarketBoard, readonly string[]>>;

export function calendarCurrencies(key: keyof MarketBoard): readonly string[] | undefined {
  return (CALENDAR_CURRENCIES as Partial<Record<keyof MarketBoard, readonly string[]>>)[key];
}

/** A date as the phone's own calendar reads it, YYYY-MM-DD. Built by hand
 *  rather than through a locale, because this is compared against the feed's
 *  dates and must come out in that spelling every time. */
function localDay(at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, "0");
  const day = String(at.getDate()).padStart(2, "0");
  return `${at.getFullYear()}-${month}-${day}`;
}

/**
 * Today's releases for one instrument, in the order they are due.
 *
 * Null and empty are different answers, and the difference is the point.
 * Null means there is nothing to show and nothing to say: this instrument has
 * no calendar of its own, or the server has never collected one, or the phone's
 * today falls outside the week the feed covered. Empty means the day is
 * genuinely covered and genuinely has nothing on it — a Saturday, most often —
 * which a screen can state as a fact.
 *
 * "Today" is the phone's own day, and each release is placed on the day it
 * happens where the phone is standing. An Asian figure published at a quarter
 * to nine at night in New York falls on the following morning in Pakistan, and
 * showing it under yesterday would be showing it on the wrong day.
 */
export function eventsToday(
  key: keyof MarketBoard,
  calendar: MarketCalendar | undefined,
  now: Date = new Date(),
): MarketEvent[] | null {
  const currencies = calendarCurrencies(key);
  if (!currencies) return null;
  if (!calendar?.from || !calendar.to) return null;

  const today = localDay(now);
  if (today < calendar.from || today > calendar.to) return null;

  return calendar.events
    .filter((event) => currencies.includes(event.currency))
    .filter((event) => {
      const at = new Date(event.at);
      return !Number.isNaN(at.getTime()) && localDay(at) === today;
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** A release time in the phone's own clock — "18:30" — matching how the rest
 *  of the board states a time. */
export function eventTime(at: string): string {
  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const { data, error } = await untyped.functions.invoke("market-rates", { method: "GET" });

  if (error) throw new Error(error.message);

  const snapshot = data as Partial<MarketSnapshot> | null;
  if (!snapshot?.board || typeof snapshot.board !== "object") {
    throw new Error("market-rates returned no board");
  }

  // The calendar is carried only when it arrives with events in a list. A
  // deployment that predates it sends nothing, and the board must not care.
  const calendar =
    snapshot.calendar && Array.isArray(snapshot.calendar.events) ? snapshot.calendar : undefined;

  return {
    board: snapshot.board,
    fetchedAt: snapshot.fetchedAt ?? new Date().toISOString(),
    ...(calendar ? { calendar } : {}),
  };
}
