import { describe, expect, test } from "vitest";

import { DOLLAR_MAX_AGE_MS, approx, usableDollar, usableRate, type Rate } from "./money";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * The one promise this file makes: a converted figure is printed only when it
 * was worked out from a real rate that is recent enough to mean something,
 * and otherwise nothing is printed at all. Every test below is one way that
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
    const at = new Date(NOW - 3 * DAY).toISOString();
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

describe("the rate for another currency", () => {
  const dollar = { usd: 280, at: new Date(NOW - HOUR).toISOString() };
  const fx = {
    day: "2026-11-13",
    perUsd: { usd: 1, gbp: 0.75, eur: 0.9, aed: 3.6725, kwd: 0.3125 },
    at: new Date(NOW).toISOString(),
  };

  test("is the dollar itself for the dollar, with no cross needed", () => {
    expect(usableRate("USD", dollar, undefined, NOW)).toEqual({
      code: "USD",
      pkr: 280,
      dollar: { pkr: 280, at: dollar.at },
    });
  });

  test("is the same rupee crossed with the day's rate for everything else", () => {
    // 280 rupees to the dollar, 0.75 pounds to the dollar: 373.33 to the pound.
    const pound = usableRate("GBP", dollar, fx, NOW);
    expect(pound?.pkr).toBeCloseTo(280 / 0.75, 9);
    expect(pound?.day).toBe("2026-11-13");
    expect(usableRate("KWD", dollar, fx, NOW)?.pkr).toBeCloseTo(896, 9);
  });

  test("is nothing without a usable dollar, whatever the crosses say", () => {
    expect(usableRate("GBP", undefined, fx, NOW)).toBeNull();
    const old = { usd: 280, at: new Date(NOW - DOLLAR_MAX_AGE_MS - HOUR).toISOString() };
    expect(usableRate("GBP", old, fx, NOW)).toBeNull();
  });

  test("is nothing when the server has sent no crosses", () => {
    // An app talking to a deployment that predates them.
    expect(usableRate("EUR", dollar, undefined, NOW)).toBeNull();
  });

  test("is nothing for a currency the crosses do not carry", () => {
    expect(usableRate("SAR", dollar, fx, NOW)).toBeNull();
  });

  test("is nothing when the crosses are more than a week old", () => {
    const stale = { ...fx, day: "2026-11-05" };
    expect(usableRate("GBP", dollar, stale, NOW)).toBeNull();
    // Six days back is still a fair guide.
    expect(usableRate("GBP", dollar, { ...fx, day: "2026-11-07" }, NOW)).not.toBeNull();
  });

  test("is nothing when a cross is not a rate", () => {
    for (const gbp of [0, -0.75, Number.NaN]) {
      expect(usableRate("GBP", dollar, { ...fx, perUsd: { gbp } }, NOW)).toBeNull();
    }
    expect(usableRate("GBP", dollar, { ...fx, day: "someday" }, NOW)).toBeNull();
  });
});

describe("a rupee figure said in another currency", () => {
  const at = new Date(NOW).toISOString();
  const rate = (code: Rate["code"], pkr: number): Rate => ({
    code,
    pkr,
    dollar: { pkr: 280, at },
  });

  test("is rounded to whole units from a hundred up", () => {
    expect(approx(560_000, rate("USD", 280))).toBe("≈ US$2,000");
    expect(approx(1_948_000, rate("USD", 280))).toBe("≈ US$6,957");
  });

  test("keeps two decimals below a hundred", () => {
    expect(approx(2_150, rate("USD", 280))).toBe("≈ US$7.68");
    expect(approx(27_999, rate("USD", 280))).toBe("≈ US$100.00");
  });

  test("writes each currency the way it is written", () => {
    expect(approx(373_500, rate("GBP", 366.38))).toBe("≈ £1,019");
    expect(approx(373_500, rate("EUR", 306.28))).toBe("≈ €1,219");
    expect(approx(373_500, rate("AED", 75.41))).toBe("≈ AED 4,953");
    expect(approx(373_500, rate("KWD", 889.29))).toBe("≈ KWD 420");
    expect(approx(373_500, rate("CAD", 194.2))).toBe("≈ CA$1,923");
    expect(approx(373_500, rate("AUD", 188.22))).toBe("≈ A$1,984");
  });

  test("does not round a small piece to nothing in a dinar", () => {
    expect(approx(2_150, rate("KWD", 889.29))).toBe("≈ KWD 2.42");
  });

  test("is nothing without a rate to convert at", () => {
    // Rupees only is the honest fallback; a dash or a zero would not be.
    expect(approx(560_000, null)).toBeNull();
  });

  test("is nothing for an amount that is not a price", () => {
    for (const pkr of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(approx(pkr, rate("USD", 280))).toBeNull();
    }
  });
});
