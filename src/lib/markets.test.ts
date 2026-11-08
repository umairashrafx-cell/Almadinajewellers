import { describe, expect, test } from "vitest";

import {
  type MarketBoard,
  type MarketCalendar,
  type MarketEvent,
  type MarketRange,
  type MarketTrail,
  TOLA_PER_TROY_OUNCE,
  calendarCurrencies,
  convertsToTola,
  driversFor,
  eventTime,
  eventsToday,
  formatChange,
  formatPct,
  perTolaPKR,
  rangePosition,
  rangeWindowLabel,
  spreadPct,
} from "@/lib/markets";
import { TOLA_IN_GRAMS } from "@/lib/rates";

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

/**
 * Dollars an ounce into rupees a tola.
 *
 * The arithmetic is three multiplications and would hardly be worth a test if
 * it were only arithmetic. What these guard is the two ways the figure can go
 * wrong without anybody noticing: a unit that quietly stops matching the tola
 * the rest of the shop weighs in, and a bad input arriving as a number instead
 * of as nothing. A board that prints "Rs. 0 per tola" over the shop's own rate
 * is worse than a board that prints nothing at all.
 */
describe("perTolaPKR", () => {
  test("is the shop's own tola, not a rounded one", () => {
    // A tola is a hair under three eighths of a troy ounce. If this drifts,
    // the conversion has stopped agreeing with the calculator and the rate
    // board, which weigh in TOLA_IN_GRAMS.
    expect(TOLA_PER_TROY_OUNCE).toBeCloseTo(0.375, 5);
    expect(TOLA_PER_TROY_OUNCE).toBe(TOLA_IN_GRAMS / 31.1034768);
  });

  test("converts at the rate it is given", () => {
    // $4,072 an ounce at 283.40 interbank.
    const value = perTolaPKR(4072, 283.4);
    expect(value).not.toBeNull();
    expect(value as number).toBeCloseTo(4072 * TOLA_PER_TROY_OUNCE * 283.4, 6);
    // Sanity against the order of magnitude a tola of gold actually costs.
    expect(value as number).toBeGreaterThan(300_000);
    expect(value as number).toBeLessThan(600_000);
  });

  test("scales with each input on its own", () => {
    const base = perTolaPKR(4000, 280) as number;
    expect(perTolaPKR(8000, 280) as number).toBeCloseTo(base * 2, 6);
    expect(perTolaPKR(4000, 560) as number).toBeCloseTo(base * 2, 6);
  });

  test("answers nothing rather than a figure it cannot stand behind", () => {
    expect(perTolaPKR(0, 283.4)).toBeNull();
    expect(perTolaPKR(4072, 0)).toBeNull();
    expect(perTolaPKR(-4072, 283.4)).toBeNull();
    expect(perTolaPKR(4072, -283.4)).toBeNull();
    expect(perTolaPKR(Number.NaN, 283.4)).toBeNull();
    expect(perTolaPKR(4072, Number.NaN)).toBeNull();
    expect(perTolaPKR(Number.POSITIVE_INFINITY, 283.4)).toBeNull();
  });
});

describe("convertsToTola", () => {
  test("is true for the metals and nothing else", () => {
    // A tola of the dollar index is not a thing, and neither the barrel nor
    // the coin is weighed in one.
    expect(convertsToTola("gold")).toBe(true);
    expect(convertsToTola("silver")).toBe(true);
    expect(convertsToTola("dollarIndex")).toBe(false);
    expect(convertsToTola("bitcoin")).toBe(false);
    expect(convertsToTola("crude")).toBe(false);
    expect(convertsToTola("usdPkr")).toBe(false);
  });
});

describe("driversFor", () => {
  /** A board carrying just the two trails the attribution needs. */
  function board(
    metal: Partial<MarketTrail> & { last: number },
    rupee: Partial<MarketTrail> & { last: number },
  ) {
    return {
      gold: { usd: metal.last, at: NOW, trail: { at: NOW, ...metal } },
      usdPkr: { usd: rupee.last, at: NOW, trail: { at: NOW, ...rupee } },
    } satisfies MarketBoard;
  }

  const NOW = "2026-11-08T00:00:00.000Z";

  test("multiplies the two moves rather than adding them", () => {
    // +5% and +5% is +10.25% on a tola, not +10%. The difference is small
    // here and is not small over a year, and a figure that is nearly right
    // is the kind that gets quoted back at the counter.
    const drivers = driversFor(
      board({ last: 105, month: 100 }, { last: 105, month: 100 }),
      "gold",
      "month",
    );
    expect(drivers).not.toBeNull();
    expect(drivers?.metalPct).toBeCloseTo(5, 6);
    expect(drivers?.rupeePct).toBeCloseTo(5, 6);
    expect(drivers?.tolaPct).toBeCloseTo(10.25, 6);
  });

  test("names the metal when the metal did the work", () => {
    const drivers = driversFor(
      board({ last: 110, month: 100 }, { last: 100.2, month: 100 }),
      "gold",
      "month",
    );
    expect(drivers?.mostly).toBe("metal");
    expect(drivers?.opposed).toBe(false);
  });

  test("names the rupee when the rupee did the work", () => {
    const drivers = driversFor(
      board({ last: 100.2, month: 100 }, { last: 110, month: 100 }),
      "gold",
      "month",
    );
    expect(drivers?.mostly).toBe("rupee");
  });

  test("refuses to pick a winner between two moves of a size", () => {
    // 3% against 2.5%: both moved, and calling it "mostly the metal" would
    // dress up a coin toss as a finding.
    const drivers = driversFor(
      board({ last: 103, month: 100 }, { last: 102.5, month: 100 }),
      "gold",
      "month",
    );
    expect(drivers?.mostly).toBe("evenly");
  });

  test("says evenly, not metal, when neither moved at all", () => {
    const drivers = driversFor(
      board({ last: 100, month: 100 }, { last: 100, month: 100 }),
      "gold",
      "month",
    );
    expect(drivers?.mostly).toBe("evenly");
    expect(drivers?.opposed).toBe(false);
    expect(drivers?.tolaPct).toBeCloseTo(0, 9);
  });

  test("spots the two pulling against each other", () => {
    // Gold up, rupee stronger. The tola price barely moves, and saying only
    // "gold is up 5%" would leave somebody expecting a rise that is not there.
    const drivers = driversFor(
      board({ last: 105, month: 100 }, { last: 95, month: 100 }),
      "gold",
      "month",
    );
    expect(drivers?.opposed).toBe(true);
    expect(drivers?.tolaPct).toBeCloseTo(-0.25, 6);
  });

  test("is nothing when either half of the answer is missing", () => {
    // Half of this is not a smaller truth: "gold is up 3%" with no rupee
    // beside it invites the reader to assume the rupee held still.
    expect(driversFor(board({ last: 105 }, { last: 105, month: 100 }), "gold", "month")).toBeNull();
    expect(driversFor(board({ last: 105, month: 100 }, { last: 105 }), "gold", "month")).toBeNull();
    expect(driversFor({ gold: { usd: 1, at: NOW } }, "gold", "month")).toBeNull();
  });

  test("is nothing for a close of zero, rather than infinity", () => {
    expect(
      driversFor(board({ last: 105, month: 0 }, { last: 105, month: 100 }), "gold", "month"),
    ).toBeNull();
  });

  test("reads the window it was asked for", () => {
    const b = board({ last: 110, week: 105, month: 100 }, { last: 100, week: 100, month: 100 });
    expect(driversFor(b, "gold", "week")?.metalPct).toBeCloseTo(4.7619, 3);
    expect(driversFor(b, "gold", "month")?.metalPct).toBeCloseTo(10, 6);
  });

  test("carries the instrument the history came from", () => {
    const b = {
      gold: {
        usd: 1,
        at: NOW,
        trail: { at: NOW, last: 110, month: 100, instrument: "COMEX GC=F" },
      },
      usdPkr: { usd: 1, at: NOW, trail: { at: NOW, last: 100, month: 100 } },
    } satisfies MarketBoard;
    expect(driversFor(b, "gold", "month")?.instrument).toBe("COMEX GC=F");
  });
});

describe("formatPct", () => {
  test("signs a move and rounds it to one place", () => {
    expect(formatPct(3.14)).toBe("+3.1%");
    expect(formatPct(-0.44)).toBe("−0.4%");
    expect(formatPct(0)).toBe("0.0%");
    // Rounds to nothing, so it says nothing happened rather than "+0.0%".
    expect(formatPct(0.04)).toBe("0.0%");
  });
});

describe("spreadPct", () => {
  test("is the gap between selling and buying, over the selling rate", () => {
    // The shop's own published figures on the day this was written.
    expect(spreadPct(387000, 351900)).toBeCloseTo(9.069, 2);
  });

  test("is nothing when the figures cannot be a spread", () => {
    expect(spreadPct(0, 100)).toBeNull();
    expect(spreadPct(100, 0)).toBeNull();
    // Buying above selling is a data error, not a negative spread to draw.
    expect(spreadPct(100, 120)).toBeNull();
  });
});
