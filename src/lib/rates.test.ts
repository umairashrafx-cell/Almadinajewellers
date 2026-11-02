import { describe, expect, test } from "vitest";

import {
  FALLBACK_SNAPSHOT,
  GOLD_KARATS,
  TOLA_IN_GRAMS,
  buyingRateFor,
  formatRateDate,
  formatRateStamp,
  formatRateTimestamp,
  goldOnly,
  metalValue,
  perGramFromTola,
  rateBoard,
  rateCards,
  rateFor,
  rateStampParts,
  roundRateToHundred,
  sellingRateFor,
  type RateSnapshot,
} from "@/lib/rates";

/**
 * A day's board, shaped like one the shop actually published.
 *
 * Real figures rather than round ones on purpose: the per-tola and per-gram
 * columns here are a genuine pair out of the table, so the derivation test
 * below checks agreement with something the shop stood behind rather than
 * with arithmetic invented for the test.
 */
const BOARD: RateSnapshot = {
  date: "2026-11-02",
  publishedAt: "2026-11-02T07:12:00.000Z",
  rates: [
    { karat: "24K", perTola: 409500, perGram: 35109 },
    { karat: "23.65K", perTola: 403500, perGram: 34594 },
    { karat: "22K", perTola: 370000, perGram: 31722 },
    { karat: "999", perTola: 5400, perGram: 463 },
  ],
};

const row = (karat: string) => BOARD.rates.find((r) => r.karat === karat)!;

const withoutSilver: RateSnapshot = {
  ...BOARD,
  rates: BOARD.rates.filter((r) => r.karat !== "999"),
};

describe("the tola", () => {
  test("is 11.6638 grams", () => {
    // Every price on the site and in the app is built on this one number.
    expect(TOLA_IN_GRAMS).toBe(11.6638);
  });

  test("derives the per-gram column the shop published", () => {
    // Per-gram is never typed in; it is derived from per-tola so the two can
    // never disagree. If this fails, the board is quoting two different
    // prices for the same metal.
    for (const rate of BOARD.rates) {
      expect(perGramFromTola(rate.perTola)).toBe(rate.perGram);
    }
  });
});

describe("rounding a rate", () => {
  test("goes to the nearest hundred, not down", () => {
    expect(roundRateToHundred(442354)).toBe(442400);
    expect(roundRateToHundred(442349)).toBe(442300);
  });

  test("rounds a half up", () => {
    expect(roundRateToHundred(442350)).toBe(442400);
  });

  test("leaves a round figure alone", () => {
    expect(roundRateToHundred(409500)).toBe(409500);
  });
});

describe("what a weight is worth", () => {
  test("prices a tola off the published per-tola figure", () => {
    // Not by way of per-gram. One tola has to come back as the number on the
    // board, because that is the arithmetic a buyer checks first.
    expect(metalValue(1, "tola", row("24K")).value).toBe(409500);

    // Going through per-gram would land here instead, a few rupees out.
    expect(Math.round(TOLA_IN_GRAMS * row("24K").perGram)).not.toBe(409500);
  });

  test("prices grams off the per-gram figure", () => {
    expect(metalValue(10, "g", row("22K")).value).toBe(317220);
  });

  test("reports both units whichever was typed", () => {
    const inGrams = metalValue(TOLA_IN_GRAMS, "g", row("24K"));
    expect(inGrams.grams).toBe(TOLA_IN_GRAMS);
    expect(inGrams.tolas).toBeCloseTo(1, 10);

    const inTolas = metalValue(2, "tola", row("24K"));
    expect(inTolas.grams).toBeCloseTo(2 * TOLA_IN_GRAMS, 10);
    expect(inTolas.tolas).toBe(2);
  });

  test("is zero for nothing", () => {
    expect(metalValue(0, "g", row("24K")).value).toBe(0);
  });
});

describe("the board", () => {
  test("shows the gold rows in order and leaves silver off", () => {
    expect(goldOnly(BOARD).map((r) => r.karat)).toEqual([...GOLD_KARATS]);
  });

  test("keeps a row that has no rate yet", () => {
    // Silver with no published figure still holds its place. A row that
    // vanishes reads as "we do not deal in this".
    const silver = rateBoard(withoutSilver).find((r) => r.karat === "999");
    expect(silver).toBeDefined();
    expect(silver?.rate).toBeUndefined();
  });

  test("drops an unpublished row from the cards", () => {
    // Cards go the other way: one reading "—" invites the reader to wonder
    // whether the shop forgot.
    expect(rateCards(withoutSilver).map((c) => c.karat)).toEqual([...GOLD_KARATS]);
  });

  test("names the metals the way the counter does", () => {
    const cards = rateCards(BOARD);
    expect(cards.find((c) => c.karat === "24K")?.label).toBe("Gold Piece");
    expect(cards.find((c) => c.karat === "23.65K")?.label).toBe("Gold Pathor");
    expect(cards.find((c) => c.karat === "999")?.label).toBe("Silver");
  });

  test("finds nothing in a board that is not there", () => {
    expect(rateFor(undefined, "22K")).toBeUndefined();
    expect(rateFor(BOARD, "14K")).toBeUndefined();
  });
});

describe("quoting a purity", () => {
  test("returns a published row exactly as published", () => {
    // 22K is a price the shop set. It is never re-derived.
    expect(sellingRateFor(BOARD, "22K")?.perTola).toBe(370000);
    expect(buyingRateFor(BOARD, "22K")?.perTola).toBe(370000);
  });

  test("works an unpublished purity from pathor", () => {
    // 403,500 x 21/24 = 353,062.5, to the nearest hundred.
    expect(sellingRateFor(BOARD, "21K")?.perTola).toBe(353100);
    // 403,500 x 18/24 = 302,625.
    expect(sellingRateFor(BOARD, "18K")?.perTola).toBe(302600);
  });

  test("prices a hallmark no button offers", () => {
    // 19.5K exists on real jewellery even though nothing on screen lists it.
    expect(sellingRateFor(BOARD, "19.5K")?.perTola).toBe(327800);
  });

  test("derives per-gram from the derived per-tola", () => {
    const derived = sellingRateFor(BOARD, "21K")!;
    expect(derived.perGram).toBe(perGramFromTola(derived.perTola));
  });

  test("treats 23.650K as the published 23.65K row", () => {
    // Canonicalised, so a trailing zero cannot re-derive a rate that is
    // already on the board and land a hundred rupees away from it.
    expect(sellingRateFor(BOARD, "23.650K")?.perTola).toBe(403500);
  });

  test("refuses anything that is not a gold purity", () => {
    // A purity that cannot exist, silver's mark, and plain rubbish. Each of
    // these would otherwise become an invented quote.
    for (const bad of ["25K", "999", "0K", "abc", "", "K", "-22K"]) {
      expect(sellingRateFor(BOARD, bad)).toBeUndefined();
      expect(buyingRateFor(BOARD, bad)).toBeUndefined();
    }
  });

  test("quotes nothing from the fallback figures", () => {
    // The fallback exists so a rate band never renders empty. Quoting a
    // customer from it would put a price on the page that nobody set.
    expect(sellingRateFor(FALLBACK_SNAPSHOT, "22K")).toBeUndefined();
    expect(buyingRateFor(FALLBACK_SNAPSHOT, "21K")).toBeUndefined();
    expect(sellingRateFor(undefined, "22K")).toBeUndefined();
  });
});

describe("the shop's clock", () => {
  test("reads a publish time in Mandi Bahauddin, not in the reader's city", () => {
    // 07:12 UTC is 12:12 pm in Pakistan. A customer in London has to see the
    // moment the shop set the price, not their own afternoon.
    const parts = rateStampParts(BOARD.publishedAt!);
    expect(parts?.date).toBe("02 November 2026");
    expect(parts?.time).toMatch(/^12:12\s*pm$/i);
  });

  test("labels the zone so a bare time cannot be misread", () => {
    expect(formatRateTimestamp(BOARD.publishedAt!)).toMatch(
      /^02 November 2026 at 12:12\s*pm PKT$/i,
    );
  });

  test("says nothing it cannot read", () => {
    expect(rateStampParts("not a date")).toBeUndefined();
    expect(formatRateTimestamp("not a date")).toBe("");
    expect(formatRateDate("")).toBe("");
  });

  test("keeps a plain date on its own day", () => {
    // Parsed at UTC noon, so no timezone can roll it back to the 1st.
    expect(formatRateDate("2026-11-02")).toBe("02 November 2026");
  });

  test("falls back to the date when there is no publish time", () => {
    const { publishedAt: _unused, ...undated } = BOARD;
    expect(formatRateStamp(undated)).toBe("02 November 2026");
    expect(formatRateStamp(BOARD)).toMatch(/12:12\s*pm PKT$/i);
  });
});
