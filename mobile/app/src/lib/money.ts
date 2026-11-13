import type { MarketFx, MarketQuote } from "@/lib/markets";

import type { Currency } from "./settings";

/**
 * A rupee figure, said again in another currency for somebody who thinks in
 * it.
 *
 * The shop prices in rupees, weighs in front of the customer and bills in
 * rupees. Nothing here changes that, and nothing here replaces a rupee figure
 * on any screen: the other amount is a second line under the real one, marked
 * as approximate, for a customer abroad sending money home for a wedding who
 * wants to know roughly what a set costs before they ask.
 *
 * Every rate is anchored on one rupee: the interbank dollar the international
 * board already carries, which is the same figure that board uses to turn
 * dollars an ounce into rupees a tola. The dollar is that figure as it stands.
 * Every other currency is that same dollar crossed with the day's reference
 * rate for the currency against the dollar, which the server reads from a
 * dated source — so a pound and a dollar on the same screen are worked from
 * the same rupee, and cannot disagree about it. Nothing is typed in. None of
 * it is the rate a money changer gives; the settings screen says so.
 */

/** The currencies a price can be said again in. */
export type Foreign = Exclude<Currency, "PKR">;

/** Rupees to one US dollar, and when that was taken. */
export type Dollar = { pkr: number; at: string };

/** Rupees to one unit of a currency, and what it was worked from. */
export type Rate = {
  code: Foreign;
  pkr: number;
  /** The interbank dollar every rate here is anchored on. */
  dollar: Dollar;
  /** The day of the cross against the dollar, yyyy-mm-dd. Absent for the dollar. */
  day?: string;
};

/**
 * How old a rate may be and still be used.
 *
 * A week. The interbank rupee does not trade at weekends and the server keeps
 * the last figure it managed to fetch, so a quote a few days old is ordinary
 * and still a fair guide. Past a week the phone has plainly been offline or
 * the feed has plainly been down, and a conversion at a rate that stale is a
 * figure the app has no business printing beside a price — so it prints
 * nothing, and the rupee price stands on its own as it always did.
 *
 * The same week for the dollar's own quote and for the day of a cross.
 */
export const DOLLAR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Within a week either side of now. A clock that wrong makes the age meaningless. */
function recent(at: number, now: number): boolean {
  return Number.isFinite(at) && now - at <= DOLLAR_MAX_AGE_MS && at - now <= DOLLAR_MAX_AGE_MS;
}

/** The board's dollar, if it is one a price can honestly be converted at. */
export function usableDollar(quote: MarketQuote | undefined, now: number): Dollar | null {
  if (!quote) return null;

  const pkr = quote.usd;
  if (typeof pkr !== "number" || !Number.isFinite(pkr) || pkr <= 0) return null;
  if (!recent(Date.parse(quote.at), now)) return null;

  return { pkr, at: quote.at };
}

/**
 * The rate for a currency, if there is one a price can honestly be converted
 * at.
 *
 * Nothing unless the dollar it is anchored on is usable. For anything but the
 * dollar, nothing unless the server's crosses are recent and carry that
 * currency as a positive number. Each of those failures leaves the screen
 * showing rupees alone, which is never wrong.
 */
export function usableRate(
  code: Foreign,
  quote: MarketQuote | undefined,
  fx: MarketFx | undefined,
  now: number,
): Rate | null {
  const dollar = usableDollar(quote, now);
  if (!dollar) return null;
  if (code === "USD") return { code, pkr: dollar.pkr, dollar };

  if (!fx || typeof fx.day !== "string") return null;
  if (!recent(Date.parse(`${fx.day}T00:00:00Z`), now)) return null;

  const perUsd = fx.perUsd?.[code.toLowerCase()];
  if (typeof perUsd !== "number" || !Number.isFinite(perUsd) || perUsd <= 0) return null;

  return { code, pkr: dollar.pkr / perUsd, dollar, day: fx.day };
}

/**
 * How each currency is written in front of a figure.
 *
 * "US$" rather than a bare dollar sign, because three of the ten are dollars
 * and a customer in Toronto reading "$" beside a price would be right to read
 * it as their own. The Gulf currencies are written by their codes, which is
 * how a price board in Dubai or Riyadh writes them in English.
 */
const PREFIX: Record<Foreign, string> = {
  USD: "US$",
  GBP: "£",
  EUR: "€",
  AED: "AED ",
  SAR: "SAR ",
  QAR: "QAR ",
  KWD: "KWD ",
  OMR: "OMR ",
  CAD: "CA$",
  AUD: "A$",
};

/**
 * "≈ £1,234", or nothing.
 *
 * Whole units from a hundred up, because the pence on a bridal set are noise
 * and the conversion is not good to the penny anyway. Two decimals below
 * that, so a silver ring does not read as "US$7" when it is nearer eight —
 * and so a dinar, worth nine hundred rupees, does not round a small piece to
 * nothing.
 */
export function approx(pkr: number, rate: Rate | null): string | null {
  if (!rate) return null;
  if (!Number.isFinite(pkr) || pkr <= 0) return null;

  const amount = pkr / rate.pkr;
  const digits = amount >= 100 ? 0 : 2;

  return `≈ ${PREFIX[rate.code]}${amount.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
