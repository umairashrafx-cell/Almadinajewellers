import type { MarketQuote } from "@/lib/markets";

/**
 * A rupee figure, said again in dollars for somebody who thinks in them.
 *
 * The shop prices in rupees, weighs in front of the customer and bills in
 * rupees. Nothing here changes that, and nothing here replaces a rupee figure
 * on any screen: the dollar amount is a second line under the real one, marked
 * as approximate, for a customer abroad sending money home for a wedding who
 * wants to know roughly what a set costs before they ask.
 *
 * The rate is the interbank dollar the international board already carries —
 * fetched, not typed, and the same figure that board uses to turn dollars an
 * ounce into rupees a tola. It is not the rate a money changer gives; the
 * settings screen says so in as many words.
 */

/** Rupees to one US dollar, and when that was taken. */
export type Dollar = { pkr: number; at: string };

/**
 * How old a dollar may be and still be used.
 *
 * A week. The interbank rupee does not trade at weekends and the server keeps
 * the last figure it managed to fetch, so a quote a few days old is ordinary
 * and still a fair guide. Past a week the phone has plainly been offline or
 * the feed has plainly been down, and a conversion at a rate that stale is a
 * figure the app has no business printing beside a price — so it prints
 * nothing, and the rupee price stands on its own as it always did.
 */
export const DOLLAR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** The board's dollar, if it is one a price can honestly be converted at. */
export function usableDollar(quote: MarketQuote | undefined, now: number): Dollar | null {
  if (!quote) return null;

  const pkr = quote.usd;
  if (typeof pkr !== "number" || !Number.isFinite(pkr) || pkr <= 0) return null;

  const taken = Date.parse(quote.at);
  if (!Number.isFinite(taken)) return null;
  // Not from the future either: a clock that wrong makes the age meaningless.
  if (now - taken > DOLLAR_MAX_AGE_MS || taken - now > DOLLAR_MAX_AGE_MS) return null;

  return { pkr, at: quote.at };
}

/**
 * "≈ US$1,234", or nothing.
 *
 * To the dollar from a hundred up, because the cents on a bridal set are noise
 * and the conversion is not good to the cent anyway. With cents below that, so
 * a silver ring does not read as "US$7" when it is nearer eight.
 *
 * "US$" rather than a bare sign: this is printed beside rupee prices for
 * customers in several countries, more than one of which calls its own money
 * dollars.
 */
export function approxUsd(pkr: number, dollar: Dollar | null): string | null {
  if (!dollar) return null;
  if (!Number.isFinite(pkr) || pkr <= 0) return null;

  const usd = pkr / dollar.pkr;
  const digits = usd >= 100 ? 0 : 2;

  return `≈ US$${usd.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
