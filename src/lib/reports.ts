import { livePriceFor, liveSalePrice } from "@/lib/pricing";
import { TOLA_IN_GRAMS } from "@/lib/rates";
import type { RatePoint, RateSnapshot } from "@/lib/rates";

/**
 * The arithmetic behind /admin/reports.
 *
 * Kept out of the screen because all of it is pure — rows in, totals out, no
 * React and no network — which is the only reason it can be tested. The screen
 * is then a layout of these results and nothing more.
 *
 * Nothing here prices a piece itself. `valueAt` is deliberately the same
 * sequence of decisions `priceOf` in `@/lib/catalogue` makes, down to falling
 * back on the gross weight when a net weight is missing and on the stored
 * figure when the rate cannot be applied. That is not duplication for its own
 * sake: it is what makes the stock total the sum of the prices a customer
 * would actually be quoted. A total that priced silver at zero, or skipped it,
 * would be quietly and expensively low.
 */

/** The stored parts of a piece this module needs. Snake_case, as the table has it. */
export type ReportRow = {
  id: string;
  sku: string;
  name: string;
  metal: string;
  karat: string;
  category_slug: string;
  gross_weight_g: number;
  net_weight_g: number | null;
  polish_g_per_tola?: number | null;
  making_charges_pkr: number | null;
  stone_value_pkr: number | null;
  price_pkr: number | null;
  sale_price_pkr: number | null;
  discount_pkr?: number | null;
  sold_at?: string | null;
};

export type Valued<T extends ReportRow = ReportRow> = {
  product: T;
  /** What this piece would be quoted at today, after any discount. */
  pricePkr: number;
  /**
   * The grams the rate was charged on — metal plus polish, never the stones.
   * Absent for a piece priced from its stored figure, which has no such weight.
   */
  pricedWeightG: number | undefined;
  /**
   * True when the price came from the stored column rather than today's rate:
   * silver, which the shop prices by hand, or a piece with no making charge
   * recorded, which would otherwise price at bare metal and undersell itself.
   */
  fromStored: boolean;
};

/** A piece at today's rate, or at its stored price where the rate does not reach. */
export function valueAt<T extends ReportRow>(
  product: T,
  snapshot: RateSnapshot | undefined,
): Valued<T> {
  const live = livePriceFor(
    {
      metal: product.metal,
      karat: product.karat,
      netWeightG: Number(product.net_weight_g ?? product.gross_weight_g),
      polishGPerTola: product.polish_g_per_tola ?? 0,
      makingChargesPkr: product.making_charges_pkr ?? 0,
      stoneValuePkr: product.stone_value_pkr ?? 0,
    },
    snapshot,
  );

  if (!live || product.making_charges_pkr == null) {
    return {
      product,
      pricePkr: product.sale_price_pkr ?? product.price_pkr ?? 0,
      pricedWeightG: undefined,
      fromStored: true,
    };
  }

  const discounted = liveSalePrice(
    product.price_pkr ?? 0,
    product.sale_price_pkr,
    live.pricePkr,
    product.discount_pkr,
  );

  return {
    product,
    pricePkr: discounted ?? live.pricePkr,
    pricedWeightG: live.pricedWeightG,
    fromStored: false,
  };
}

/** Grams as tola, the unit the market quotes and the shop thinks in. */
export function formatTola(grams: number): string {
  return `${(grams / TOLA_IN_GRAMS).toFixed(3)} tola`;
}

export type Group = { key: string; label: string; pieces: number; grams: number; value: number };

/** Rolls valued pieces up by whatever key is asked for, dearest group first. */
export function groupBy<T extends ReportRow>(
  rows: Valued<T>[],
  keyOf: (row: Valued<T>) => string,
  labelOf: (key: string) => string,
): Group[] {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key) ?? { key, label: labelOf(key), pieces: 0, grams: 0, value: 0 };
    group.pieces += 1;
    group.grams += row.pricedWeightG ?? 0;
    group.value += row.pricePkr;
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => b.value - a.value);
}

/**
 * The rate on, or last published before, a given number of days ago.
 *
 * By date rather than by counting rows back: the rate is not published every
 * single day — this shop has about eighty published days across ninety
 * calendar ones — so "thirty rows ago" and "thirty days ago" are different
 * questions and only one of them is being asked. Returns nothing when the
 * history does not reach that far, so the screen can show a dash instead of a
 * change measured against whatever the oldest row happens to be.
 *
 * `series` is oldest first, which is also the order the chart draws in.
 */
export function ratePriorTo(series: RatePoint[], days: number): RatePoint | undefined {
  const latest = series[series.length - 1];
  if (!latest) return undefined;

  const target = new Date(`${latest.date}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  const iso = target.toISOString().slice(0, 10);

  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index];
    if (point && point.date <= iso) return point;
  }
  return undefined;
}

export type StockReport<T extends ReportRow> = {
  forSale: Valued<T>[];
  /** Newest sale first. */
  sold: Valued<T>[];
  /** Everything for sale, at the price each would be quoted at today. */
  value: number;
  /** Grams the rate is charged on, across everything for sale. */
  grams: number;
  /** For-sale pieces priced from their stored figure rather than the rate. */
  fromStored: number;
  byCategory: Group[];
  byMetal: Group[];
};

/** The whole screen's figures, from the catalogue and one rate snapshot. */
export function buildStockReport<T extends ReportRow>(
  products: T[],
  snapshot: RateSnapshot | undefined,
  categoryName: (slug: string) => string,
): StockReport<T> {
  const rows = products.map((product) => valueAt(product, snapshot));
  const forSale = rows.filter((row) => !row.product.sold_at);
  const sold = rows
    .filter((row) => row.product.sold_at)
    .sort((a, b) => (b.product.sold_at ?? "").localeCompare(a.product.sold_at ?? ""));

  return {
    forSale,
    sold,
    value: forSale.reduce((total, row) => total + row.pricePkr, 0),
    grams: forSale.reduce((total, row) => total + (row.pricedWeightG ?? 0), 0),
    fromStored: forSale.filter((row) => row.fromStored).length,
    byCategory: groupBy(
      forSale,
      (row) => row.product.category_slug,
      (slug) => categoryName(slug),
    ),
    byMetal: groupBy(
      forSale,
      (row) => `${row.product.metal} ${row.product.karat}`,
      (key) => key,
    ),
  };
}
