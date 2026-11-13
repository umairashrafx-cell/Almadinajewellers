import { describe, expect, test } from "vitest";

import { DOLLAR_MAX_AGE_MS, approxUsd, usableDollar } from "./money";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const HOUR = 60 * 60 * 1000;

/**
 * The one promise this file makes: a dollar figure is printed only when it was
 * worked out from a real rate that is recent enough to mean something, and
 * otherwise nothing is printed at all. Every test below is one way that
 * promise could be broken.
 */
describe("the dollar a price may be converted at", () => {
  test("is the board's figure when it is fresh", () => {
    const at = new Date(NOW - 2 * HOUR).toISOString();
    expect(usableDollar({ usd: 281.5, at }, NOW)).toEqual({ pkr: 281.5, at });
  });

  test("is still used across a weekend", () => {
    // Interbank does not trade on Saturday or Sunday. Monday morning's board
    // carries Friday's figure and that is correct.
    const at = new Date(NOW - 3 * 24 * HOUR).toISOString();
    expect(usableDollar({ usd: 281.5, at }, NOW)).not.toBeNull();
  });

  test("is refused once it is more than a week old", () => {
    const at = new Date(NOW - DOLLAR_MAX_AGE_MS - HOUR).toISOString();
    expect(usableDollar({ usd: 281.5, at }, NOW)).toBeNull();
  });

  test("is refused when the board has none", () => {
    expect(usableDollar(undefined, NOW)).toBeNull();
  });

  test("is refused when it is not a rate", () => {
    const at = new Date(NOW).toISOString();
    for (const usd of [0, -281.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(usableDollar({ usd, at }, NOW)).toBeNull();
    }
  });

  test("is refused when nobody can say when it was taken", () => {
    expect(usableDollar({ usd: 281.5, at: "" }, NOW)).toBeNull();
    expect(usableDollar({ usd: 281.5, at: "yesterday" }, NOW)).toBeNull();
  });

  test("is refused when the phone's clock makes its age meaningless", () => {
    const at = new Date(NOW + DOLLAR_MAX_AGE_MS + HOUR).toISOString();
    expect(usableDollar({ usd: 281.5, at }, NOW)).toBeNull();
  });
});

describe("a rupee figure said in dollars", () => {
  const dollar = { pkr: 280, at: new Date(NOW).toISOString() };

  test("is rounded to the dollar from a hundred up", () => {
    expect(approxUsd(560_000, dollar)).toBe("≈ US$2,000");
    expect(approxUsd(1_948_000, dollar)).toBe("≈ US$6,957");
  });

  test("keeps its cents below a hundred", () => {
    expect(approxUsd(2_150, dollar)).toBe("≈ US$7.68");
    expect(approxUsd(27_999, dollar)).toBe("≈ US$100.00");
  });

  test("is nothing without a dollar to convert at", () => {
    // Rupees only is the honest fallback; a dash or a zero would not be.
    expect(approxUsd(560_000, null)).toBeNull();
  });

  test("is nothing for an amount that is not a price", () => {
    for (const pkr of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(approxUsd(pkr, dollar)).toBeNull();
    }
  });
});
