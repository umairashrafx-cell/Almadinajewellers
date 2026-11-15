import { describe, expect, test } from "vitest";

import type { Product } from "@/data/products";
import { soldLast, sortProducts } from "@/lib/filters";

/**
 * Sold pieces in a collection.
 *
 * A sold piece stays on the site as a picture of what the workshop makes, but
 * the grid is the shop's stock first. Whatever order a visitor asks for, every
 * piece they can buy comes before any they cannot — otherwise sorting by price
 * puts a sold bridal set in the middle of the ones still for sale, and "high to
 * low" opens on something nobody can have.
 */

function piece(sku: string, price: number, extra: Partial<Product> = {}): Product {
  return {
    id: sku,
    sku,
    name: sku,
    slug: sku.toLowerCase(),
    category: "Rings",
    metal: "gold",
    karat: "22K",
    grossWeightG: price / 30000,
    stones: "",
    pricePkr: price,
    images: ["", ""],
    ...extra,
  };
}

const SOLD = "2026-11-15T18:14:00Z";

describe("soldLast", () => {
  test("puts sold pieces after the ones for sale", () => {
    const list = [piece("A", 1), piece("B", 2, { soldAt: SOLD }), piece("C", 3)];
    expect(soldLast(list).map((p) => p.sku)).toEqual(["A", "C", "B"]);
  });

  test("keeps the order it was given inside each group", () => {
    const list = [
      piece("S1", 1, { soldAt: SOLD }),
      piece("A", 1),
      piece("S2", 1, { soldAt: SOLD }),
      piece("B", 1),
    ];
    expect(soldLast(list).map((p) => p.sku)).toEqual(["A", "B", "S1", "S2"]);
  });

  test("leaves a catalogue with nothing sold exactly as it was", () => {
    const list = [piece("A", 3), piece("B", 1), piece("C", 2)];
    expect(soldLast(list)).toEqual(list);
  });

  test("does not change the list it was handed", () => {
    const list = [piece("S", 1, { soldAt: SOLD }), piece("A", 1)];
    soldLast(list);
    expect(list.map((p) => p.sku)).toEqual(["S", "A"]);
  });
});

describe("sortProducts with sold pieces", () => {
  const list = [
    piece("CHEAP", 100_000),
    piece("SOLD-DEAR", 900_000, { soldAt: SOLD }),
    piece("DEAR", 500_000),
    piece("SOLD-CHEAP", 50_000, { soldAt: SOLD }),
  ];

  test("price high to low still opens on something for sale", () => {
    expect(sortProducts(list, "price-desc").map((p) => p.sku)).toEqual([
      "DEAR",
      "CHEAP",
      "SOLD-DEAR",
      "SOLD-CHEAP",
    ]);
  });

  test("price low to high keeps the sold pieces at the end too", () => {
    expect(sortProducts(list, "price-asc").map((p) => p.sku)).toEqual([
      "CHEAP",
      "DEAR",
      "SOLD-CHEAP",
      "SOLD-DEAR",
    ]);
  });

  test("the default sort does the same", () => {
    const sorted = sortProducts(list, "featured");
    expect(sorted.slice(0, 2).every((p) => !p.soldAt)).toBe(true);
    expect(sorted.slice(2).every((p) => p.soldAt)).toBe(true);
  });
});
