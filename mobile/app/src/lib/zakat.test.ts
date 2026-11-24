import { describe, expect, test } from "vitest";

import { FALLBACK_SNAPSHOT, TOLA_IN_GRAMS, sellingRateFor, type RateSnapshot } from "@/lib/rates";

import {
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  readAmount,
  zakatFor,
  type ZakatInput,
} from "./zakat";

/** A board shaped like the shop's, with figures easy to check by hand. */
const BOARD: RateSnapshot = {
  date: "2026-11-24",
  rates: [
    { karat: "24K", perTola: 394000, perGram: 33780 },
    { karat: "23.65K", perTola: 388000, perGram: 33265 },
    { karat: "22K", perTola: 355500, perGram: 30479 },
    { karat: "999", perTola: 5000, perGram: 429 },
  ],
};

const NOTHING: ZakatInput = {
  gold: [],
  silver: { amount: 0, unit: "tola" },
  cash: 0,
  savings: 0,
  stock: 0,
  owed: 0,
  debts: 0,
};

function zakat(input: Partial<ZakatInput>, board: RateSnapshot = BOARD) {
  const result = zakatFor(board, { ...NOTHING, ...input });
  if (!result) throw new Error("expected a result");
  return result;
}

describe("the nisab", () => {
  test("is 7.5 tola and 52.5 tola, to the hundredth of a gram", () => {
    expect(GOLD_NISAB_GRAMS).toBeCloseTo(7.5 * TOLA_IN_GRAMS, 2);
    expect(SILVER_NISAB_GRAMS).toBeCloseTo(52.5 * TOLA_IN_GRAMS, 1);
  });

  test("for gold alone is 7.5 tola of it, whatever its purity", () => {
    const at = zakat({ gold: [{ amount: 7.5, unit: "tola", purity: "22K" }] });
    expect(at.nisab).toMatchObject({ basis: "gold-only", metal: "gold" });
    expect(at.goldValue).toBe(2_666_250);
    expect(at.meetsNisab).toBe(true);
    // 2,666,250 / 40 = 66,656.25, rounded up.
    expect(at.zakat).toBe(66_657);

    const under = zakat({ gold: [{ amount: 7, unit: "tola", purity: "22K" }] });
    expect(under.meetsNisab).toBe(false);
    expect(under.zakat).toBe(0);
  });

  test("for gold alone agrees in grams and in tola", () => {
    const grams = zakat({ gold: [{ amount: GOLD_NISAB_GRAMS, unit: "g", purity: "22K" }] });
    expect(grams.meetsNisab).toBe(true);

    const justUnder = zakat({ gold: [{ amount: 87.4, unit: "g", purity: "18K" }] });
    expect(justUnder.meetsNisab).toBe(false);
  });

  test("is silver's as soon as anything sits beside the gold", () => {
    const mixed = zakat({ gold: [{ amount: 7, unit: "tola", purity: "22K" }], cash: 50_000 });
    expect(mixed.nisab).toMatchObject({ basis: "mixed", metal: "silver" });
    // 52.5 tola × Rs. 5,000.
    expect(mixed.nisab.value).toBe(262_500);
    // Seven tola alone owed nothing; with the cash beside it, it does.
    expect(mixed.net).toBe(2_538_500);
    expect(mixed.zakat).toBe(63_463);
  });

  test("of silver applies to cash on its own", () => {
    expect(zakat({ cash: 300_000 }).zakat).toBe(7_500);
    expect(zakat({ cash: 200_000 }).zakat).toBe(0);
    expect(zakat({ silver: { amount: 52.5, unit: "tola" } }).meetsNisab).toBe(true);
  });

  test("falls back to gold, and says so, when the board has no silver rate", () => {
    const noSilver: RateSnapshot = {
      ...BOARD,
      rates: BOARD.rates.filter((r) => r.karat !== "999"),
    };
    const result = zakat({ cash: 300_000 }, noSilver);
    expect(result.nisab).toMatchObject({ basis: "no-silver-rate", metal: "gold" });
    // 7.5 tola at the jewellery rate is far above three lakh.
    expect(result.nisab.value).toBe(7.5 * 355_500);
    expect(result.zakat).toBe(0);
  });
});

describe("the sum", () => {
  test("adds every kind of wealth and takes off what is owed", () => {
    const result = zakat({
      gold: [
        { amount: 2, unit: "tola", purity: "22K" },
        { amount: 1, unit: "tola", purity: "24K" },
      ],
      silver: { amount: 10, unit: "tola" },
      cash: 100_000,
      savings: 200_000,
      stock: 50_000,
      owed: 25_000,
      debts: 75_000,
    });

    expect(result.goldValue).toBe(2 * 355_500 + 394_000);
    expect(result.silverValue).toBe(50_000);
    expect(result.moneyValue).toBe(375_000);
    expect(result.total).toBe(1_105_000 + 50_000 + 375_000);
    expect(result.net).toBe(1_530_000 - 75_000);
    expect(result.zakat).toBe(1_455_000 / 40);
  });

  test("is a fortieth exactly on a round figure", () => {
    expect(zakat({ cash: 400_000 }).zakat).toBe(10_000);
  });

  test("lets debts take the wealth under the nisab, never below nothing", () => {
    const owing = zakat({ gold: [{ amount: 7.5, unit: "tola", purity: "22K" }], debts: 100_000 });
    expect(owing.nisab.basis).toBe("gold-only");
    expect(owing.meetsNisab).toBe(false);

    const underwater = zakat({ cash: 10_000, debts: 50_000 });
    expect(underwater.net).toBe(0);
    expect(underwater.zakat).toBe(0);
  });

  test("prices a purity off the board the way the gold calculator does", () => {
    const result = zakat({ gold: [{ amount: 1, unit: "tola", purity: "21K" }] });
    expect(result.goldValue).toBe(sellingRateFor(BOARD, "21K")?.perTola);
  });

  test("counts a purity it cannot price rather than inventing a rate", () => {
    const result = zakat({
      gold: [
        { amount: 1, unit: "tola", purity: "25K" },
        { amount: 1, unit: "tola", purity: "22K" },
      ],
    });
    expect(result.unpriced).toBe(1);
    expect(result.goldValue).toBe(355_500);
  });

  test("is nothing on an empty form", () => {
    const result = zakat({});
    expect(result.total).toBe(0);
    expect(result.meetsNisab).toBe(false);
    expect(result.zakat).toBe(0);
  });

  test("is not worked from the fallback board", () => {
    expect(zakatFor(FALLBACK_SNAPSHOT, { ...NOTHING, cash: 1_000_000 })).toBeUndefined();
    expect(zakatFor(undefined, NOTHING)).toBeUndefined();
  });
});

describe("a figure typed into the form", () => {
  test("reads rupees written with commas", () => {
    expect(readAmount("1,50,000")).toBe(150_000);
    expect(readAmount(" 2.5 ")).toBe(2.5);
  });

  test("is nothing when empty, negative or not a number", () => {
    expect(readAmount("")).toBe(0);
    expect(readAmount("-5")).toBe(0);
    expect(readAmount("abc")).toBe(0);
  });
});
