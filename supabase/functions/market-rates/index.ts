/**
 * The international markets, fetched once for everybody.
 *
 * Gold, silver, the dollar index, bitcoin and crude oil, from three free APIs
 * that owe us nothing. The app cannot call them itself for two reasons: Yahoo
 * sends no CORS headers, so a WebView request dies in the browser; and every
 * phone asking every API every time it opens the rate screen is how a free
 * tier gets withdrawn. So the fetching happens here, at most once every
 * CACHE_SECONDS, and the answer is kept in public.market_snapshot.
 *
 * Nothing here is authoritative and the function never pretends otherwise.
 * Each instrument carries the moment it was taken, and one that cannot be
 * refreshed keeps its last good figure rather than disappearing — a board with
 * four live numbers and one from an hour ago is worth more than no board, as
 * long as it says which is which. The screen is labelled "indicative" for the
 * same reason: these are reference prices from public endpoints, not a feed
 * anybody is paying for, and the shop's own counter rate is the one that
 * settles a transaction.
 *
 * Alongside the prices it carries the week's high and medium impact releases
 * from the metals calendar, on its own much slower clock — see
 * CALENDAR_SECONDS. That half can fail without the prices noticing, and does
 * not get to make the board late.
 *
 * Deployment:
 *   supabase functions deploy market-rates
 * No secrets. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the
 * platform, and every upstream here is keyless.
 */

/**
 * How long a fetched board stays good.
 *
 * Fifteen seconds, matching how often the app asks while its rate screen is
 * open — so a customer watching the board sees it move, and the upstreams see
 * four requests a minute no matter how many phones are watching. That is the
 * whole point of caching here rather than in the app: the cost of this board
 * does not grow with the number of customers.
 *
 * Shorter than this buys nothing. Gold and the dollar index are republished
 * about once a minute at these sources, so asking sixty times a minute would
 * return the same figure fifty-nine times and get us refused on the sixtieth.
 * Bitcoin is the one instrument that genuinely moves faster, and the app
 * streams that straight from the exchange rather than through here.
 */
const CACHE_SECONDS = 15;

/** Nothing upstream is allowed to hold the whole board up. */
const UPSTREAM_TIMEOUT_MS = 8000;

/**
 * How long the day's releases stay good, and how long we wait after a refusal.
 *
 * Fifteen minutes, which is measured rather than guessed. Asked twice in a row,
 * this feed answers the second request with 429 and a Retry-After of nearly
 * five minutes: it is published for a handful of fetches a day, not four a
 * minute. So the calendar cannot share the board's fifteen-second clock, and it
 * does not need to — a release scheduled for half past six is still scheduled
 * for half past six a quarter of an hour later.
 *
 * The same number is the backoff. A feed that has just refused us is not asked
 * again until this has passed, whatever the prices are doing.
 */
const CALENDAR_SECONDS = 900;

/**
 * The metals arm of the ForexFactory calendars, as one week of JSON.
 *
 * metalsmine.com is the site a dealer would open; this is the feed its own
 * week view reads. No key and no account, which is also why there is no
 * allowance here to spend carelessly.
 */
const CALENDAR_FEED = "https://nfs.faireconomy.media/mm_calendar_thisweek.json";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * The high and the low, where a source publishes them.
 *
 * `window` is not decoration. CoinGecko gives bitcoin a genuine rolling
 * twenty-four hours; Yahoo gives the others the range of the current trading
 * session, which on a Monday morning is twenty minutes long. Calling both
 * "24h" would be the kind of small lie this board exists not to tell, so the
 * window travels with the figures and the screen says which it is.
 *
 * `instrument` is set only when the range belongs to something other than the
 * price beside it, which happens for the metals: their spot source publishes
 * no range at all, so the range quoted is the COMEX contract's. Named, because
 * an unnamed futures range under a spot price is a different number pretending
 * to be the same one.
 */
type Range = {
  high: number;
  low: number;
  window: "24h" | "session";
  instrument?: string;
  /**
   * The move over the same window, from the same instrument as the range.
   *
   * Only set where that instrument is not the one the price came from — the
   * metals — because everywhere else it would be the quote's own `change`
   * repeated under a different name.
   */
  change?: number;
};

/**
 * Where an instrument was a week and a month ago.
 *
 * Not for drawing a chart -- the app draws none -- but for answering the one
 * question a customer in the bazaar actually asks, which is whether the rupee
 * price of a tola moved because gold moved or because the rupee did. That
 * needs the same two instruments over the same two windows, and nothing else.
 *
 * `last` is the series' own latest close, and every move is measured against
 * it rather than against the live spot price. The two come from different
 * sources for the metals -- spot from gold-api, history from the COMEX
 * contract -- and mixing them would put a roll gap and a source difference
 * into a figure presented as a market move.
 */
type Trail = {
  /** The instrument measured, where it is not the one the price came from. */
  instrument?: string;
  /** The series' own most recent close. */
  last: number;
  /** The close about seven days back, and about thirty. */
  week?: number;
  month?: number;
  /** When the trail was read, ISO. It is refetched hourly, not every poll. */
  at: string;
};

type Quote = {
  /** Price in US dollars. */
  usd: number;
  /** Move on the day, per cent, where the source gives one. */
  changePercent?: number;
  /**
   * The same move in the instrument's own units — dollars for the metals,
   * bitcoin and crude, index points for the dollar index.
   *
   * For everything but the metals it comes from the same quote as the price.
   * For the metals it cannot: spot is from gold-api, which publishes a price
   * and nothing else. See dayMove for how the metals get theirs.
   */
  change?: number;
  /** The high and the low, where the source publishes them. */
  range?: Range;
  /** Where this instrument was a week and a month ago. */
  trail?: Trail;
  /** When this figure was taken, ISO. */
  at: string;
};

type Board = {
  gold?: Quote;
  silver?: Quote;
  dollarIndex?: Quote;
  bitcoin?: Quote;
  crude?: Quote;
  /**
   * The interbank dollar, rupees to one US dollar.
   *
   * Not an instrument the board draws a row for -- the app has no row keyed to
   * it -- but it travels with the five because it is fetched the same way and
   * deserves the same treatment when it fails: the last good figure is kept
   * rather than dropped, since a conversion is better one refresh old than
   * absent.
   *
   * Interbank, which is what USDPKR=X quotes and what the website's gold page
   * already converts at. It is not the open-market rate a money changer in the
   * bazaar posts, and the app says so where it uses it.
   */
  usdPkr?: Quote;
};

async function get(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Yahoo answers a bare fetch with 403 often enough to be worth saying
        // who we are; the others do not care either way.
        "User-Agent": "AlMadinaJewellers/1 (+https://www.almadinajeweller.com)",
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** gold-api.com: one instrument per call, no key, spot in dollars an ounce. */
async function metal(symbol: "XAU" | "XAG"): Promise<Quote> {
  const body = (await get(`https://api.gold-api.com/price/${symbol}`)) as {
    price?: number;
    updatedAt?: string;
  };
  if (typeof body?.price !== "number") throw new Error(`${symbol}: no price in the answer`);
  return { usd: body.price, at: body.updatedAt ?? new Date().toISOString() };
}

export type YahooMeta = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  chartPreviousClose?: number;
  fulldayChange?: number;
};

/**
 * Yahoo's chart endpoint, which carries the last price, the day's move and the
 * session's high and low in its meta block. Unofficial, and treated as such:
 * if the shape changes this throws, the instrument keeps its previous figure,
 * and the board survives.
 */
async function yahooMeta(symbol: string): Promise<YahooMeta> {
  const body = (await get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
  )) as { chart?: { result?: Array<{ meta?: YahooMeta }> } };

  const meta = body?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`${symbol}: no meta in the answer`);
  return meta;
}

/**
 * The session range out of a meta block, or nothing.
 *
 * A high at or below its low is not a range, it is a source having a bad
 * morning, and it is dropped rather than drawn.
 */
function sessionRange(meta: YahooMeta): Range | undefined {
  const high = meta.regularMarketDayHigh;
  const low = meta.regularMarketDayLow;
  if (typeof high !== "number" || typeof low !== "number") return undefined;
  if (!(high > low)) return undefined;
  return { high, low, window: "session" };
}

/**
 * The move since the previous close, in the instrument's own units.
 *
 * Worked out from the price and the previous close rather than read from
 * Yahoo's own `fulldayChange`, so the figure is arithmetically consistent with
 * the price shown beside it. The two agreed to the last decimal on all four
 * instruments when this was written — gold -38.6, silver -0.434, crude 0.31,
 * the dollar index -0.019 — and `fulldayChange` stands in if the close is ever
 * missing.
 */
function sessionChange(meta: YahooMeta): number | undefined {
  const price = meta.regularMarketPrice;
  const close = meta.chartPreviousClose;
  if (typeof price === "number" && typeof close === "number") return price - close;
  return typeof meta.fulldayChange === "number" ? meta.fulldayChange : undefined;
}

/**
 * How long a trail stays good for.
 *
 * An hour, against the board's fifteen seconds. Where gold closed a month ago
 * does not change between two polls, and fetching three months of daily
 * candles four times a minute would be three extra upstream calls a poll for
 * a figure that moves once a day.
 */
const TRAIL_SECONDS = 3600;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily closes out of Yahoo's chart endpoint, oldest first, gaps dropped. */
async function yahooCloses(symbol: string): Promise<Array<{ at: number; close: number }>> {
  const body = (await get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`,
  )) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };

  const result = body?.chart?.result?.[0];
  const stamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(stamps) || !Array.isArray(closes)) {
    throw new Error(`${symbol}: no candles in the answer`);
  }

  const out: Array<{ at: number; close: number }> = [];
  for (let i = 0; i < stamps.length; i++) {
    const close = closes[i];
    if (typeof close === "number" && Number.isFinite(close) && close > 0) {
      out.push({ at: stamps[i] * 1000, close });
    }
  }
  return out;
}

/**
 * The close around a given day, as the middle of the three nearest to it.
 *
 * The median rather than the nearest single close, so that one bad candle
 * landing on the day being measured from cannot drag the figure on its own.
 * Used for the metals, whose COMEX series is sound.
 *
 * What it does not do is worth saying, because the rupee was once measured
 * this way and it was not enough. A median of three is powerless against a
 * series that is wrong half the time, which is what Yahoo's USDPKR=X turned
 * out to be, and a plausibility band would not have caught it either -- the
 * figure it produced was 3.3% in a week, which is a thing a currency can
 * genuinely do. The rupee's history comes from pkrOn below instead.
 */
function closeAround(
  series: Array<{ at: number; close: number }>,
  when: number,
): number | undefined {
  if (series.length === 0) return undefined;

  const near = [...series]
    .sort((a, b) => Math.abs(a.at - when) - Math.abs(b.at - when))
    .slice(0, 3);
  if (near.length === 0) return undefined;

  // Nothing within a fortnight of the day asked for is not that day's close.
  if (Math.abs(near[0].at - when) > 14 * DAY_MS) return undefined;

  const values = near.map((point) => point.close).sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

/**
 * A week and a month of an instrument, kept for an hour.
 *
 * `previous` is the trail the board already had. Reusing it inside the hour is
 * the whole reason this is cheap enough to run on a board four phones are
 * polling; a failure also falls back to it, so a trail outlives a bad fetch
 * the same way a price does.
 */
async function trailFor(
  symbol: string,
  instrument: string | undefined,
  previous: Trail | undefined,
): Promise<Trail | undefined> {
  if (previous && Date.now() - new Date(previous.at).getTime() < TRAIL_SECONDS * 1000) {
    return previous;
  }

  try {
    const series = await yahooCloses(symbol);
    const last = series[series.length - 1]?.close;
    if (typeof last !== "number") throw new Error(`${symbol}: no last close`);

    const now = Date.now();
    const week = closeAround(series, now - 7 * DAY_MS);
    const month = closeAround(series, now - 30 * DAY_MS);

    return {
      ...(instrument === undefined ? {} : { instrument }),
      last,
      ...(week === undefined ? {} : { week }),
      ...(month === undefined ? {} : { month }),
      at: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`market-rates: no trail for ${symbol}:`, error);
    return previous;
  }
}

async function yahoo(symbol: string): Promise<Quote> {
  const meta = await yahooMeta(symbol);
  if (typeof meta.regularMarketPrice !== "number") {
    throw new Error(`${symbol}: no price in the answer`);
  }

  return {
    usd: meta.regularMarketPrice,
    changePercent: meta.regularMarketChangePercent,
    change: sessionChange(meta),
    range: sessionRange(meta),
    at: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * The rupee's history, from a source that publishes it a day at a time.
 *
 * Not Yahoo. Its USDPKR=X daily series interleaves two feeds: it alternates
 * between about 268 and about 276.7 from one day to the next, which is not a
 * currency moving but a bad join, and it is wrong often enough that no
 * smoothing recovers it. Taken at face value on 8 November 2026 it had the
 * board ready to tell customers the rupee had moved 3.3% in a week when it had
 * barely moved at all.
 *
 * These are the free currency-api's dated builds on jsDelivr -- one file per
 * day, each stamped with the day it is for, and a plain 404 for a day that was
 * never published. That stamp is the point. A source that says which day a
 * figure belongs to can be checked; a bare series cannot, which is how the
 * Yahoo one passed for sound.
 */
const FX_DAY = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api";

/** How far back to walk when a day's file was never published. */
const FX_LOOKBACK_DAYS = 5;

/**
 * How long the whole rupee trail may spend upstream before it gives up.
 *
 * The walk back has to be sequential, because the next day is only tried on
 * finding the last one missing, and nothing bounds this handler as a whole. So
 * without a ceiling three walks of five misses apiece could hold the board for
 * the better part of a minute, and the board is what a phone is waiting for.
 * Four seconds is many times what the walk costs when the files are there --
 * one or two CDN hits -- so in the ordinary case this is never reached.
 *
 * Giving up early is cheap: the trail is refetched hourly and falls back to the
 * one already held, so the cost is an hour-old rupee figure, not a wrong one.
 */
const FX_BUDGET_MS = 4000;

/** yyyy-mm-dd, UTC, which is how the dated builds are named. */
function isoDay(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * The dollar in rupees on a given day, or on the last published day before it.
 *
 * Walking back is ordinary rather than a workaround: the current day's file
 * appears some hours into the day, and a weekend has no new rate to publish.
 * Each file is then required to say it is the day it was asked for, so a
 * request answered with something else -- a rolling tag, a redirect, a cached
 * body -- is refused instead of being quietly measured against.
 *
 * `until` is the wall clock the walk stops at, shared with the other two so
 * that the trail as a whole cannot outstay its welcome.
 */
async function pkrOn(when: number, until: number): Promise<number | undefined> {
  for (let back = 0; back <= FX_LOOKBACK_DAYS; back++) {
    if (Date.now() > until) return undefined;
    const day = isoDay(when - back * DAY_MS);

    let body: unknown;
    try {
      body = await get(`${FX_DAY}@${day}/v1/currencies/usd.json`);
    } catch {
      continue; // No file for that day; try the day before it.
    }

    const answer = body as { date?: string; usd?: { pkr?: number } };
    if (answer?.date !== day) continue;

    const rate = answer.usd?.pkr;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
    return rate;
  }
  return undefined;
}

/**
 * A week and a month of the rupee, kept for an hour like the metals' trail.
 *
 * `last` comes from this same series rather than from the live spot beside it,
 * for the reason the Trail type gives: a daily close and a live quote from two
 * different places differ a little, and measuring one against the other would
 * show that difference as a move the rupee made.
 */
async function rupeeTrail(previous: Trail | undefined): Promise<Trail | undefined> {
  if (previous && Date.now() - new Date(previous.at).getTime() < TRAIL_SECONDS * 1000) {
    return previous;
  }

  try {
    const now = Date.now();
    const until = now + FX_BUDGET_MS;
    const [last, week, month] = await Promise.all([
      pkrOn(now, until),
      pkrOn(now - 7 * DAY_MS, until),
      pkrOn(now - 30 * DAY_MS, until),
    ]);
    if (last === undefined) throw new Error("no published day for the rupee");
    /*
     * A `last` with nothing to compare it against is not a trail, and keeping
     * it would quietly replace an hour-old complete one with a useless new
     * one. Treated as a failure so the fallback below hands back what was held.
     */
    if (week === undefined && month === undefined) {
      throw new Error("no earlier day for the rupee to be measured against");
    }

    return {
      last,
      ...(week === undefined ? {} : { week }),
      ...(month === undefined ? {} : { month }),
      at: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("market-rates: no trail for the rupee:", error);
    return previous;
  }
}

/**
 * The currencies a customer can ask to see prices in, besides the rupee.
 *
 * Ten, chosen for who actually buys from a jeweller in Mandi Bahauddin from
 * abroad: the Gulf, where most of the town's remittances are earned, then
 * Britain, Europe and North America and Australia. The codes are the
 * currency-api's own, which are lower case. The app's list in
 * mobile/app/src/lib/settings.ts is the same ten; a code added to one belongs
 * in the other.
 */
export const FX_CODES = ["usd", "gbp", "eur", "aed", "sar", "qar", "kwd", "omr", "cad", "aud"];

/**
 * How many of each currency one US dollar buys, on a day the source names.
 *
 * Crosses against the dollar rather than rupees against each currency, and the
 * difference is the point. The app already holds a live interbank rupee, the
 * one the whole board converts at; a pound in rupees is that rupee times the
 * dollar's worth in pounds. Taking the rupee from here as well would put two
 * different rupees on one screen — Rs. 276.29 to the dollar beside a pound
 * worked out from 276.8 — and a customer comparing the two would be right to
 * distrust both.
 */
export type FxCrosses = {
  /** The day the figures are for, yyyy-mm-dd, as the source stamps it. */
  day: string;
  perUsd: Record<string, number>;
  /** When this function read them, ISO. Refetched hourly like a trail. */
  at: string;
};

/**
 * The crosses out of one dated file, or nothing.
 *
 * The file must say it is the day it was asked for, as with the rupee's
 * history. Each currency is checked on its own, and one that is missing or
 * not a positive number is left out rather than failing the rest; the app
 * then offers nothing for that currency and everything for the others. The
 * dollar itself is one by definition and is not read from the file.
 */
export function crossesFrom(body: unknown, day: string): Record<string, number> | null {
  const answer = body as { date?: unknown; usd?: Record<string, unknown> } | null;
  if (!answer || answer.date !== day || typeof answer.usd !== "object" || !answer.usd) {
    return null;
  }

  const perUsd: Record<string, number> = {};
  for (const code of FX_CODES) {
    if (code === "usd") {
      perUsd.usd = 1;
      continue;
    }
    const value = answer.usd[code];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) perUsd[code] = value;
  }

  // The dollar alone is no list of crosses.
  return Object.keys(perUsd).length > 1 ? perUsd : null;
}

/**
 * The day's crosses, kept for an hour.
 *
 * The same dated builds the rupee's history comes from, walked back the same
 * way to the last day that was published, and under the same budget. A
 * failure hands back what was held, so a currency outlives a bad fetch the
 * way a price does.
 */
async function currentCrosses(previous: FxCrosses | undefined): Promise<FxCrosses | undefined> {
  if (previous && Date.now() - new Date(previous.at).getTime() < TRAIL_SECONDS * 1000) {
    return previous;
  }

  const now = Date.now();
  const until = now + FX_BUDGET_MS;

  for (let back = 0; back <= FX_LOOKBACK_DAYS; back++) {
    if (Date.now() > until) break;
    const day = isoDay(now - back * DAY_MS);

    let body: unknown;
    try {
      body = await get(`${FX_DAY}@${day}/v1/currencies/usd.json`);
    } catch {
      continue; // No file for that day; try the day before it.
    }

    const perUsd = crossesFrom(body, day);
    if (perUsd) return { day, perUsd, at: new Date().toISOString() };
  }

  console.warn("market-rates: no currency crosses this time");
  return previous;
}

/** The rupee: Yahoo's live spot, which is sound, over its own daily history. */
async function rupeeWithTrail(symbol: string, previous: Quote | undefined): Promise<Quote> {
  const quote = await yahoo(symbol);
  const trail = await rupeeTrail(previous?.trail);
  if (trail) quote.trail = trail;
  return quote;
}

/**
 * The day's move for a metal, as a per cent and in spot dollars.
 *
 * Spot has no previous close anybody publishes free, so the move is the COMEX
 * contract's: its price against its own previous close, from the one meta
 * block, so the two are a consistent pair. A percentage carries across from
 * the contract to spot honestly — the front month and spot move together
 * through a session, and differ by a level, not by a rate of change.
 *
 * The cash figure is that percentage applied to the spot price on the board,
 * not the contract's own dollar move. The contract trades some dollars above
 * spot, so its move is a few cents larger, and printing it beside the spot
 * price would put two figures side by side that do not add up. Worked this
 * way, the price shown less the move shown is exactly where the same per cent
 * puts yesterday's spot.
 *
 * Nothing at all is returned when the contract's meta lacks either figure, and
 * the row then shows no move, which is what it showed before this existed.
 */
export function dayMove(
  spot: number,
  meta: YahooMeta,
): { changePercent: number; change: number } | null {
  const price = meta.regularMarketPrice;
  const close = meta.chartPreviousClose;
  if (typeof price !== "number" || typeof close !== "number") return null;
  if (!Number.isFinite(price) || !Number.isFinite(close) || close <= 0 || spot <= 0) return null;

  const ratio = price / close;
  // A session that moved more than a fifth is a bad answer, not a market.
  if (!(ratio > 0.8 && ratio < 1.2)) return null;

  return {
    changePercent: (ratio - 1) * 100,
    change: spot - spot / ratio,
  };
}

/**
 * A metal's spot price, with the matching COMEX contract's session range and
 * the day's move.
 *
 * Two calls, deliberately unequal. The price is the spot figure the board has
 * always shown, and a failure there fails the instrument; the range is a
 * courtesy from a second source, and a failure there costs only the range. The
 * contract is named on the way out so the screen can say whose range it is.
 */
async function metalWithRange(
  symbol: "XAU" | "XAG",
  contract: "GC=F" | "SI=F",
  previous: Quote | undefined,
): Promise<Quote> {
  const quote = await metal(symbol);

  try {
    const meta = await yahooMeta(contract);

    const move = dayMove(quote.usd, meta);
    if (move) {
      quote.changePercent = move.changePercent;
      quote.change = move.change;
    }

    const range = sessionRange(meta);
    if (range) {
      const change = sessionChange(meta);
      quote.range = {
        ...range,
        instrument: `COMEX ${contract}`,
        ...(change === undefined ? {} : { change }),
      };
    }
  } catch (error) {
    console.warn(`market-rates: no range for ${symbol} from ${contract}:`, error);
  }

  /*
   * The trail comes from the contract too, for the same reason the range
   * does: spot has no history anybody publishes free, and the contract has
   * three months of it. Named on the way out, so the screen can say whose.
   */
  const trail = await trailFor(contract, `COMEX ${contract}`, previous?.trail);
  if (trail) quote.trail = trail;

  return quote;
}

/**
 * CoinGecko's free endpoints. Sends CORS headers, unlike the others, but it
 * comes along for the ride so the whole board has one timestamp and one cache.
 *
 * Two of them, in order of what they carry. `coins/markets` adds the rolling
 * twenty-four hour high and low; `simple/price` does not, and is kept as the
 * floor, because a bitcoin price with no range beats no bitcoin price.
 */
async function bitcoin(): Promise<Quote> {
  try {
    const rows = (await get(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin",
    )) as Array<{
      current_price?: number;
      price_change_percentage_24h?: number;
      price_change_24h?: number;
      high_24h?: number;
      low_24h?: number;
      last_updated?: string;
    }>;

    const row = rows?.[0];
    if (typeof row?.current_price !== "number") throw new Error("no price in the answer");

    const high = row.high_24h;
    const low = row.low_24h;

    return {
      usd: row.current_price,
      changePercent: row.price_change_percentage_24h,
      change: row.price_change_24h,
      range:
        typeof high === "number" && typeof low === "number" && high > low
          ? { high, low, window: "24h" }
          : undefined,
      at: row.last_updated ?? new Date().toISOString(),
    };
  } catch (error) {
    console.warn("market-rates: bitcoin markets call failed, falling back:", error);
  }

  const body = (await get(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
  )) as { bitcoin?: { usd?: number; usd_24h_change?: number } };

  if (typeof body?.bitcoin?.usd !== "number") throw new Error("bitcoin: no price in the answer");
  return {
    usd: body.bitcoin.usd,
    changePercent: body.bitcoin.usd_24h_change,
    at: new Date().toISOString(),
  };
}

/**
 * Every instrument, in parallel, none able to fail the rest.
 *
 * `previous` is what was on the board before. An instrument that will not
 * answer keeps its old figure and its old timestamp, which the app shows as
 * what it is: a number from earlier.
 */
async function fetchBoard(previous: Board): Promise<Board> {
  const work = {
    gold: metalWithRange("XAU", "GC=F", previous.gold),
    silver: metalWithRange("XAG", "SI=F", previous.silver),
    dollarIndex: yahoo("DX-Y.NYB"),
    bitcoin: bitcoin(),
    crude: yahoo("CL=F"),
    usdPkr: rupeeWithTrail("USDPKR=X", previous.usdPkr),
  } satisfies Record<keyof Board, Promise<Quote>>;

  const names = Object.keys(work) as Array<keyof Board>;
  const settled = await Promise.allSettled(names.map((name) => work[name]));

  const board: Board = {};
  names.forEach((name, i) => {
    const outcome = settled[i];
    if (outcome.status === "fulfilled") {
      board[name] = outcome.value;
      return;
    }
    console.warn(`market-rates: ${name} failed:`, outcome.reason?.message ?? outcome.reason);
    const kept = previous[name];
    if (kept) board[name] = kept;
  });

  return board;
}

/**
 * A release the calendar lists.
 *
 * Only high and medium impact survive the fetch. The feed's "Low" rows are the
 * bulk of it — sixty of seventy-odd in the week this was written — and its
 * "Holiday" rows are daylight-saving notices. Dropping them here rather than in
 * the app keeps the payload at a kilobyte or two, which matters when every
 * phone on the rate screen collects it four times a minute.
 */
type CalendarEvent = {
  title: string;
  /** The currency the release belongs to, as the feed codes it: "USD", "EUR". */
  currency: string;
  /** Release time, ISO, carrying the feed's own offset — US Eastern. */
  at: string;
  impact: "High" | "Medium";
  forecast?: string;
  previous?: string;
};

/**
 * A week of releases, and which week it is.
 *
 * The span matters as much as the events. Two days in seven have no releases at
 * all, and without a stated span the app cannot tell "nothing is scheduled
 * today" from "today is not in this feed" — the first is worth saying and the
 * second is worth saying nothing about.
 *
 * `triedAt` is the last attempt; `fetchedAt` the last one that worked. They
 * part company exactly when the feed refuses us, which is what they are for:
 * the events already in hand go on being served, and nothing asks again for
 * another quarter of an hour.
 */
type Calendar = {
  events: CalendarEvent[];
  from?: string;
  to?: string;
  fetchedAt?: string;
  triedAt: string;
};

/**
 * The Sunday-to-Saturday week, in the feed's own timezone, that "thisweek"
 * means at this moment.
 *
 * Taken from the clock rather than from the rows, because a week whose Sunday
 * has no releases still covers Sunday — and a span inferred from the earliest
 * row would quietly shorten itself to Monday and make the app go silent on a
 * day it has a true answer for.
 */
function calendarWeek(now: Date): { from: string; to: string } {
  const eastern = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const day = new Date(`${eastern}T00:00:00Z`);
  const sunday = new Date(day);
  sunday.setUTCDate(day.getUTCDate() - day.getUTCDay());
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);

  return {
    from: sunday.toISOString().slice(0, 10),
    to: saturday.toISOString().slice(0, 10),
  };
}

type FeedRow = {
  title?: unknown;
  country?: unknown;
  date?: unknown;
  impact?: unknown;
  forecast?: unknown;
  previous?: unknown;
};

async function fetchCalendar(): Promise<Calendar> {
  // A refusal arrives as 429 with an HTML body, and `get` throws on the status
  // before anything tries to read that as JSON.
  const rows = await get(CALENDAR_FEED);
  if (!Array.isArray(rows)) throw new Error("the calendar feed was not a list");

  const week = calendarWeek(new Date());
  let { from, to } = week;
  const events: CalendarEvent[] = [];

  for (const row of rows as FeedRow[]) {
    const at = typeof row.date === "string" ? row.date : "";
    const day = at.slice(0, 10);

    // The span comes from the clock, but a row outside it widens the span
    // rather than being quietly disowned.
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      if (day < from) from = day;
      if (day > to) to = day;
    }

    if (row.impact !== "High" && row.impact !== "Medium") continue;

    const title = typeof row.title === "string" ? row.title.trim() : "";
    const currency = typeof row.country === "string" ? row.country.trim() : "";
    if (!title || !currency || Number.isNaN(Date.parse(at))) continue;

    // The feed sends "" for a release with no published forecast, and an empty
    // string on a screen is a gap where a figure should be. Absent instead.
    const forecast = typeof row.forecast === "string" ? row.forecast.trim() : "";
    const previous = typeof row.previous === "string" ? row.previous.trim() : "";

    events.push({
      title,
      currency,
      at,
      impact: row.impact,
      ...(forecast ? { forecast } : {}),
      ...(previous ? { previous } : {}),
    });
  }

  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const stamp = new Date().toISOString();
  return { events, from, to, fetchedAt: stamp, triedAt: stamp };
}

/**
 * The calendar to answer with, which is never a reason to fail.
 *
 * The board of prices is the job; the day's releases are a note beside it. So
 * every way this can go wrong ends in the same place — the events already held,
 * or none at all — and the prices are untouched either way.
 */
async function currentCalendar(previous: Calendar | undefined): Promise<Calendar | undefined> {
  const tried = previous ? Date.parse(previous.triedAt) : Number.NaN;
  const since = Number.isNaN(tried) ? Infinity : (Date.now() - tried) / 1000;
  if (previous && since < CALENDAR_SECONDS) return previous;

  try {
    return await fetchCalendar();
  } catch (error) {
    console.warn("market-rates: no calendar this time:", error);

    /*
     * The attempt is recorded although it failed, which is the point of
     * recording it: a feed that refused us ten seconds ago must not be asked
     * again on the next request. Whatever we held goes on being served — and
     * since the app picks today's rows out of a week by date, a list that has
     * gone stale stops offering anything rather than offering the wrong day.
     *
     * A first attempt that fails leaves an empty calendar with no span, which
     * the app reads as "this instrument has nothing to say today".
     */
    return { ...(previous ?? { events: [] }), triedAt: new Date().toISOString() };
  }
}

/**
 * The calendar as a phone sees it. `triedAt` is this function's own bookkeeping
 * about a feed's temper and has nothing to say to the app.
 */
function published(calendar: Calendar | undefined) {
  if (!calendar) return {};

  return {
    calendar: {
      events: calendar.events,
      ...(calendar.from ? { from: calendar.from } : {}),
      ...(calendar.to ? { to: calendar.to } : {}),
      ...(calendar.fetchedAt ? { fetchedAt: calendar.fetchedAt } : {}),
    },
  };
}

/**
 * What the cache row holds.
 *
 * The board and the calendar refresh on clocks fifteen seconds and fifteen
 * minutes apart, so they are stored together in the one row and aged
 * separately. Earlier deployments stored the board alone at the top level, and
 * a row left behind by one of those is still read correctly — four lines, where
 * the alternative is a deploy that drops the board on the floor until the next
 * fetch lands.
 */
type Stored = { board: Board; calendar?: Calendar; fx?: FxCrosses };

function stored(payload: unknown): Stored {
  if (payload && typeof payload === "object" && "board" in payload) {
    const held = payload as { board?: unknown; calendar?: unknown; fx?: unknown };
    return {
      board: (held.board ?? {}) as Board,
      ...(held.calendar ? { calendar: held.calendar as Calendar } : {}),
      ...(held.fx ? { fx: held.fx as FxCrosses } : {}),
    };
  }

  return { board: (payload ?? {}) as Board };
}

type CacheRow = { payload: unknown; fetched_at: string };

async function readCache(): Promise<CacheRow | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;

  try {
    const response = await fetch(
      `${url}/rest/v1/market_snapshot?select=payload,fetched_at&id=eq.true`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as CacheRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function writeCache(payload: Stored): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/market_snapshot?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: true, payload, fetched_at: new Date().toISOString() }),
    });
  } catch (error) {
    // The caller still has a board to answer with. A cache that would not
    // write costs an extra upstream call next time, and nothing else.
    console.warn("market-rates: could not write the cache:", error);
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });

    const cached = await readCache();
    const held = stored(cached?.payload);
    const age = cached ? (Date.now() - new Date(cached.fetched_at).getTime()) / 1000 : Infinity;

    if (cached && age < CACHE_SECONDS) {
      return json({
        board: held.board,
        ...published(held.calendar),
        ...(held.fx ? { fx: held.fx } : {}),
        fetchedAt: cached.fetched_at,
        cached: true,
      });
    }

    /*
     * Together, because they are two different upstreams and neither should
     * wait for the other — and `currentCalendar` cannot throw, so the board is
     * never at risk from a calendar that is down or has had enough of us.
     */
    /*
     * The crosses go alongside on their own hourly clock, and like the
     * calendar they cannot throw: a currency that will not load costs the app
     * that currency, never the board.
     */
    const [board, calendar, fx] = await Promise.all([
      fetchBoard(held.board),
      currentCalendar(held.calendar),
      currentCrosses(held.fx),
    ]);

    // Nothing answered and nothing was kept: say so rather than returning an
    // empty board that reads like five instruments worth nothing.
    if (Object.keys(board).length === 0) {
      return json({ error: "no market data available" }, 503);
    }

    await writeCache({ board, ...(calendar ? { calendar } : {}), ...(fx ? { fx } : {}) });
    return json({
      board,
      ...published(calendar),
      ...(fx ? { fx } : {}),
      fetchedAt: new Date().toISOString(),
      cached: false,
    });
  },
};
