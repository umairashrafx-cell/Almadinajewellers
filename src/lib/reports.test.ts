import { describe, expect, it } from "vitest";

import { buildStockReport, groupBy, ratePriorTo, valueAt } from "@/lib/reports";
import type { ReportRow } from "@/lib/reports";
import type { RatePoint, RateSnapshot } from "@/lib/rates";

/**
 * These tests cover the three things on the reports screen that would be
 * wrong without announcing it.
 *
 * A stock total that silently drops the pieces the gold rate cannot price is
 * low by however much silver is on the shelf, and reads as a correct number.
 * A "30 days" change measured by counting thirty rows back is measured
 * against whatever date that happens to be — about five weeks here, because
 * the rate is not published every day. And a piece whose polish is not charged
 * at the rate is undersold by the weight of its own finishing.
 *
 * The fixtures use a round 30,000 per gram so every expected figure below can
 * be checked by hand rather than taken on trust.
 */

const RATE = 30000;

const SNAPSHOT: RateSnapshot = {
  date: "2026-11-15",
  rates: [
    { karat: "22K", perGram: RATE, perTola: 349914 },
    { karat: "24K", perGram: 34000, perTola: 396569 },
  ],
};

/** A gold piece with every stored part filled in, which callers then adjust. */
function piece(over: Partial<ReportRow> & { id: string }): ReportRow {
  return {
    sku: `SKU-${over.id}`,
    name: `Piece ${over.id}`,
    metal: "gold",
    karat: "22K",
    category_slug: "bridal-sets",
    gross_weight_g: 10,
    net_weight_g: 10,
    polish_g_per_tola: 0,
    making_charges_pkr: 50_000,
    stone_value_pkr: 25_000,
    price_pkr: 375_000,
    sale_price_pkr: null,
    discount_pkr: null,
    sold_at: null,
    ...over,
  };
}

describe("valueAt", () => {
  it("prices a piece at today's rate: metal, making and stones", () => {
    // 10 g x 30,000 = 300,000, plus 50,000 making and 25,000 of stones.
    const valued = valueAt(piece({ id: "a" }), SNAPSHOT);

    expect(valued.pricePkr).toBe(375_000);
    expect(valued.pricedWeightG).toBe(10);
    expect(valued.fromStored).toBe(false);
  });

  it("charges the rate on polish, which is gold laid on in finishing", () => {
    // One tola of metal carrying 1 g of polish is 12.664 g charged at rate.
    const valued = valueAt(
      piece({
        id: "b",
        net_weight_g: 11.6638,
        gross_weight_g: 11.6638,
        polish_g_per_tola: 1,
        making_charges_pkr: 0,
        stone_value_pkr: 0,
      }),
      SNAPSHOT,
    );

    expect(valued.pricedWeightG).toBe(12.664);
    expect(valued.pricePkr).toBe(379_920);
  });

  it("takes a discount off the live price in rupees, not as a share of it", () => {
    const valued = valueAt(piece({ id: "c", discount_pkr: 25_000 }), SNAPSHOT);

    expect(valued.pricePkr).toBe(350_000);
    expect(valued.fromStored).toBe(false);
  });

  it("falls back to the stored price for silver, which is not priced by the rate", () => {
    // The shop sets silver by hand. Valuing it at zero, or dropping it, would
    // make the stock total quietly low — the whole reason fromStored exists.
    const valued = valueAt(
      piece({ id: "d", metal: "silver", karat: "925", price_pkr: 42_000 }),
      SNAPSHOT,
    );

    expect(valued.pricePkr).toBe(42_000);
    expect(valued.pricedWeightG).toBeUndefined();
    expect(valued.fromStored).toBe(true);
  });

  it("falls back when no making charge is recorded, rather than pricing bare metal", () => {
    const valued = valueAt(piece({ id: "e", making_charges_pkr: null }), SNAPSHOT);

    expect(valued.pricePkr).toBe(375_000);
    expect(valued.fromStored).toBe(true);
  });

  it("falls back when the snapshot has no rate for that karat", () => {
    const valued = valueAt(piece({ id: "f", karat: "18K" }), SNAPSHOT);

    expect(valued.fromStored).toBe(true);
    expect(valued.pricePkr).toBe(375_000);
  });
});

describe("groupBy", () => {
  it("sums each group and puts the dearest first", () => {
    const rows = [
      valueAt(piece({ id: "a" }), SNAPSHOT),
      valueAt(piece({ id: "c", discount_pkr: 25_000 }), SNAPSHOT),
      valueAt(
        piece({
          id: "b",
          category_slug: "ladies-rings",
          net_weight_g: 11.6638,
          gross_weight_g: 11.6638,
          polish_g_per_tola: 1,
          making_charges_pkr: 0,
          stone_value_pkr: 0,
        }),
        SNAPSHOT,
      ),
    ];

    const groups = groupBy(
      rows,
      (row) => row.product.category_slug,
      (slug) => slug.toUpperCase(),
    );

    expect(groups.map((group) => group.key)).toEqual(["bridal-sets", "ladies-rings"]);
    expect(groups[0]).toMatchObject({ label: "BRIDAL-SETS", pieces: 2, value: 725_000, grams: 20 });
    expect(groups[1]).toMatchObject({ pieces: 1, value: 379_920, grams: 12.664 });
  });

  it("counts a stored-price piece in the value but not in the gold weight", () => {
    const rows = [
      valueAt(piece({ id: "a" }), SNAPSHOT),
      valueAt(piece({ id: "d", metal: "silver", karat: "925", price_pkr: 42_000 }), SNAPSHOT),
    ];

    const groups = groupBy(
      rows,
      () => "all",
      () => "All",
    );

    expect(groups[0]).toMatchObject({ pieces: 2, value: 417_000, grams: 10 });
  });
});

describe("ratePriorTo", () => {
  /* Deliberately uneven, the way a published rate actually is. */
  const SERIES: RatePoint[] = [
    { date: "2026-09-01", perTola: 300_000 },
    { date: "2026-10-01", perTola: 320_000 },
    { date: "2026-10-20", perTola: 340_000 },
    { date: "2026-11-15", perTola: 371_700 },
  ];

  it("looks back by date, not by counting rows", () => {
    // Three rows back is 1 September. Thirty days back is 1 October, and that
    // is the question being asked. Counting rows would report a 71,700 rise
    // where the real thirty-day move is 51,700.
    expect(ratePriorTo(SERIES, 30)).toEqual({ date: "2026-10-01", perTola: 320_000 });
    expect(ratePriorTo(SERIES, 7)).toEqual({ date: "2026-10-20", perTola: 340_000 });
  });

  it("gives nothing when the history does not reach back that far", () => {
    // Rather than quietly measuring against the oldest row it happens to hold.
    expect(ratePriorTo(SERIES, 365)).toBeUndefined();
    expect(ratePriorTo([], 7)).toBeUndefined();
  });

  it("counts from the newest published day, not from today", () => {
    // The shop may not have published for a few days; the change on screen is
    // still the change between two published figures.
    expect(ratePriorTo(SERIES, 0)).toEqual({ date: "2026-11-15", perTola: 371_700 });
  });
});

describe("buildStockReport", () => {
  const products = [
    piece({ id: "a" }),
    piece({ id: "d", metal: "silver", karat: "925", price_pkr: 42_000 }),
    piece({ id: "old", sold_at: "2026-11-10T09:00:00Z" }),
    piece({ id: "recent", sold_at: "2026-11-14T09:00:00Z" }),
  ];

  const report = buildStockReport(products, SNAPSHOT, (slug) => slug);

  it("separates what is for sale from what has gone", () => {
    expect(report.forSale.map((row) => row.product.id)).toEqual(["a", "d"]);
    expect(report.sold).toHaveLength(2);
  });

  it("puts the most recent sale first", () => {
    expect(report.sold.map((row) => row.product.id)).toEqual(["recent", "old"]);
  });

  it("values the silver in the stock total and leaves it out of the gold weight", () => {
    expect(report.value).toBe(417_000);
    expect(report.grams).toBe(10);
    expect(report.fromStored).toBe(1);
  });

  it("counts only what is for sale, never what has already sold", () => {
    // Two sold pieces at 375,000 each would nearly double the figure above.
    expect(report.forSale).toHaveLength(2);
    expect(report.byCategory.reduce((total, group) => total + group.pieces, 0)).toBe(2);
  });
});
