import { describe, expect, test } from "vitest";

import {
  goldVerdict,
  isReleased,
  metalsWeek,
  nextRelease,
  parseFigure,
  releaseDirection,
  releaseWatch,
} from "@/lib/econ-calendar";
import type { MarketEvent } from "@/lib/markets";
import { dayName, pktDay, pktDayLabel, pktTime, timeUntil } from "@/lib/pkt";

/** A Pakistan wall-clock time in November 2026, as the ISO a server sends. */
function pk(day: number, hour: number, minute = 0): string {
  return new Date(Date.UTC(2026, 10, day, hour - 5, minute)).toISOString();
}

function release(extra: Partial<MarketEvent> = {}): MarketEvent {
  return {
    title: "Non-Farm Employment Change",
    currency: "USD",
    at: pk(6, 18, 30),
    impact: "High",
    ...extra,
  };
}

describe("Pakistan time", () => {
  test("is UTC+5 whatever the input's own offset", () => {
    expect(pktTime("2026-11-18T08:30:00-05:00")).toBe("6:30 PM");
    expect(pktTime("2026-11-18T13:30:00Z")).toBe("6:30 PM");
    expect(pktTime("2026-11-18T18:30:00+05:00")).toBe("6:30 PM");
  });

  test("uses a twelve-hour clock with AM and PM", () => {
    expect(pktTime(pk(18, 0, 0))).toBe("12:00 AM");
    expect(pktTime(pk(18, 0, 45))).toBe("12:45 AM");
    expect(pktTime(pk(18, 9, 5))).toBe("9:05 AM");
    expect(pktTime(pk(18, 12, 0))).toBe("12:00 PM");
    expect(pktTime(pk(18, 23, 59))).toBe("11:59 PM");
  });

  test("puts a New York evening release on the next day in Pakistan", () => {
    // The FOMC statement: 2 PM in Washington on 9 December is midnight here.
    expect(pktDay("2026-12-09T14:00:00-05:00")).toBe("2026-12-10");
    expect(pktTime("2026-12-09T14:00:00-05:00")).toBe("12:00 AM");
  });

  test("returns nothing it would have to invent", () => {
    expect(pktTime("soon")).toBe("");
    expect(pktDay("")).toBe("");
    expect(dayName("not a day")).toBe("");
  });

  test("names days relative to today in Pakistan", () => {
    const now = new Date(pk(18, 23, 30));
    expect(pktDayLabel("2026-11-18", now)).toBe("Today");
    expect(pktDayLabel("2026-11-19", now)).toBe("Tomorrow");
    expect(pktDayLabel("2026-11-17", now)).toBe("Yesterday");
    expect(pktDayLabel("2026-11-20", now)).toBe("Fri 20 Nov");
  });

  test("counts down in words", () => {
    const now = new Date(pk(18, 12, 0));
    expect(timeUntil(pk(18, 12, 45), now)).toBe("in 45 min");
    expect(timeUntil(pk(18, 15, 10), now)).toBe("in 3 h 10 min");
    expect(timeUntil(pk(18, 14, 0), now)).toBe("in 2 h");
    expect(timeUntil(pk(22, 12, 0), now)).toBe("in 4 days");
    expect(timeUntil(pk(18, 11, 0), now)).toBeNull();
  });
});

describe("parseFigure", () => {
  test("reads the feed's figures", () => {
    expect(parseFigure("0.3%")).toBe(0.3);
    expect(parseFigure("-0.5%")).toBe(-0.5);
    expect(parseFigure("119K")).toBe(119_000);
    expect(parseFigure("-33K")).toBe(-33_000);
    expect(parseFigure("7.15M")).toBe(7_150_000);
    expect(parseFigure("1.2B")).toBe(1_200_000_000);
    expect(parseFigure("20.6")).toBe(20.6);
    expect(parseFigure("1,234.5")).toBe(1234.5);
    expect(parseFigure("4.00%")).toBe(4);
  });

  test("refuses anything it would have to guess at", () => {
    expect(parseFigure(undefined)).toBeNull();
    expect(parseFigure("")).toBeNull();
    expect(parseFigure("n/a")).toBeNull();
    expect(parseFigure("0.2-0.3%")).toBeNull();
    expect(parseFigure("<0.1%")).toBeNull();
  });
});

describe("the gold rule", () => {
  test("stronger American data than forecast is bad for gold", () => {
    expect(goldVerdict(release({ actual: "250K", forecast: "180K" }))).toBe("bad");
    expect(goldVerdict(release({ title: "CPI m/m", actual: "0.4%", forecast: "0.3%" }))).toBe(
      "bad",
    );
    expect(
      goldVerdict(release({ title: "Advance GDP q/q", actual: "3.1%", forecast: "2.5%" })),
    ).toBe("bad");
    expect(
      goldVerdict(release({ title: "Retail Sales m/m", actual: "0.6%", forecast: "0.1%" })),
    ).toBe("bad");
  });

  test("weaker American data than forecast is good for gold", () => {
    expect(goldVerdict(release({ actual: "-33K", forecast: "50K" }))).toBe("good");
    expect(goldVerdict(release({ title: "Core CPI m/m", actual: "0.2%", forecast: "0.3%" }))).toBe(
      "good",
    );
    expect(
      goldVerdict(release({ title: "Core Retail Sales m/m", actual: "-0.1%", forecast: "0.4%" })),
    ).toBe("good");
  });

  test("reads unemployment the other way round", () => {
    // More people out of work is the weaker economy, and so good for gold.
    expect(
      goldVerdict(release({ title: "Unemployment Rate", actual: "4.5%", forecast: "4.3%" })),
    ).toBe("good");
    expect(
      goldVerdict(release({ title: "Unemployment Claims", actual: "210K", forecast: "225K" })),
    ).toBe("bad");
  });

  test("calls a figure equal to the forecast as expected", () => {
    expect(goldVerdict(release({ title: "CPI m/m", actual: "0.30%", forecast: "0.3%" }))).toBe(
      "inline",
    );
  });

  test("a higher Fed rate than expected is the hawkish surprise", () => {
    expect(
      goldVerdict(release({ title: "Federal Funds Rate", actual: "4.25%", forecast: "4.00%" })),
    ).toBe("bad");
  });

  test("never labels a release that has no actual figure", () => {
    // A forecast is the market's guess; a label on it would be a prediction.
    expect(goldVerdict(release({ forecast: "180K", previous: "150K" }))).toBeNull();
  });

  test("needs a forecast to measure the surprise against", () => {
    expect(goldVerdict(release({ actual: "250K", previous: "150K" }))).toBeNull();
  });

  test("claims nothing for releases whose direction is arguable", () => {
    expect(releaseDirection({ title: "Trade Balance", currency: "USD" })).toBeNull();
    expect(releaseDirection({ title: "Crude Oil Inventories", currency: "USD" })).toBeNull();
    expect(releaseDirection({ title: "10-y Bond Auction", currency: "USD" })).toBeNull();
    expect(
      goldVerdict(release({ title: "Fed Chairman Warsh Speaks", actual: "1", forecast: "0" })),
    ).toBeNull();
  });

  test("applies to American releases only", () => {
    expect(
      goldVerdict(release({ currency: "EUR", title: "CPI m/m", actual: "0.4%", forecast: "0.3%" })),
    ).toBeNull();
  });

  test("knows the week's usual movers", () => {
    for (const title of [
      "Average Hourly Earnings m/m",
      "ADP Non-Farm Employment Change",
      "JOLTS Job Openings",
      "PPI m/m",
      "Core PCE Price Index m/m",
      "ISM Manufacturing PMI",
      "Philly Fed Manufacturing Index",
      "Revised UoM Consumer Sentiment",
      "CB Consumer Confidence",
      "Durable Goods Orders m/m",
      "Building Permits",
      "Existing Home Sales",
    ]) {
      expect(releaseDirection({ title, currency: "USD" }), title).toBe("stronger");
    }
  });
});

describe("metalsWeek", () => {
  const now = new Date(pk(18, 12, 0)); // Wednesday noon in Pakistan

  const calendar = {
    from: "2026-11-15",
    to: "2026-11-21",
    events: [
      release({ title: "Retail Sales m/m", at: "2026-11-17T08:30:00-05:00", impact: "Medium" }),
      release({ title: "FOMC Meeting Minutes", at: "2026-11-18T14:00:00-05:00", impact: "Medium" }),
      release({ title: "Philly Fed Manufacturing Index", at: "2026-11-19T08:30:00-05:00" }),
      release({ title: "German Ifo", currency: "EUR", at: "2026-11-18T04:00:00-05:00" }),
      release({ title: "Bad time", at: "whenever" }),
    ],
  };

  test("groups American releases by the day they land in Pakistan", () => {
    const week = metalsWeek(calendar, now);
    expect(week?.earlier.map((day) => day.label)).toEqual(["Yesterday"]);
    // The minutes are 2 PM Wednesday in Washington — midnight Thursday here.
    expect(week?.coming.map((day) => [day.label, day.events.map((e) => e.title)])).toEqual([
      ["Today", []],
      ["Tomorrow", ["FOMC Meeting Minutes", "Philly Fed Manufacturing Index"]],
    ]);
  });

  test("says nothing without a stated week", () => {
    expect(metalsWeek(undefined, now)).toBeNull();
    expect(metalsWeek({ events: calendar.events }, now)).toBeNull();
  });

  test("does not invent an empty today outside the week covered", () => {
    const week = metalsWeek({ ...calendar, from: "2026-11-08", to: "2026-11-14" }, now);
    expect(week?.coming.map((day) => day.day)).toEqual(["2026-11-19"]);
  });

  test("finds the next release still to come", () => {
    const week = metalsWeek(calendar, now);
    expect(week && nextRelease(week, now)?.title).toBe("FOMC Meeting Minutes");
    const [retail, minutes] = calendar.events as [MarketEvent, MarketEvent];
    expect(isReleased(retail, now)).toBe(true);
    expect(isReleased(minutes, now)).toBe(false);
  });
});

describe("releaseWatch", () => {
  /*
   * The releases that print no figure.
   *
   * These are the biggest events on the calendar — the Fed's minutes, its
   * speakers — and until now they were the only rows carrying no read at all,
   * because there is no number in them to compare against a forecast.
   *
   * What a note must never do is settle that by guessing. Nobody knows whether
   * the minutes are dovish or hawkish before somebody has read them, so the
   * note gives the key rather than the answer, and it always gives both sides
   * of it. The tests below are mostly about where it declines to speak.
   */
  test("reads the Fed's minutes as a thing with two possible tones", () => {
    const watch = releaseWatch(release({ title: "FOMC Meeting Minutes", impact: "Medium" }));
    expect(watch).not.toBeNull();
    expect(watch?.what).toMatch(/record of the Fed's last meeting/i);
    expect(watch?.dovish).toMatch(/cutting sooner/i);
    expect(watch?.hawkish).toMatch(/no hurry to cut/i);
  });

  test("covers the Fed's speakers, however the feed names them", () => {
    // The feed writes the chair's own name into the title, so nothing here can
    // be keyed to a person: "Fed Chairman Warsh Speaks" today was "Fed
    // Chairman Powell Speaks" a year ago and will be somebody else again.
    for (const title of [
      "Fed Chairman Warsh Speaks",
      "Fed Chair Powell Speaks",
      "FOMC Member Williams Speaks",
      "Fed Vice Chair Jefferson Speaks",
    ]) {
      expect(releaseWatch(release({ title })), title).not.toBeNull();
    }
  });

  test("covers the statement, the Beige Book and testimony", () => {
    for (const title of [
      "FOMC Statement",
      "FOMC Press Conference",
      "Beige Book",
      "Fed Chair Testimony",
    ]) {
      expect(releaseWatch(release({ title })), title).not.toBeNull();
    }
  });

  test("always offers both directions, never one", () => {
    // A note that mentioned only the dovish case would be a prediction wearing
    // an explainer's clothes.
    for (const title of ["FOMC Meeting Minutes", "Beige Book", "Fed Chairman Warsh Speaks"]) {
      const watch = releaseWatch(release({ title }));
      expect(watch?.dovish, title).toBeTruthy();
      expect(watch?.hawkish, title).toBeTruthy();
    }
  });

  test("stands down the moment a release has a figure to be judged by", () => {
    // This is what keeps a row from ever carrying a verdict and a note at
    // once: goldVerdict needs both figures, this needs neither.
    expect(releaseWatch(release({ title: "FOMC Meeting Minutes", forecast: "0.3%" }))).toBeNull();
    expect(releaseWatch(release({ title: "FOMC Meeting Minutes", actual: "0.3%" }))).toBeNull();

    const numbered = release({ title: "Core CPI m/m", actual: "0.4%", forecast: "0.3%" });
    expect(releaseWatch(numbered)).toBeNull();
    expect(goldVerdict(numbered)).toBe("bad");
  });

  test("a figure that cannot be read is still no figure", () => {
    // The feed writes the minutes' columns as a dash or leaves them empty;
    // neither is a number, and neither should silence the note.
    expect(
      releaseWatch(release({ title: "Beige Book", forecast: "—", actual: "" })),
    ).not.toBeNull();
  });

  test("claims nothing for a release it has no rule for", () => {
    // The same allow-list discipline as DIRECTIONS: a bond auction or an oil
    // inventory has no settled first reaction, so it gets no note.
    expect(releaseWatch(release({ title: "10-y Bond Auction" }))).toBeNull();
    expect(releaseWatch(release({ title: "Natural Gas Storage" }))).toBeNull();
    expect(releaseWatch(release({ title: "Treasury Currency Report" }))).toBeNull();
  });

  test("claims nothing outside American data", () => {
    // The metals calendar is American; an ECB speaker moves the euro, and this
    // screen does not pretend to read him.
    expect(
      releaseWatch(release({ title: "ECB President Lagarde Speaks", currency: "EUR" })),
    ).toBeNull();
  });

  test("leaves every numbered release exactly as it was", () => {
    // The rule the calendar already states must not have moved under it.
    expect(goldVerdict(release({ actual: "150K", forecast: "120K" }))).toBe("bad");
    expect(goldVerdict(release({ actual: "90K", forecast: "120K" }))).toBe("good");
    expect(goldVerdict(release({ actual: "120K", forecast: "120K" }))).toBe("inline");
    expect(releaseDirection(release({ title: "Unemployment Rate" }))).toBe("weaker");
  });
});
