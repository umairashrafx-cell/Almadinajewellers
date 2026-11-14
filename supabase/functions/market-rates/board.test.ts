import { describe, expect, test } from "vitest";

import { FX_CODES, crossesFrom, dayMove } from "./index.ts";

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
