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

/** How long a fetched board stays good. Five minutes is finer than anyone
 *  walking into a jeweller's needs, and keeps us far inside every free tier. */
const CACHE_SECONDS = 300;

/** Nothing upstream is allowed to hold the whole board up. */
const UPSTREAM_TIMEOUT_MS = 8000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Quote = {
  /** Price in US dollars. */
  usd: number;
  /** Move on the day, per cent, where the source gives one. */
  changePercent?: number;
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

/**
 * Yahoo's chart endpoint, which carries the last price and the day's move in
 * its meta block. Unofficial, and treated as such: if the shape changes this
 * throws, the instrument keeps its previous figure, and the board survives.
 */
async function yahoo(symbol: string): Promise<Quote> {
  const body = (await get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
  )) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          regularMarketChangePercent?: number;
          regularMarketTime?: number;
        };
      }>;
    };
  };

  const meta = body?.chart?.result?.[0]?.meta;
  if (typeof meta?.regularMarketPrice !== "number") {
    throw new Error(`${symbol}: no price in the answer`);
  }

  return {
    usd: meta.regularMarketPrice,
    changePercent: meta.regularMarketChangePercent,
    at: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
  };
}

/** CoinGecko's free endpoint. Sends CORS headers, unlike the others, but it
 *  comes along for the ride so the whole board has one timestamp and one cache. */
async function bitcoin(): Promise<Quote> {
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
    gold: metal("XAU"),
    silver: metal("XAG"),
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
    const response = await fetch(`${url}/rest/v1/market_snapshot?select=payload,fetched_at&id=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
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
