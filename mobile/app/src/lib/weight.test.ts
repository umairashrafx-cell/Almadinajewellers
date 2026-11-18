import { describe, expect, test } from "vitest";

import { TOLA_IN_GRAMS } from "@/lib/rates";

import { formatWeightGrams, formatWeightTola, roundGrams } from "./weight";

describe("the grams a piece is shown at", () => {
  test("are rounded to the hundredth and written to three decimals", () => {
    // The shop's own example: the Jalal-e-Malika collar set.
    expect(formatWeightGrams(31.126)).toBe("31.130 g");
  });

  test("round down below the half", () => {
    expect(formatWeightGrams(31.124)).toBe("31.120 g");
  });

  test("round a half up, without floating-point drift", () => {
    // 1.005 * 100 is 100.49999… in binary; a plain Math.round would give 1.00.
    expect(roundGrams(1.005)).toBe(1.01);
    expect(formatWeightGrams(10.425)).toBe("10.430 g");
  });

  test("carry into the next gram", () => {
    expect(formatWeightGrams(9.996)).toBe("10.000 g");
  });

  test("leave a figure already at the hundredth alone", () => {
    expect(formatWeightGrams(11.2)).toBe("11.200 g");
    expect(formatWeightGrams(5)).toBe("5.000 g");
  });
});

describe("the tola a piece is shown at", () => {
  test("is the rounded grams over the shop's tola, to three decimals", () => {
    // 31.130 / 11.6638 = 2.66894…
    expect(formatWeightTola(31.126)).toBe("2.669 tola");
  });

  test("is one tola for a tola's weight", () => {
    // 11.6638 rounds to 11.66 g, which is 0.99967 tola — and that is what the
    // screen should say, because 11.660 g is what it shows beside it.
    expect(formatWeightTola(TOLA_IN_GRAMS)).toBe("1.000 tola");
    expect(formatWeightTola(2 * TOLA_IN_GRAMS)).toBe("2.000 tola");
  });

  test("agrees with the gram figure beside it", () => {
    for (const grams of [3.333, 7.777, 10.429, 31.126, 58.004]) {
      const shown = Number(formatWeightGrams(grams).replace(" g", ""));
      const tola = Number(formatWeightTola(grams).replace(" tola", ""));
      expect(tola).toBeCloseTo(shown / TOLA_IN_GRAMS, 3);
    }
  });
});
