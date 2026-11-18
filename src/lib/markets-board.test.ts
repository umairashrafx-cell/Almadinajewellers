import { describe, expect, test } from "vitest";

import type { MarketBoard, MarketCalendar, MarketEvent, MarketQuote } from "@/lib/markets";
import {
  boardRows,
  changeIn,
  interbank,
  moveDirection,
  movedLabel,
  priceIn,
  provenance,
  scope,
  tapHint,
  taken,
  unitLabel,
  withLiveBitcoin,
} from "@/lib/markets-board";

/**
 * The international board's figures, units and sentences.
 *
 * Everything here is shared by two screens that look nothing alike — the
 * Android app's International tab and the website's rate page — and the
 * reason it is shared is that the two must never print gold at two prices.
 * These are the tests that hold that: if a conversion, a sign, a unit label or
 * a source sentence changes, it changes for both at once, and one of these
 * fails rather than the two screens quietly drifting apart.
 *
 * The cases that matter most are the refusals. A board full of conditional
 * truths — a conversion with no exchange rate behind it, a move with a
 * percentage but no cash figure, a range belonging to a different instrument
 * than the price above it — has to come back in dollars, or come back short,
 * or come back null, rather than coming back wrong.
 */

const AT = "2026-11-18T09:30:00Z";

function quote(usd: number, extra: Partial<MarketQuote> = {}): MarketQuote {
  return { usd, at: AT, ...extra };
}

/** Rupees to the dollar, near enough to the real interbank rate to read right. */
const USDPKR = 281.5;

describe("interbank", () => {
  test("takes the board's dollar rate when it is a usable figure", () => {
    expect(interbank({ usdPkr: quote(281.5) })).toBe(281.5);
  });

  test("refuses anything that cannot convert a price", () => {
    // An older deployment of the edge function sends five instruments and no
    // rupee at all, and the board has to read as it did before rather than
    // offering a conversion it cannot perform.
    expect(interbank({})).toBeNull();
    expect(interbank({ usdPkr: quote(0) })).toBeNull();
    expect(interbank({ usdPkr: quote(-281.5) })).toBeNull();
    expect(interbank({ usdPkr: quote(Number.NaN) })).toBeNull();
  });
});

describe("priceIn", () => {
  test("quotes each instrument the way its market does", () => {
    const price = priceIn("usd", USDPKR);
    // Gold and bitcoin to the dollar — the cents are noise at those sizes.
    expect(price("gold", 4075.92)).toBe("$4,076");
    expect(price("bitcoin", 91234.56)).toBe("$91,235");
    // Silver and crude to the cent, because at those sizes they are not.
    expect(price("silver", 51.237)).toBe("$51.24");
    expect(price("crude", 58.4)).toBe("$58.40");
    // The dollar index is not money and must not be given a dollar sign.
    expect(price("dollarIndex", 99.1234)).toBe("99.123");
  });

  test("converts only the metals when asked for tolas", () => {
    const price = priceIn("tola", USDPKR);

    // 4076 an ounce is a little under 0.375 of that in tolas, times the rupee.
    expect(price("gold", 4075.92)).toMatch(/^Rs\. [\d,]+$/);
    expect(price("silver", 51.24)).toMatch(/^Rs\. [\d,]+$/);

    // Nobody weighs the dollar index, a barrel or a bitcoin in tolas, so these
    // stay exactly as they read in the dollar view.
    expect(price("dollarIndex", 99.1234)).toBe("99.123");
    expect(price("bitcoin", 91234.56)).toBe("$91,235");
    expect(price("crude", 58.4)).toBe("$58.40");
  });

  test("works the conversion out rather than carrying a hard-coded factor", () => {
    const price = priceIn("tola", USDPKR);
    /*
     * A tola is 11.6638 g against a troy ounce's 31.1034768, which makes an
     * ounce 0.3749999 of a tola — a hair under three eighths. So $4,000 an
     * ounce at Rs. 281.50 to the dollar is 4000 × 0.3749999 × 281.5, which is
     * Rs. 422,249.86 and prints to the rupee.
     *
     * Written out because the factor is derived from TOLA_IN_GRAMS rather than
     * typed in: if the shop's tola ever changes, this figure moves with the
     * calculator and the rate board instead of drifting away from them.
     */
    expect(price("gold", 4000)).toBe("Rs. 422,250");
  });

  test("falls back to dollars rather than inventing a rupee figure", () => {
    // No exchange rate to convert at.
    expect(priceIn("tola", null)("gold", 4075.92)).toBe("$4,076");
    // A price perTolaPKR refuses outright.
    expect(priceIn("tola", USDPKR)("gold", 0)).toBe("$0");
    expect(priceIn("tola", USDPKR)("gold", Number.NaN)).toBe("$NaN");
  });
});

describe("changeIn", () => {
  test("puts the sign outside whichever currency the figure is in", () => {
    const usd = changeIn(priceIn("usd", USDPKR));
    expect(usd("gold", 41)).toBe("+$41");
    expect(usd("gold", -41)).toBe("-$41");
    // The dollar index moves in index points, so no currency sign at all.
    expect(usd("dollarIndex", -0.312)).toBe("-0.312");

    const tola = changeIn(priceIn("tola", USDPKR));
    expect(tola("gold", 41)).toMatch(/^\+Rs\. [\d,]+$/);
    expect(tola("gold", -41)).toMatch(/^-Rs\. [\d,]+$/);
  });

  test("gives a move of exactly nothing no sign", () => {
    expect(changeIn(priceIn("usd", USDPKR))("gold", 0)).toBe("$0");
  });
});

describe("unitLabel", () => {
  test("says 24K on the gold once it is quoted by weight", () => {
    // Spot gold is pure metal and the shop's own headline rate is 22K. The two
    // figures are not the same thing and the board must not let them read as
    // though they were.
    expect(unitLabel("gold", "tola", USDPKR, "per ounce")).toBe("per tola, 24K");
    expect(unitLabel("silver", "tola", USDPKR, "per ounce")).toBe("per tola");
  });

  test("keeps the instrument's own unit everywhere a tola means nothing", () => {
    expect(unitLabel("gold", "usd", USDPKR, "per ounce")).toBe("per ounce");
    expect(unitLabel("gold", "tola", null, "per ounce")).toBe("per ounce");
    expect(unitLabel("dollarIndex", "tola", USDPKR, "DXY")).toBe("DXY");
    expect(unitLabel("crude", "tola", USDPKR, "WTI, per barrel")).toBe("WTI, per barrel");
  });
});

describe("movedLabel", () => {
  const change = changeIn(priceIn("usd", USDPKR));

  test("leads with the cash figure and follows it with the percentage", () => {
    // "Down forty-one dollars" is the sentence somebody at a counter says.
    expect(movedLabel("gold", quote(4076, { change: -41, changePercent: -1 }), change)).toBe(
      "-$41 (-1.00%)",
    );
    expect(movedLabel("gold", quote(4076, { change: 41, changePercent: 1.02 }), change)).toBe(
      "+$41 (+1.02%)",
    );
  });

  test("lets the percentage stand alone where there is no cash figure", () => {
    // Rather than sitting in brackets after nothing.
    expect(movedLabel("gold", quote(4076, { changePercent: -1 }), change)).toBe("-1.00%");
  });

  test("prints no move at all where the source published none", () => {
    // Which is the metals every day: the spot source sends a price and nothing
    // else, and a row with no move must show no move.
    expect(movedLabel("gold", quote(4076), change)).toBeNull();
    expect(movedLabel("gold", quote(4076, { changePercent: Number.NaN }), change)).toBeNull();
  });
});

describe("moveDirection", () => {
  test("reads the day's move, and says nothing when there is not one", () => {
    expect(moveDirection(quote(1, { changePercent: 0.4 }))).toBe("up");
    expect(moveDirection(quote(1, { changePercent: -0.4 }))).toBe("down");
    expect(moveDirection(quote(1, { changePercent: 0 }))).toBe("flat");
    expect(moveDirection(quote(1))).toBeNull();
  });
});

describe("boardRows", () => {
  const full: MarketBoard = {
    gold: quote(4076),
    silver: quote(51.24),
    dollarIndex: quote(99.123),
    bitcoin: quote(91235),
    crude: quote(58.4),
    usdPkr: quote(USDPKR),
  };

  test("keeps the five instruments in the order they belong in", () => {
    expect(boardRows(full, undefined).map((row) => row.key)).toEqual([
      "gold",
      "silver",
      "dollarIndex",
      "bitcoin",
      "crude",
    ]);
  });

  test("never draws a row for the interbank dollar", () => {
    // It is on the board to turn ounces into tolas, not to be read as one of
    // the world's prices.
    expect(boardRows(full, undefined).some((row) => String(row.key) === "usdPkr")).toBe(false);
  });

  test("leaves out an instrument that could not be fetched", () => {
    // A board of four is honest; a board of five with a zero in it is not.
    const rows = boardRows({ gold: quote(4076), crude: quote(58.4) }, undefined);
    expect(rows.map((row) => row.key)).toEqual(["gold", "crude"]);
  });

  test("hangs today's releases on the dollar index and nothing else", () => {
    // Gold and silver's releases get a section of their own under the board,
    // laid out to be read. Repeating them inside the row would say it twice.
    const event: MarketEvent = {
      title: "Core CPI m/m",
      currency: "USD",
      at: "2026-11-18T13:30:00Z",
      impact: "High",
    };
    const calendar: MarketCalendar = {
      events: [event],
      from: "2026-11-16",
      to: "2026-11-22",
    };

    const rows = boardRows(full, calendar, new Date("2026-11-18T12:00:00Z"));
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.events]));

    expect(byKey["dollarIndex"]).toEqual([event]);
    // Null, not empty: there is nothing to show and nothing to say.
    expect(byKey["gold"]).toBeNull();
    expect(byKey["silver"]).toBeNull();
    expect(byKey["bitcoin"]).toBeNull();
    expect(byKey["crude"]).toBeNull();
  });
});

describe("withLiveBitcoin", () => {
  const fetched: MarketBoard = {
    gold: quote(4076),
    bitcoin: quote(91000, {
      changePercent: 1.1,
      range: { low: 90000, high: 92000, window: "24h" },
    }),
  };

  test("hands the board back untouched when nothing is streaming", () => {
    expect(withLiveBitcoin(fetched, undefined, AT)).toBe(fetched);
  });

  test("prefers the streamed price and the move that came with it", () => {
    const board = withLiveBitcoin(fetched, { usd: 91500, changePercent: 1.7, change: 1500 }, AT);
    expect(board.bitcoin?.usd).toBe(91500);
    expect(board.bitcoin?.changePercent).toBe(1.7);
    expect(board.bitcoin?.change).toBe(1500);
    expect(board.bitcoin?.at).toBe(AT);
  });

  test("carries the range across by name and nothing else with it", () => {
    // Spreading the fetched quote underneath would pair a price from this
    // second with whatever else happened to be in the old object.
    const board = withLiveBitcoin(fetched, { usd: 91500 }, AT);
    expect(board.bitcoin?.range).toEqual({ low: 90000, high: 92000, window: "24h" });
    expect(board.bitcoin?.changePercent).toBeUndefined();
  });

  test("leaves the range key absent rather than present and undefined", () => {
    // Under exactOptionalPropertyTypes those are not the same thing, and the
    // board asks whether the key is there.
    const board = withLiveBitcoin({ bitcoin: quote(91000) }, { usd: 91500 }, AT);
    expect("range" in (board.bitcoin as object)).toBe(false);
  });

  test("does not disturb the instruments it is not about", () => {
    const board = withLiveBitcoin(fetched, { usd: 91500 }, AT);
    expect(board.gold).toBe(fetched.gold);
  });
});

describe("tapHint", () => {
  test("offers only what the board actually has behind its rows", () => {
    expect(tapHint(true, true)).toBe("Tap an instrument for its range and the day's releases.");
    expect(tapHint(true, false)).toBe("Tap an instrument for its high and low.");
    expect(tapHint(false, true)).toBe("Tap an instrument for the day's releases.");
    // Nothing behind the rows, so no invitation to a tap that does nothing.
    expect(tapHint(false, false)).toBeNull();
  });

  test("takes the caller's verb, because a desktop page is not tapped", () => {
    expect(tapHint(true, false, "Open")).toBe("Open an instrument for its high and low.");
  });
});

describe("provenance", () => {
  test("owns up to a range that belongs to a different instrument", () => {
    expect(provenance({ low: 1, high: 2, window: "session", instrument: "COMEX GC" })).toBe(
      "COMEX GC. The price above is spot, which can sit outside this range.",
    );
  });

  test("says which window the two figures were measured over", () => {
    expect(provenance({ low: 1, high: 2, window: "24h" })).toBe("A rolling twenty-four hours.");
    expect(provenance({ low: 1, high: 2, window: "session" })).toBe(
      "The current trading session, not a full day.",
    );
  });
});

describe("scope", () => {
  test("names the one country whose data moves the metals", () => {
    expect(scope("gold")).toBe("High and medium impact USD releases.");
  });

  test("lists the whole basket for the dollar index", () => {
    // A European rate decision moves DXY because the euro is more than half of
    // it, and a reader is entitled to know that is what they are looking at.
    expect(scope("dollarIndex")).toBe(
      "High and medium impact releases for the index basket — USD, EUR, JPY, GBP, CAD, CHF, SEK.",
    );
  });

  test("says nothing for an instrument with no calendar of its own", () => {
    expect(scope("bitcoin")).toBe("");
    expect(scope("crude")).toBe("");
  });
});

describe("taken", () => {
  /*
   * Pakistan time, whatever the machine drawing the board is set to.
   *
   * This is the one of these the website needs and the app never did. The page
   * is rendered on a server abroad and replayed in the reader's browser, and a
   * timestamp formatted against the ambient zone would differ between the two —
   * a hydration mismatch, and a reader seeing the stamp flinch. pkt.ts is a
   * fixed UTC+5 offset, so every one of these is the same answer everywhere.
   */
  test("gives the time in Pakistan, not where it is being read", () => {
    // 09:30 UTC is 2:30 in the afternoon in Mandi Bahauddin.
    expect(taken("2026-11-18T09:30:00Z", new Date("2026-11-18T09:31:00Z"))).toBe("2:30 PM");
  });

  test("adds the day once the figure is no longer today's", () => {
    expect(taken("2026-11-17T09:30:00Z", new Date("2026-11-18T09:31:00Z"))).toBe(
      "2:30 PM on Tue 17 Nov",
    );
  });

  test("counts the day as Pakistan has it, not as UTC does", () => {
    // 20:00 UTC is one in the morning of the next day in Pakistan, so a board
    // fetched then and read an hour later is still "today".
    expect(taken("2026-11-17T20:00:00Z", new Date("2026-11-17T21:00:00Z"))).toBe("1:00 AM");
  });

  test("says something harmless about a timestamp it cannot read", () => {
    expect(taken("not a time")).toBe("recently");
  });
});
