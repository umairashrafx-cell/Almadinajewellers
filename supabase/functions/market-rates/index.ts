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

type Quote = {
  /** Price in US dollars. */
  usd: number;
  /** Move on the day, per cent, where the source gives one. */
  changePercent?: number;
  /**
   * The same move in the instrument's own units — dollars for the metals,
   * bitcoin and crude, index points for the dollar index. Set only where it
   * comes from the same quote as the price.
   */
  change?: number;
  /** The high and the low, where the source publishes them. */
  range?: Range;
  /** When this figure was taken, ISO. */
  at: string;
};

type Board = {
  gold?: Quote;
  silver?: Quote;
  dollarIndex?: Quote;
  bitcoin?: Quote;
  crude?: Quote;
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

type YahooMeta = {
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
 * A metal's spot price, with the matching COMEX contract's session range.
 *
 * Two calls, deliberately unequal. The price is the spot figure the board has
 * always shown, and a failure there fails the instrument; the range is a
 * courtesy from a second source, and a failure there costs only the range. The
 * contract is named on the way out so the screen can say whose range it is.
 */
async function metalWithRange(symbol: "XAU" | "XAG", contract: "GC=F" | "SI=F"): Promise<Quote> {
  const quote = await metal(symbol);

  try {
    const meta = await yahooMeta(contract);
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
    gold: metalWithRange("XAU", "GC=F"),
    silver: metalWithRange("XAG", "SI=F"),
    dollarIndex: yahoo("DX-Y.NYB"),
    bitcoin: bitcoin(),
    crude: yahoo("CL=F"),
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

type CacheRow = { payload: Board; fetched_at: string };

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

async function writeCache(payload: Board): Promise<void> {
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
    const age = cached ? (Date.now() - new Date(cached.fetched_at).getTime()) / 1000 : Infinity;

    if (cached && age < CACHE_SECONDS) {
      return json({ board: cached.payload, fetchedAt: cached.fetched_at, cached: true });
    }

    const board = await fetchBoard(cached?.payload ?? {});

    // Nothing answered and nothing was kept: say so rather than returning an
    // empty board that reads like five instruments worth nothing.
    if (Object.keys(board).length === 0) {
      return json({ error: "no market data available" }, 503);
    }

    await writeCache(board);
    return json({ board, fetchedAt: new Date().toISOString(), cached: false });
  },
};
