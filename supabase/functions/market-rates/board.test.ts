import { describe, expect, test } from "vitest";

import {
  DXY_WEIGHTS,
  FX_CODES,
  crossesFrom,
  dayMove,
  dollarIndexFrom,
  due,
  effrFrom,
  fedFundsContracts,
  swissquoteMid,
} from "./index.ts";

/**
 * The two pieces of the board that are arithmetic rather than fetching: the
 * metals' day move, and the currencies a price can be read in. Both decide a
 * figure a customer sees, and both must say nothing rather than something
 * wrong when the source gives them too little to go on.
 */
describe("a metal's day move", () => {
  test("is the contract's per cent, applied to spot", () => {
    // COMEX up 1% on the day; spot is a little under the contract.
    const move = dayMove(3883, { regularMarketPrice: 3939.9, chartPreviousClose: 3900.9 });

    expect(move?.changePercent).toBeCloseTo(0.99977, 4);
    // The move in spot dollars, so price less move is yesterday's spot at
    // the same per cent — not the contract's own 39 dollars.
    expect(move?.change).toBeCloseTo(3883 - 3883 / (3939.9 / 3900.9), 6);
    expect(move?.change).toBeLessThan(39);
  });

  test("falls with the market as well as rising", () => {
    const move = dayMove(48.83, { regularMarketPrice: 49.1, chartPreviousClose: 50.0 });
    expect(move?.changePercent).toBeCloseTo(-1.8, 6);
    expect(move?.change).toBeLessThan(0);
  });

  test("is nothing when the contract gives no previous close", () => {
    expect(dayMove(3883, { regularMarketPrice: 3939.9 })).toBeNull();
    expect(dayMove(3883, { chartPreviousClose: 3900.9 })).toBeNull();
    expect(dayMove(3883, {})).toBeNull();
  });

  test("is nothing for an answer no market produces", () => {
    expect(dayMove(3883, { regularMarketPrice: 3939.9, chartPreviousClose: 0 })).toBeNull();
    expect(dayMove(3883, { regularMarketPrice: 7800, chartPreviousClose: 3900 })).toBeNull();
    expect(dayMove(3883, { regularMarketPrice: Number.NaN, chartPreviousClose: 3900 })).toBeNull();
    expect(dayMove(0, { regularMarketPrice: 3939.9, chartPreviousClose: 3900.9 })).toBeNull();
  });
});

describe("the currency crosses out of a dated file", () => {
  const file = {
    date: "2026-11-13",
    usd: {
      pkr: 276.95,
      gbp: 0.7559,
      eur: 0.9043,
      aed: 3.6725,
      sar: 3.75,
      qar: 3.64,
      kwd: 0.3114,
      omr: 0.3848,
      cad: 1.4261,
      aud: 1.4715,
      jpy: 154.2,
    },
  };

  test("are the ten currencies and nothing else", () => {
    const crosses = crossesFrom(file, "2026-11-13");
    expect(Object.keys(crosses ?? {}).sort()).toEqual([...FX_CODES].sort());
    expect(crosses?.gbp).toBe(0.7559);
    // Not the rupee: the app crosses its own live interbank rupee with these.
    expect(crosses).not.toHaveProperty("pkr");
  });

  test("count the dollar as one, whatever the file says", () => {
    expect(crossesFrom({ ...file, usd: { ...file.usd, usd: 2 } }, "2026-11-13")?.usd).toBe(1);
  });

  test("are refused when the file is for a different day", () => {
    expect(crossesFrom(file, "2026-11-14")).toBeNull();
    expect(crossesFrom({ ...file, date: undefined }, "2026-11-13")).toBeNull();
  });

  test("leave out a currency that is not a rate, and keep the rest", () => {
    const crosses = crossesFrom(
      { ...file, usd: { ...file.usd, kwd: 0, omr: "0.38", cad: Number.NaN } },
      "2026-11-13",
    );
    expect(crosses).not.toHaveProperty("kwd");
    expect(crosses).not.toHaveProperty("omr");
    expect(crosses).not.toHaveProperty("cad");
    expect(crosses?.gbp).toBe(0.7559);
  });

  test("are nothing when only the dollar is left", () => {
    expect(crossesFrom({ date: "2026-11-13", usd: { pkr: 277 } }, "2026-11-13")).toBeNull();
    expect(crossesFrom(null, "2026-11-13")).toBeNull();
    expect(crossesFrom("nonsense", "2026-11-13")).toBeNull();
  });
});

/**
 * The clock that keeps CoinGecko on fifteen seconds while the rest of the
 * board refreshes every five.
 */
describe("whether a clock is due", () => {
  const now = Date.parse("2026-11-17T12:00:15Z");

  test("is due when it has never been read", () => {
    expect(due(undefined, 15, now)).toBe(true);
  });

  test("is due when the stored time cannot be read", () => {
    expect(due("not a time", 15, now)).toBe(true);
  });

  test("is not due before its seconds have run", () => {
    expect(due("2026-11-17T12:00:05Z", 15, now)).toBe(false);
  });

  test("is due once its seconds have run", () => {
    expect(due("2026-11-17T12:00:00Z", 15, now)).toBe(true);
  });
});

/**
 * Swissquote's spot quote, which the metals now come from. Its answer is one
 * entry per platform with a bid and ask per spread profile; the shape below
 * is cut down from a real answer of 17 November 2026.
 */
describe("a Swissquote quote", () => {
  const answer = [
    {
      topo: { platform: "SwissquoteLtd", server: "Live5" },
      spreadProfilePrices: [
        {
          spreadProfile: "premium",
          bidSpread: 25.6,
          askSpread: 25.6,
          bid: 3863.104,
          ask: 3863.766,
        },
        { spreadProfile: "elite", bidSpread: 17.7, askSpread: 17.7, bid: 3863.183, ask: 3863.687 },
      ],
      ts: 1794938540090,
    },
  ];

  test("is the middle of the bid and the ask", () => {
    expect(swissquoteMid(answer)?.usd).toBeCloseTo(3863.435, 6);
  });

  test("is stamped with the feed's own time", () => {
    expect(swissquoteMid(answer)?.at).toBe(new Date(1794938540090).toISOString());
  });

  test("skips a profile that is not a real two-sided price", () => {
    const crossed = [
      {
        spreadProfilePrices: [
          { bid: 3864, ask: 3863 },
          { bid: null, ask: 3863 },
          { bid: 47.42, ask: 47.44 },
        ],
      },
    ];
    expect(swissquoteMid(crossed)?.usd).toBeCloseTo(47.43, 6);
  });

  test("is nothing for an empty or unreadable answer, so the metal falls back", () => {
    expect(swissquoteMid([])).toBeNull();
    expect(swissquoteMid(null)).toBeNull();
    expect(swissquoteMid({ error: "nope" })).toBeNull();
    expect(swissquoteMid([{ spreadProfilePrices: [{ bid: 0, ask: 0 }] }])).toBeNull();
  });
});

/**
 * The dollar index, computed from its own definition. The rates below are
 * TradingView's FX quotes of 17 November 2026, a moment when its live USDX
 * stood at 103.390.
 */
describe("the dollar index from six rates", () => {
  const rates = {
    "EUR/USD": 1.10216,
    "USD/JPY": 159.245,
    "GBP/USD": 1.3226,
    "USD/CAD": 1.42788,
    "USD/SEK": 10.095,
    "USD/CHF": 0.83864,
  };

  test("lands within two hundredths of the live index", () => {
    const index = dollarIndexFrom(rates);
    expect(index).not.toBeNull();
    expect(Math.abs((index ?? 0) - 103.39)).toBeLessThan(0.02);
  });

  test("weights add up to the whole basket", () => {
    const total = Object.values(DXY_WEIGHTS).reduce((sum, w) => sum + Math.abs(w), 0);
    expect(total).toBeCloseTo(1, 10);
  });

  test("rises when the euro falls, because a cheaper euro is a dearer dollar", () => {
    const base = dollarIndexFrom(rates) ?? 0;
    const weakerEuro = dollarIndexFrom({ ...rates, "EUR/USD": 1.09 }) ?? 0;
    expect(weakerEuro).toBeGreaterThan(base);
  });

  test("rises when the yen falls against the dollar", () => {
    const base = dollarIndexFrom(rates) ?? 0;
    const dearerDollar = dollarIndexFrom({ ...rates, "USD/JPY": 161 }) ?? 0;
    expect(dearerDollar).toBeGreaterThan(base);
  });

  test("is nothing when a rate is missing, so the board falls back to Yahoo", () => {
    const { "USD/SEK": _missing, ...five } = rates;
    expect(dollarIndexFrom(five)).toBeNull();
    expect(dollarIndexFrom({ ...rates, "USD/CHF": 0 })).toBeNull();
    expect(dollarIndexFrom({ ...rates, "EUR/USD": Number.NaN })).toBeNull();
  });
});

describe("the Fed block", () => {
  // The New York Fed's answer, as it came back on 18 November 2026.
  const answer = {
    refRates: [
      {
        effectiveDate: "2026-11-17",
        type: "EFFR",
        percentRate: 3.88,
        targetRateFrom: 3.75,
        targetRateTo: 4.0,
        volumeInBillions: 95,
      },
    ],
  };

  test("reads the target range and effective rate from the New York Fed", () => {
    expect(effrFrom(answer)).toEqual({ from: 3.75, to: 4.0, effr: 3.88, day: "2026-11-17" });
  });

  test("refuses an answer that is not the shape it publishes", () => {
    expect(effrFrom(null)).toBeNull();
    expect(effrFrom({ refRates: [] })).toBeNull();
    expect(effrFrom({ refRates: [{ ...answer.refRates[0], targetRateTo: "4.00" }] })).toBeNull();
    expect(effrFrom({ refRates: [{ ...answer.refRates[0], targetRateTo: 3.5 }] })).toBeNull();
    expect(
      effrFrom({ refRates: [{ ...answer.refRates[0], effectiveDate: "yesterday" }] }),
    ).toBeNull();
  });

  test("names the next four Fed Funds contracts as Yahoo spells them", () => {
    expect(fedFundsContracts(new Date("2026-11-18T12:00:00Z"))).toEqual([
      { month: "2026-11", symbol: "ZQX26.CBT" },
      { month: "2026-12", symbol: "ZQZ26.CBT" },
      { month: "2027-01", symbol: "ZQF27.CBT" },
      { month: "2027-02", symbol: "ZQG27.CBT" },
    ]);
  });
});
