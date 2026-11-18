import {
  calendarCurrencies,
  convertsToTola,
  eventsToday,
  formatQuote,
  perTolaPKR,
  rangeWindowLabel,
  MARKET_ROWS,
} from "@/lib/markets";
import type {
  MarketBoard,
  MarketCalendar,
  MarketEvent,
  MarketQuote,
  MarketRange,
} from "@/lib/markets";
import { dayName, pktDay, pktTime } from "@/lib/pkt";
import { formatPKR } from "@/lib/site";

/**
 * The international board, worked out as figures and sentences, with no view
 * attached.
 *
 * Two screens draw this board — the Android app's International tab and the
 * website's rate page — and they are drawn differently on purpose. The app's
 * is a stack of cards sized for a phone held at arm's length in a shop; the
 * website's is a panel on the page that brings the shop most of its traffic,
 * set in that page's own type. Neither should be the other wearing a different
 * stylesheet.
 *
 * What they must never disagree about is the arithmetic. A customer who checks
 * the app against the website and finds gold at two prices has been given a
 * reason to believe neither, and the figures here are the ones under the
 * shop's name. So every number, unit, sign and source sentence is decided in
 * this file, once, and both screens ask it rather than working it out again.
 *
 * Everything here is pure, which is the other half of the point: a board this
 * full of conditional truths — a range that cannot place its own marker, a
 * conversion that must refuse rather than guess — is worth testing, and none
 * of it can be tested through a component.
 */

/**
 * Which units the two metals are shown in.
 *
 * Only the metals move. A tola of the dollar index is not a thing, and nobody
 * weighs a barrel of crude or a bitcoin in one, so those three stay in their
 * own units whichever way this is set -- which is why the control says
 * "metals in" rather than pretending to convert the whole board.
 */
export type Unit = "usd" | "tola";

/** What one dollar buys, when the board is carrying a usable figure for it. */
export function interbank(board: MarketBoard): number | null {
  const quote = board.usdPkr?.usd;
  return typeof quote === "number" && Number.isFinite(quote) && quote > 0 ? quote : null;
}

/**
 * A price formatter that knows which units the board is in.
 *
 * Built once and handed down, so the row and the range bar do not each have
 * to decide what to do about tolas -- they ask for a figure formatted and get
 * one. Anything it cannot honestly convert comes back in dollars rather than
 * coming back wrong: a row that is not a metal, a board with no dollar rate,
 * and a figure perTolaPKR refuses all take the same path out.
 */
export function priceIn(unit: Unit, usdPkr: number | null) {
  return (key: keyof MarketBoard, value: number): string => {
    if (unit === "usd" || usdPkr === null || !convertsToTola(key)) return formatQuote(key, value);
    const converted = perTolaPKR(value, usdPkr);
    if (converted === null) return formatQuote(key, value);
    // To the rupee. The paisa on a figure this size is noise, and the shop's
    // own board next door is quoted whole.
    return formatPKR(Math.round(converted));
  };
}

/** How a figure is printed in whichever units the board is showing. */
export type PriceFormatter = (key: keyof MarketBoard, value: number) => string;

/**
 * The same, for a move: sign first, magnitude formatted like a price.
 *
 * Kept here rather than reusing formatChange because the sign has to sit
 * outside whichever currency the magnitude ends up in. In dollars it produces
 * exactly what formatChange always did.
 */
export function changeIn(price: PriceFormatter): PriceFormatter {
  return (key: keyof MarketBoard, value: number): string => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${price(key, Math.abs(value))}`;
  };
}

/** What to call a metal's unit once it is being quoted by weight. */
export function unitLabel(
  key: keyof MarketBoard,
  unit: Unit,
  usdPkr: number | null,
  fallback: string,
): string {
  if (unit === "usd" || usdPkr === null || !convertsToTola(key)) return fallback;
  // 24K said out loud on the gold only. Spot gold is pure metal and the shop's
  // own headline rate is 22K, so the two figures are not the same thing and
  // the board must not let them be read as though they were.
  return key === "gold" ? "per tola, 24K" : "per tola";
}

/**
 * The day's move as one string: the cash figure, then the percentage after it.
 *
 * The cash figure leads and the percentage follows it in brackets, because
 * "down four hundred dollars" is the sentence somebody standing at a counter
 * actually says. Where a source gives a percentage but no cash figure the
 * percentage stands alone, rather than sitting in brackets after nothing, and
 * where it gives neither there is no move to print.
 */
export function movedLabel(
  key: keyof MarketBoard,
  quote: MarketQuote,
  change: PriceFormatter,
): string | null {
  const move = quote.changePercent;
  if (typeof move !== "number" || !Number.isFinite(move)) return null;

  const percent = `${move > 0 ? "+" : ""}${move.toFixed(2)}%`;
  if (typeof quote.change !== "number" || !Number.isFinite(quote.change)) return percent;

  return `${change(key, quote.change)} (${percent})`;
}

/** Which way a move points, for the colour and the arrow beside it. */
export function moveDirection(quote: MarketQuote): "up" | "down" | "flat" | null {
  const move = quote.changePercent;
  if (typeof move !== "number" || !Number.isFinite(move)) return null;
  return move > 0 ? "up" : move < 0 ? "down" : "flat";
}

/**
 * One row of the board: an instrument, its quote, and the releases due today
 * that move it.
 *
 * `events` being null rather than empty is the honest case — see eventsToday —
 * and it travels as null all the way to the panel, which then says nothing
 * instead of saying "nothing".
 */
/**
 * The five instruments that draw a row, and only those.
 *
 * Taken from MARKET_ROWS rather than written as `keyof MarketBoard`, which is
 * wider: the board also carries the interbank dollar, which is there to turn
 * ounces into tolas and never draws a row of its own. A row key that admitted
 * it would let a caller look up a TradingView ticker for the rupee, which
 * there is not one of.
 */
export type BoardRowKey = (typeof MARKET_ROWS)[number]["key"];

export type BoardRow = {
  key: BoardRowKey;
  label: string;
  unit: string;
  quote: MarketQuote;
  events: MarketEvent[] | null;
};

/**
 * Every instrument the board actually has, in the order they belong in.
 *
 * An instrument that could not be fetched is simply absent. A board of four is
 * honest; a board of five with a zero in it is not.
 *
 * Gold and silver's releases are not attached here: both screens give them a
 * section of their own under the board, laid out to be read rather than
 * squeezed into a row. The dollar index keeps its list, because its basket's
 * releases are not the metals' and appear nowhere else.
 */
export function boardRows(
  board: MarketBoard,
  calendar: MarketCalendar | undefined,
  now: Date = new Date(),
): BoardRow[] {
  return MARKET_ROWS.flatMap((row) => {
    const quote = board[row.key];
    if (!quote) return [];
    const events = row.key === "dollarIndex" ? eventsToday(row.key, calendar, now) : null;
    return [{ key: row.key, label: row.label, unit: row.unit, quote, events }];
  });
}

/**
 * A streamed bitcoin price laid over the board the server fetched.
 *
 * The streamed price wins whenever the socket is up: it is the same instrument
 * quoted seconds ago rather than minutes, and if the socket never opens the
 * server's figure is still there underneath.
 *
 * The range is carried across by hand rather than by spreading the fetched
 * quote underneath. The stream sends a price and a move and nothing else, and
 * spreading would quietly pair a live price with whatever else was in the old
 * object. So the range comes over, named, and nothing else does. It stays
 * CoinGecko's twenty-four hours while the price is the exchange's latest tick,
 * which is why a bitcoin that has just made a new high shows its two numbers
 * without a marker between them.
 */
export function withLiveBitcoin(
  fetched: MarketBoard,
  live: { usd: number; changePercent?: number; change?: number } | undefined,
  at: string,
): MarketBoard {
  if (!live) return fetched;

  return {
    ...fetched,
    bitcoin: {
      ...live,
      // Spread rather than assigned, because the key has to be absent when
      // there is no range to carry over, not present and undefined.
      ...(fetched.bitcoin?.range ? { range: fetched.bitcoin.range } : {}),
      at,
    },
  };
}

/**
 * What the footnote offers, said only about what the board actually has.
 *
 * An older deployment of the edge function sends ranges and no calendar, and
 * both screens have to read correctly against it: a board with nothing behind
 * its rows must not invite a tap that does nothing.
 *
 * The verb is the caller's because the gesture is. A phone is tapped and a
 * desktop page is clicked, and "tap an instrument" on a laptop is the kind of
 * small wrongness that tells a reader the page was written for somewhere else.
 */
export function tapHint(anyRange: boolean, anyEvents: boolean, verb = "Tap"): string | null {
  if (anyRange && anyEvents) return `${verb} an instrument for its range and the day's releases.`;
  if (anyRange) return `${verb} an instrument for its high and low.`;
  if (anyEvents) return `${verb} an instrument for the day's releases.`;
  return null;
}

/**
 * Where the two figures of a range came from, in one sentence.
 *
 * Always said, never implied. A range measured over a half-finished trading
 * session is not a day's range, and a futures range under a spot price is not
 * that price's range — both are worth showing and neither is worth leaving
 * unlabelled.
 */
export function provenance(range: MarketRange): string {
  if (range.instrument) {
    return `${range.instrument}. The price above is spot, which can sit outside this range.`;
  }

  return range.window === "24h"
    ? "A rolling twenty-four hours."
    : "The current trading session, not a full day.";
}

/** The heading over a range: "24-hour range", or "Range today". */
export const rangeLabel = rangeWindowLabel;

/**
 * Whose releases a row's list is, said plainly.
 *
 * Gold is watching one country's data and the dollar index is watching the six
 * currencies it is measured against, and a reader is entitled to know which of
 * those they are looking at before drawing a conclusion from a short list.
 */
export function scope(key: keyof MarketBoard): string {
  const currencies = calendarCurrencies(key) ?? [];
  if (currencies.length === 0) return "";
  if (currencies.length === 1) {
    return `High and medium impact ${currencies[0]} releases.`;
  }

  return `High and medium impact releases for the index basket — ${currencies.join(", ")}.`;
}

/**
 * When the board was last fetched: "6:30 PM", or the day as well once it is no
 * longer today.
 *
 * Stated in Pakistan time, like every other time on the board, rather than in
 * whatever zone the thing drawing it happens to sit in. On a phone in the
 * bazaar those are the same answer; on the website they are not, because the
 * page is rendered on a server abroad and then hydrated in the reader's own
 * browser. Formatting against the ambient zone there produces one string in
 * the HTML and a different one a moment later, which React reports as a
 * hydration mismatch and a reader sees as the timestamp flinching.
 *
 * pkt.ts is a fixed offset rather than a time zone lookup, so the server, the
 * browser and the test runner all agree. See its own note for why.
 *
 * `now` is an argument rather than read inside, so a test can ask what a
 * figure fetched yesterday reads as without waiting until tomorrow.
 */
export function taken(iso: string, now: Date = new Date()): string {
  const time = pktTime(iso);
  if (!time) return "recently";

  const day = pktDay(iso);
  return day === pktDay(now) ? time : `${time} on ${dayName(day)}`;
}
