import { describe, expect, test } from "vitest";

import { type MarketRange, rangePosition, rangeWindowLabel } from "@/lib/markets";

/**
 * The marker on a range bar, and what the range is called.
 *
 * `rangePosition` exists to decide one thing: whether a dot may be drawn
 * between a high and a low. Everything it refuses is a case where drawing one
 * would assert something the figures do not support, and the metals make that
 * a real case rather than a defensive one — their price is spot and their
 * range is the COMEX contract's, so the price genuinely can sit outside it.
 */

function range(low: number, high: number, window: MarketRange["window"] = "session"): MarketRange {
  return { low, high, window };
}

describe("rangePosition", () => {
  test("places the price proportionally between the low and the high", () => {
    expect(rangePosition(50, range(0, 100))).toBe(0.5);
    expect(rangePosition(25, range(0, 100))).toBe(0.25);
    expect(rangePosition(4075.9, range(4035.6, 4116.2))).toBeCloseTo(0.5, 5);
  });

  test("pins the ends at exactly 0 and 1", () => {
    expect(rangePosition(4035.6, range(4035.6, 4116.2))).toBe(0);
    expect(rangePosition(4116.2, range(4035.6, 4116.2))).toBe(1);
  });

  test("refuses a price outside the range rather than clamping it", () => {
    // A clamp would park the dot on the end of the bar and read as "at the
    // low", which is a different claim from "not in this range at all".
    expect(rangePosition(4030, range(4035.6, 4116.2))).toBeNull();
    expect(rangePosition(4200, range(4035.6, 4116.2))).toBeNull();
  });

  test("refuses a range with no width", () => {
    expect(rangePosition(100, range(100, 100))).toBeNull();
    expect(rangePosition(100, range(120, 80))).toBeNull();
  });

  test("refuses figures that are not finite numbers", () => {
    expect(rangePosition(Number.NaN, range(0, 100))).toBeNull();
    expect(rangePosition(50, range(Number.NaN, 100))).toBeNull();
    expect(rangePosition(50, range(0, Number.POSITIVE_INFINITY))).toBeNull();
  });

  test("works on the small numbers too, where a float could misbehave", () => {
    // The dollar index moves in thousandths, and silver in cents.
    expect(rangePosition(101.9555, range(101.553, 102.358))).toBeCloseTo(0.5, 5);
    expect(rangePosition(51.785, range(51.2, 52.37))).toBeCloseTo(0.5, 5);
  });
});

describe("rangeWindowLabel", () => {
  test("names the window it was actually measured over", () => {
    // Bitcoin's is a genuine rolling day from CoinGecko; the rest is one
    // trading session from Yahoo, and the two must not read alike.
    expect(rangeWindowLabel("24h")).toBe("24-hour range");
    expect(rangeWindowLabel("session")).toBe("Range today");
    expect(rangeWindowLabel("24h")).not.toBe(rangeWindowLabel("session"));
  });
});
