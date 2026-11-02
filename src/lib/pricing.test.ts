import { describe, expect, test } from "vitest";

import {
  listedWeightG,
  livePriceFor,
  liveSalePrice,
  pricedWeightFor,
  tracksMetalRate,
  type PriceParts,
} from "@/lib/pricing";
import { TOLA_IN_GRAMS, type RateSnapshot } from "@/lib/rates";

const BOARD: RateSnapshot = {
  date: "2026-11-02",
  rates: [
    { karat: "24K", perTola: 409500, perGram: 35109 },
    { karat: "23.65K", perTola: 403500, perGram: 34594 },
    { karat: "22K", perTola: 370000, perGram: 31722 },
  ],
};

/** A ring: ten grams of 22K, half a gram of polish per tola, making in rupees. */
const RING: PriceParts = {
  metal: "gold",
  karat: "22K",
  netWeightG: 10,
  polishGPerTola: 0.5,
  makingChargesPkr: 15000,
  stoneValuePkr: 0,
};

describe("the weight the rate is charged on", () => {
  test("adds polish by the tola", () => {
    // 10 g is 0.857 tola, so half a gram of polish per tola is 0.429 g.
    expect(pricedWeightFor(10, 0.5)).toBe(10.429);
  });

  test("is the net weight when there is no polish", () => {
    expect(pricedWeightFor(10, 0)).toBe(10);
    expect(pricedWeightFor(10, null)).toBe(10);
    expect(pricedWeightFor(10)).toBe(10);
  });

  test("keeps three decimals, the way a scale reads", () => {
    expect(pricedWeightFor(7.777, 0.37)).toBe(
      Math.round((7.777 + (7.777 / TOLA_IN_GRAMS) * 0.37) * 1000) / 1000,
    );
    expect(String(pricedWeightFor(7.777, 0.37)).split(".")[1]?.length).toBeLessThanOrEqual(3);
  });

  test("shows the priced weight in a listing when it is known", () => {
    expect(listedWeightG({ grossWeightG: 11.2, pricedWeightG: 10.429 })).toBe(10.429);
    // Gross includes the stones, which are not gold and not priced by weight.
    expect(listedWeightG({ grossWeightG: 11.2 })).toBe(11.2);
  });
});

describe("today's price", () => {
  test("is metal plus making plus stones, and nothing else", () => {
    const price = livePriceFor(RING, BOARD)!;

    expect(price.pricedWeightG).toBe(10.429);
    expect(price.ratePerGram).toBe(31722);
    expect(price.metalValuePkr).toBe(330829);
    expect(price.pricePkr).toBe(345829);
  });

  test("adds up, because the panel says it does", () => {
    // The price panel's whole argument is that the three parts total the
    // headline figure. A customer checks this on a calculator.
    const parts: PriceParts = { ...RING, stoneValuePkr: 42000 };
    const price = livePriceFor(parts, BOARD)!;

    expect(price.pricePkr).toBe(price.metalValuePkr + parts.makingChargesPkr + parts.stoneValuePkr);
    expect(price.metalValuePkr).toBe(Math.round(price.pricedWeightG * price.ratePerGram));
  });

  test("moves the metal and leaves the labour alone", () => {
    // Making is the workshop's time. It does not cost more because gold rose
    // this morning.
    const dearer: RateSnapshot = {
      ...BOARD,
      rates: BOARD.rates.map((r) => ({ ...r, perGram: r.perGram * 2, perTola: r.perTola * 2 })),
    };

    const before = livePriceFor(RING, BOARD)!;
    const after = livePriceFor(RING, dearer)!;

    // Making and stones are untouched. This is the part that must hold
    // exactly.
    expect(after.pricePkr - after.metalValuePkr).toBe(before.pricePkr - before.metalValuePkr);

    // The metal doubles to within a rupee. Not exactly double: rounding to
    // the rupee happens once, at the end, so doubling the rate and rounding
    // is not the same as rounding and doubling.
    expect(Math.abs(after.metalValuePkr - before.metalValuePkr * 2)).toBeLessThanOrEqual(1);
  });

  test("says nothing it cannot work out", () => {
    // Each of these falls back to the stored price, which is yesterday's
    // number rather than no number at all.
    expect(livePriceFor({ ...RING, netWeightG: 0 }, BOARD)).toBeUndefined();
    expect(livePriceFor({ ...RING, karat: "21K" }, BOARD)).toBeUndefined();
    expect(livePriceFor(RING, undefined)).toBeUndefined();
  });

  test("leaves silver as the shop merchandised it", () => {
    // Silver making runs to several times its metal value, so tracking the
    // rate would add daily churn to a figure the shop set deliberately.
    expect(tracksMetalRate("silver")).toBe(false);
    expect(tracksMetalRate("gold")).toBe(true);
    expect(livePriceFor({ ...RING, metal: "silver" }, BOARD)).toBeUndefined();
  });
});

describe("a discount", () => {
  test("is a number of rupees off", () => {
    expect(liveSalePrice(400000, null, 345829, 10000)).toBe(335829);
  });

  test("stays that number as the metal moves", () => {
    // It used to be carried as a percentage, so "50,000 off" quietly became
    // 55,000 off when gold rose. This is that bug, written down.
    const off = 50000;
    const cheap = liveSalePrice(400000, null, 300000, off)!;
    const dear = liveSalePrice(400000, null, 600000, off)!;

    expect(300000 - cheap).toBe(off);
    expect(600000 - dear).toBe(off);
  });

  test("reads an old row that only has a sale price", () => {
    // Rows saved before the discount column existed: the difference is the
    // discount.
    expect(liveSalePrice(400000, 360000, 345829)).toBe(305829);
  });

  test("is nothing when there is nothing off", () => {
    expect(liveSalePrice(400000, null, 345829)).toBeUndefined();
    expect(liveSalePrice(400000, null, 345829, 0)).toBeUndefined();
    expect(liveSalePrice(400000, null, 345829, -5000)).toBeUndefined();
    // A sale price above the stored price is not a discount.
    expect(liveSalePrice(400000, 450000, 345829)).toBeUndefined();
  });

  test("never inverts a price", () => {
    // A discount larger than today's price would otherwise go below zero.
    expect(liveSalePrice(400000, null, 40000, 50000)).toBeUndefined();
    expect(liveSalePrice(400000, null, 50000, 50000)).toBeUndefined();
  });
});
