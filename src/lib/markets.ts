import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { TOLA_IN_GRAMS } from "@/lib/rates";

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

/**
 * Where an instrument closed a week and a month ago.
 *
 * `last` is the series' own most recent close and every move is measured
 * against it, never against the live price beside it. For the metals the two
 * come from different places — spot from gold-api, history from the COMEX
 * contract — and measuring one against the other would fold a source
 * difference and a contract roll into a figure shown as a market move.
 */
export type MarketTrail = {
  /** What was measured, where it is not the instrument the price came from. */
  instrument?: string;
  last: number;
  week?: number;
  month?: number;
  at: string;
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
  /** Where the instrument was a week and a month back. */
  trail?: MarketTrail;
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
  /**
   * The interbank dollar, rupees to one US dollar.
   *
   * Carried on the board because it is fetched with the five and kept like
   * them when a source will not answer, but it is not one of MARKET_ROWS and
   * never draws a row of its own. Its only job is to turn dollars an ounce
   * into rupees a tola, which is the figure somebody in a Sarafa bazaar can
   * actually hold against the shop's board.
   *
   * Interbank, not the open market. A money changer's rate is usually a rupee
   * or two above it, so a tola converted here sits slightly under what the
   * same metal would cost bought with cash dollars -- before any duty,
   * premium or making is added. Anything printing this figure has to say so.
   */
  usdPkr?: MarketQuote;
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

/** A troy ounce, which is the unit every metal on this board is quoted in. */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

/**
 * Tolas to the troy ounce.
 *
 * Derived rather than written down, so it can never drift from the tola the
 * rest of the shop weighs in: TOLA_IN_GRAMS is the figure the calculator and
 * the rate board already use, and this is that figure expressed against the
 * unit the international market quotes. It comes out a hair under 0.375.
 */
export const TOLA_PER_TROY_OUNCE = TOLA_IN_GRAMS / GRAMS_PER_TROY_OUNCE;

/**
 * A dollars-an-ounce quote as rupees a tola, at the interbank dollar.
 *
 * Null rather than a number whenever either input is not a usable figure, and
 * that is the whole of the error handling on purpose: a conversion is only as
 * honest as the two numbers behind it, and a screen that gets null here is
 * expected to show nothing rather than a zero or a dash with a currency sign
 * in front of it.
 *
 * What comes out is pure metal at the market's own price, converted at the
 * interbank rate. It is not a selling price: it carries no import duty, no
 * dealer premium, no making, and the rupee a customer actually buys dollars
 * with is the open-market one. Expect it to sit near the local 24K figure
 * without matching it, and never present it as the shop's rate.
 */
export function perTolaPKR(usdPerOunce: number, usdPkr: number): number | null {
  if (!Number.isFinite(usdPerOunce) || usdPerOunce <= 0) return null;
  if (!Number.isFinite(usdPkr) || usdPkr <= 0) return null;
  return usdPerOunce * TOLA_PER_TROY_OUNCE * usdPkr;
}

/** The metals, and only the metals: the two rows a tola means anything for. */
export function convertsToTola(key: keyof MarketBoard): boolean {
  return key === "gold" || key === "silver";
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

/* -------------------------------------------------------------- what moved */

/**
 * Why the rupee price of a tola is where it is.
 *
 * Two things set it and only two: the dollar price of the metal, and the
 * number of rupees in a dollar. The tola price is their product, so a move in
 * it is the product of their moves — and a customer who has watched the local
 * rate climb for a month is owed the answer to which of the two did it, since
 * the two have very different implications for whether it keeps climbing.
 *
 * The split is exact rather than approximate. Per cent changes do not add up:
 * gold +5% and the rupee +5% is +10.25% on the tola, not +10%. Logarithms do
 * add up, so the attribution below compares log moves while the figures shown
 * stay as the per cent changes a reader expects. That is also why `metalPct`
 * and `rupeePct` will not sum to `tolaPct` and are not meant to.
 */
export type TrailWindow = "week" | "month";

export type RateDrivers = {
  window: TrailWindow;
  /** The metal, in dollars, per cent. */
  metalPct: number;
  /** The dollar against the rupee, per cent. A rise is a weaker rupee. */
  rupeePct: number;
  /** The two together, on the rupee price of a tola. */
  tolaPct: number;
  /** Which did the greater part of the work. */
  mostly: "metal" | "rupee" | "evenly";
  /** One pushed the tola price up while the other pulled it down. */
  opposed: boolean;
  /** What the metal move was measured on, where it was not spot. */
  instrument?: string;
};

/**
 * One is "mostly" responsible at half as much again as the other.
 *
 * A judgement, and a deliberately unfussy one. Below it the honest answer is
 * that both moved, and saying "mostly the metal" about 0.9% against 0.8%
 * would be a precision the reader would reasonably take for a finding.
 */
const MOSTLY = 1.5;

/** Under this, in log terms, nothing happened worth attributing. */
const FLAT = 0.0005;

function ratio(then: number | undefined, now: number): number | null {
  if (typeof then !== "number" || !Number.isFinite(then) || then <= 0) return null;
  if (!Number.isFinite(now) || now <= 0) return null;
  return now / then;
}

/**
 * The metal and the rupee over one window, or nothing.
 *
 * Nothing, rather than a partial answer, when either half is missing: half of
 * this is not a smaller truth but a different and misleading one, since "gold
 * is up 3%" with no rupee beside it invites the reader to assume the rupee
 * held still.
 */
export function driversFor(
  board: MarketBoard,
  key: "gold" | "silver",
  window: TrailWindow,
): RateDrivers | null {
  const metalTrail = board[key]?.trail;
  const rupeeTrail = board.usdPkr?.trail;
  if (!metalTrail || !rupeeTrail) return null;

  const metal = ratio(metalTrail[window], metalTrail.last);
  const rupee = ratio(rupeeTrail[window], rupeeTrail.last);
  if (metal === null || rupee === null) return null;

  const metalLog = Math.log(metal);
  const rupeeLog = Math.log(rupee);
  const metalSize = Math.abs(metalLog);
  const rupeeSize = Math.abs(rupeeLog);

  const mostly =
    metalSize < FLAT && rupeeSize < FLAT
      ? "evenly"
      : metalSize > rupeeSize * MOSTLY
        ? "metal"
        : rupeeSize > metalSize * MOSTLY
          ? "rupee"
          : "evenly";

  return {
    window,
    metalPct: (metal - 1) * 100,
    rupeePct: (rupee - 1) * 100,
    tolaPct: (metal * rupee - 1) * 100,
    mostly,
    opposed: metalSize >= FLAT && rupeeSize >= FLAT && metalLog * rupeeLog < 0,
    ...(metalTrail.instrument === undefined ? {} : { instrument: metalTrail.instrument }),
  };
}

/** "+3.1%", "-0.4%", "0.0%" — a move, signed, to one decimal place. */
export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0.0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}%`;
}

/**
 * The gap between what the shop sells a tola at and what it pays for one.
 *
 * The number that actually decides whether waiting a week is worth it. It is
 * not margin: it is the melting and the making that has to be done again
 * before bought-back gold is jewellery, which is what the sell screen says in
 * those words. Returned as a per cent of the selling rate.
 */
export function spreadPct(sellPerTola: number, buyPerTola: number): number | null {
  if (!Number.isFinite(sellPerTola) || sellPerTola <= 0) return null;
  if (!Number.isFinite(buyPerTola) || buyPerTola <= 0) return null;
  if (buyPerTola > sellPerTola) return null;
  return ((sellPerTola - buyPerTola) / sellPerTola) * 100;
}
