import { describe, expect, test } from "vitest";

import {
  blsActual,
  blsRequest,
  blsRule,
  parseBls,
  pendingReleases,
  referenceMonth,
  releaseKey,
} from "./actuals.ts";

/** BLS's answer as it came back on 18 November 2026, trimmed to three months. */
function answer(series: Record<string, Array<[string, string, string]>>) {
  return {
    status: "REQUEST_SUCCEEDED",
    Results: {
      series: Object.entries(series).map(([seriesID, rows]) => ({
        seriesID,
        data: rows.map(([year, period, value]) => ({ year, period, value })),
      })),
    },
  };
}

const NOVEMBER = parseBls(
  answer({
    CES0000000001: [
      ["2026", "M10", "159293"],
      ["2026", "M09", "159128"],
      ["2026", "M08", "159068"],
    ],
    LNS14000000: [
      ["2026", "M10", "4.1"],
      ["2026", "M09", "4.2"],
    ],
    CUSR0000SA0: [
      ["2026", "M10", "337.476"],
      ["2026", "M09", "336.298"],
    ],
    CUSR0000SA0L1E: [
      ["2026", "M10", "339.900"],
      ["2026", "M09", "338.896"],
    ],
    CUUR0000SA0: [
      ["2026", "M10", "330.000"],
      ["2025", "M10", "321.000"],
      ["2025", "M13", "320.000"],
    ],
    WPSFD4: [
      ["2026", "M10", "160.254"],
      ["2026", "M09", "159.699"],
    ],
    WPSFD49104: [
      ["2026", "M10", "156.740"],
      ["2026", "M09", "156.230"],
    ],
  }),
)!;

function release(title: string, at = "2026-11-13T08:30:00-05:00") {
  return { title, currency: "USD", at };
}

describe("which releases BLS can answer", () => {
  test("matches the calendar's own titles exactly", () => {
    expect(blsRule(release("Non-Farm Employment Change"))?.series).toBe("CES0000000001");
    expect(blsRule(release("Core CPI m/m"))?.series).toBe("CUSR0000SA0L1E");
    expect(blsRule(release("CPI y/y"))?.series).toBe("CUUR0000SA0");
    expect(blsRule(release("Core PPI m/m"))?.series).toBe("WPSFD49104");
  });

  test("leaves alone what BLS does not publish, or another country's release", () => {
    // ADP's payrolls are ADP's, not the government's.
    expect(blsRule(release("ADP Non-Farm Employment Change"))).toBeNull();
    expect(blsRule(release("Retail Sales m/m"))).toBeNull();
    expect(blsRule(release("Unemployment Claims"))).toBeNull();
    expect(blsRule({ ...release("CPI m/m"), currency: "CAD" })).toBeNull();
  });
});

describe("referenceMonth", () => {
  test("is the month before the release, in New York's own date", () => {
    expect(referenceMonth("2026-11-13T08:30:00-05:00")).toEqual({ year: 2026, month: 10 });
    expect(referenceMonth("2027-01-09T08:30:00-05:00")).toEqual({ year: 2026, month: 12 });
    expect(referenceMonth("whenever")).toBeNull();
  });
});

describe("blsActual", () => {
  test("states payrolls as the change in thousands", () => {
    expect(blsActual(release("Non-Farm Employment Change"), NOVEMBER)).toBe("165K");
  });

  test("states the unemployment rate as published", () => {
    expect(blsActual(release("Unemployment Rate"), NOVEMBER)).toBe("4.1%");
  });

  test("works out CPI and PPI changes from the published indexes", () => {
    // 337.476 / 336.298 = +0.3503% — 0.4 at one decimal.
    expect(blsActual(release("CPI m/m"), NOVEMBER)).toBe("0.4%");
    expect(blsActual(release("Core CPI m/m"), NOVEMBER)).toBe("0.3%");
    expect(blsActual(release("PPI m/m"), NOVEMBER)).toBe("0.3%");
    expect(blsActual(release("Core PPI m/m"), NOVEMBER)).toBe("0.3%");
  });

  test("measures y/y against the same month a year before", () => {
    // 330 / 321 = +2.80%.
    expect(blsActual(release("CPI y/y"), NOVEMBER)).toBe("2.8%");
  });

  test("states a fall with its sign, and no change as 0.0%", () => {
    const data = parseBls(
      answer({
        CES0000000001: [
          ["2026", "M10", "159100"],
          ["2026", "M09", "159133"],
        ],
        CUSR0000SA0: [
          ["2026", "M10", "336.000"],
          ["2026", "M09", "336.000"],
        ],
        WPSFD4: [
          ["2026", "M10", "159.000"],
          ["2026", "M09", "159.500"],
        ],
      }),
    )!;
    expect(blsActual(release("Non-Farm Employment Change"), data)).toBe("-33K");
    expect(blsActual(release("CPI m/m"), data)).toBe("0.0%");
    expect(blsActual(release("PPI m/m"), data)).toBe("-0.3%");
  });

  test("gives nothing until BLS has the month the release is about", () => {
    // A December release asks about November, which this answer does not have —
    // and must not borrow October's figure instead.
    const december = "2026-12-11T08:30:00-05:00";
    expect(blsActual(release("CPI m/m", december), NOVEMBER)).toBeNull();
    expect(blsActual(release("Non-Farm Employment Change", december), NOVEMBER)).toBeNull();
  });
});

describe("parseBls", () => {
  test("refuses an answer that is not a success", () => {
    expect(parseBls(null)).toBeNull();
    expect(parseBls({ status: "REQUEST_NOT_PROCESSED", message: ["daily threshold"] })).toBeNull();
  });

  test("skips the annual average and anything unreadable", () => {
    const data = parseBls(
      answer({
        X: [
          ["2025", "M13", "1"],
          ["2025", "M01", "n/a"],
          ["2025", "M02", "2"],
        ],
      }),
    );
    expect([...(data?.X?.entries() ?? [])]).toEqual([["2025-02", 2]]);
  });
});

describe("pendingReleases", () => {
  const now = new Date("2026-11-13T14:00:00Z");
  const events = [
    release("CPI m/m"),
    release("Retail Sales m/m"),
    release("PPI m/m", "2026-11-14T08:30:00-05:00"),
    release("Core CPI m/m", "2026-11-01T08:30:00-05:00"),
  ];

  test("asks only for released BLS figures from the last few days that are still missing", () => {
    expect(pendingReleases(events, {}, now).map((e) => e.title)).toEqual(["CPI m/m"]);
    expect(pendingReleases(events, { [releaseKey(events[0]!)]: "0.4%" }, now)).toEqual([]);
  });

  test("asks for each series once, with last year for the y/y figures", () => {
    expect(blsRequest([release("CPI m/m"), release("CPI m/m")], now)).toEqual({
      seriesid: ["CUSR0000SA0"],
      startyear: "2025",
      endyear: "2026",
    });
  });
});
