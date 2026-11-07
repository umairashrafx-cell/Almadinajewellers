import { describe, expect, test } from "vitest";

import {
  type MarketCalendar,
  type MarketEvent,
  type MarketRange,
  calendarCurrencies,
  eventTime,
  eventsToday,
  formatChange,
  rangePosition,
  rangeWindowLabel,
} from "@/lib/markets";

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

describe("formatChange", () => {
  test("signs the move and keeps each instrument's own rounding", () => {
    // Figures measured off the live upstreams while this was written.
    expect(formatChange("gold", -38.6)).toBe("-$39");
    expect(formatChange("silver", -0.434)).toBe("-$0.43");
    expect(formatChange("crude", 0.31)).toBe("+$0.31");
    expect(formatChange("bitcoin", 451.39)).toBe("+$451");
  });

  test("never puts a dollar sign on the dollar index", () => {
    // It moves in index points. "$-0.019" would be a different claim.
    expect(formatChange("dollarIndex", -0.019)).toBe("-0.019");
    expect(formatChange("dollarIndex", 0.696)).toBe("+0.696");
    expect(formatChange("dollarIndex", -0.019)).not.toContain("$");
  });

  test("a move of nothing gets no sign", () => {
    expect(formatChange("gold", 0)).toBe("$0");
    expect(formatChange("dollarIndex", 0)).toBe("0.000");
  });

  test("groups thousands, so a big bitcoin move stays readable", () => {
    expect(formatChange("bitcoin", -1234.5)).toBe("-$1,235");
  });
});

/**
 * The economic calendar.
 *
 * Everything below is anchored to a local time built with the Date
 * constructor rather than to a fixed instant, so the suite means the same thing
 * on a machine in Karachi as on one in a CI container running UTC. That is not
 * fussiness: the whole question eventsToday answers is which day a release
 * falls on where the phone is standing, and a test pinned to UTC would pass
 * while proving nothing about the only timezone the app runs in.
 */
const NOON = new Date(2026, 10, 6, 12, 0, 0); // local midday, Friday 6 November

/** A release at a local wall-clock time on the day NOON is on, unless a day is
 *  given. The ISO string is what the server would have sent. */
function at(hour: number, minute = 0, day = 6): string {
  return new Date(2026, 10, day, hour, minute, 0).toISOString();
}

function event(currency: string, when: string, extra: Partial<MarketEvent> = {}): MarketEvent {
  return { title: "Non-Farm Employment Change", currency, at: when, impact: "High", ...extra };
}

function calendar(events: MarketEvent[], span = true): MarketCalendar {
  return { events, ...(span ? { from: "2026-11-01", to: "2026-11-07" } : {}) };
}

describe("eventsToday", () => {
  test("gives crude and bitcoin no calendar at all", () => {
    // The metals calendar is not theirs. Its publisher keeps separate ones for
    // energy and for crypto, and showing American jobs data under crude oil
    // would be a guess dressed as a source.
    const held = calendar([event("USD", at(18, 30))]);
    expect(eventsToday("crude", held, NOON)).toBeNull();
    expect(eventsToday("bitcoin", held, NOON)).toBeNull();
  });

  test("says nothing when the server has no calendar", () => {
    expect(eventsToday("gold", undefined, NOON)).toBeNull();
  });

  test("says nothing when the week covered is not stated", () => {
    // A failed first fetch leaves events but no span. Without a span, a day
    // with no rows cannot be told from a day the feed never reached, and the
    // only honest answer is silence rather than "nothing is scheduled".
    const held = calendar([event("USD", at(18, 30))], false);
    expect(eventsToday("gold", held, NOON)).toBeNull();
  });

  test("says nothing when today falls outside the week covered", () => {
    const held = { events: [event("USD", at(18, 30))], from: "2026-11-09", to: "2026-11-15" };
    expect(eventsToday("gold", held, NOON)).toBeNull();
  });

  test("distinguishes a covered day with nothing on it from no answer", () => {
    // Saturday. The difference between [] and null is the whole point: one is
    // a fact worth printing, the other is a reason to print nothing.
    expect(eventsToday("gold", calendar([]), NOON)).toEqual([]);
  });

  test("keeps only the currencies that move the instrument", () => {
    const held = calendar([
      event("USD", at(18, 30)),
      event("CAD", at(18, 31)),
      event("EUR", at(14, 0)),
    ]);

    expect(eventsToday("gold", held, NOON)?.map((e) => e.currency)).toEqual(["USD"]);
    // The index is a basket, so the basket's releases count. The Canadian
    // dollar is in it; it is not in the dollar gold is priced in.
    expect(eventsToday("dollarIndex", held, NOON)?.map((e) => e.currency)).toEqual([
      "EUR",
      "USD",
      "CAD",
    ]);
  });

  test("orders them by when they are due, not by how they arrived", () => {
    const held = calendar([event("USD", at(20, 0)), event("USD", at(9, 15))]);
    expect(eventsToday("gold", held, NOON)?.map((e) => eventTime(e.at))).toEqual([
      "09:15",
      "20:00",
    ]);
  });

  test("puts a release on the day the phone is having, to the minute", () => {
    // A release at 23:59 tonight is today's business; one at 00:00 tomorrow is
    // not. In Pakistan an American evening release and a Pakistani morning one
    // can share a UTC date and still belong to different days here, which is
    // why the comparison is on local days rather than on the ISO string.
    const held = calendar([
      event("USD", at(23, 59)),
      event("USD", at(0, 0, 7)),
      event("USD", at(23, 59, 5)),
    ]);

    const today = eventsToday("gold", held, NOON);
    expect(today).toHaveLength(1);
    expect(today?.[0]?.at).toBe(at(23, 59));
  });

  test("carries the forecast and the last reading through when they exist", () => {
    const held = calendar([
      event("USD", at(18, 30), { forecast: "7.15M", previous: "7.08M", impact: "Medium" }),
    ]);

    const [only] = eventsToday("gold", held, NOON) ?? [];
    expect(only?.forecast).toBe("7.15M");
    expect(only?.previous).toBe("7.08M");
    expect(only?.impact).toBe("Medium");
  });

  test("ignores a release whose time cannot be read", () => {
    const held = calendar([event("USD", "not a date"), event("USD", at(18, 30))]);
    expect(eventsToday("gold", held, NOON)).toHaveLength(1);
  });
});

describe("calendarCurrencies", () => {
  test("names the dollar for the metals and the basket for the index", () => {
    expect(calendarCurrencies("gold")).toEqual(["USD"]);
    expect(calendarCurrencies("silver")).toEqual(["USD"]);
    expect(calendarCurrencies("dollarIndex")).toContain("EUR");
    expect(calendarCurrencies("dollarIndex")).toContain("USD");
  });

  test("gives none to the instruments this calendar does not cover", () => {
    expect(calendarCurrencies("crude")).toBeUndefined();
    expect(calendarCurrencies("bitcoin")).toBeUndefined();
  });
});

describe("eventTime", () => {
  test("states a release time on the phone's own clock, zero-padded", () => {
    expect(eventTime(at(18, 30))).toBe("18:30");
    expect(eventTime(at(9, 5))).toBe("09:05");
  });

  test("returns nothing it would have to invent", () => {
    expect(eventTime("")).toBe("");
    expect(eventTime("tomorrow afternoon")).toBe("");
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
