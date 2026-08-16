import type { Product } from "@/data/products";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "weight-asc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "weight-asc", label: "Weight: low to high" },
];

export type Range = [number, number];

export type Filters = {
  metals: string[];
  karats: string[];
  stones: string[];
  price: Range;
  weight: Range;
};

export type Bounds = { price: Range; weight: Range };

/** Effective selling price — sale price wins when present. */
export function effectivePrice(p: Product): number {
  return p.salePricePkr ?? p.pricePkr;
}

/** Widest price and weight span across a product set, rounded outwards. */
export function boundsOf(products: Product[]): Bounds {
  if (products.length === 0) {
    return { price: [0, 0], weight: [0, 0] };
  }

  const prices = products.map(effectivePrice);
  const weights = products.map((p) => p.grossWeightG);

  return {
    price: [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))],
    weight: [Math.floor(Math.min(...weights)), Math.ceil(Math.max(...weights))],
  };
}

export function emptyFilters(bounds: Bounds): Filters {
  return { metals: [], karats: [], stones: [], price: bounds.price, weight: bounds.weight };
}

export type Facet = "metals" | "karats" | "stones" | "price" | "weight";

/**
 * Does a product survive the active filters?
 * `skip` excludes one facet — used to compute live counts, so that the numbers
 * beside each checkbox reflect the other filters but not the facet's own state.
 */
export function passes(p: Product, f: Filters, skip?: Facet): boolean {
  if (skip !== "metals" && f.metals.length > 0 && !f.metals.includes(p.metal)) return false;
  if (skip !== "karats" && f.karats.length > 0 && !f.karats.includes(p.karat)) return false;
  if (skip !== "stones" && f.stones.length > 0 && !f.stones.includes(p.stones)) return false;

  if (skip !== "price") {
    const v = effectivePrice(p);
    if (v < f.price[0] || v > f.price[1]) return false;
  }

  if (skip !== "weight") {
    if (p.grossWeightG < f.weight[0] || p.grossWeightG > f.weight[1]) return false;
  }

  return true;
}

/** Distinct values for a checkbox facet, in a stable display order. */
export function optionsFor(products: Product[], facet: "metals" | "karats" | "stones"): string[] {
  const key = facet === "metals" ? "metal" : facet === "karats" ? "karat" : "stones";
  const values = Array.from(new Set(products.map((p) => String(p[key as keyof Product]))));

  if (facet === "metals") {
    const order = ["gold", "silver", "diamond"];
    return values.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  if (facet === "karats") {
    // 925 (silver) sorts after the gold karats.
    return values.sort((a, b) => {
      const na = a === "925" ? 999 : parseInt(a, 10);
      const nb = b === "925" ? 999 : parseInt(b, 10);
      return na - nb;
    });
  }

  return values.sort((a, b) => a.localeCompare(b));
}

/** How many products would match if this option were the only change. */
export function countFor(
  products: Product[],
  filters: Filters,
  facet: "metals" | "karats" | "stones",
  option: string,
): number {
  const key = facet === "metals" ? "metal" : facet === "karats" ? "karat" : "stones";
  return products.filter(
    (p) => passes(p, filters, facet) && String(p[key as keyof Product]) === option,
  ).length;
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const out = [...products];

  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-desc":
      return out.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "weight-asc":
      return out.sort((a, b) => a.grossWeightG - b.grossWeightG);
    case "newest":
      return out.sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
    case "featured":
    default:
      // Featured = new items first, then heaviest (highest-ticket) pieces.
      return out.sort(
        (a, b) =>
          Number(b.isNew ?? false) - Number(a.isNew ?? false) ||
          effectivePrice(b) - effectivePrice(a),
      );
  }
}

/** True when anything has been narrowed from the full set. */
export function isDirty(f: Filters, bounds: Bounds): boolean {
  return (
    f.metals.length > 0 ||
    f.karats.length > 0 ||
    f.stones.length > 0 ||
    f.price[0] !== bounds.price[0] ||
    f.price[1] !== bounds.price[1] ||
    f.weight[0] !== bounds.weight[0] ||
    f.weight[1] !== bounds.weight[1]
  );
}
