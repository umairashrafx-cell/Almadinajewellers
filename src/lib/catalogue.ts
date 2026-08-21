import bridal from "@/assets/cat-bridal.jpg";
import bangles from "@/assets/cat-bangles.jpg";
import rings from "@/assets/cat-rings.jpg";
import earrings from "@/assets/cat-earrings.jpg";
import lockets from "@/assets/cat-lockets.jpg";
import silver from "@/assets/cat-silver.jpg";
import heroBridal from "@/assets/hero-bridal.jpg";

import type { Product } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { fetchRateSnapshot, type RateSnapshot } from "@/lib/rates";
import { livePriceFor, liveSalePrice } from "@/lib/pricing";

/**
 * Bundled placeholder art, keyed by the short strings ("bridal", "rings") that
 * products.image_keys held before real photography existed. Rows still carrying
 * those keys keep rendering; rows the admin panel has uploaded a photograph for
 * carry a storage object path instead.
 */
const IMAGES: Record<string, string> = {
  bridal,
  bangles,
  rings,
  earrings,
  lockets,
  silver,
  heroBridal,
};

const FALLBACK_IMAGE = bridal;

/** Bucket the admin panel uploads product photography into. */
export const PRODUCT_IMAGE_BUCKET = "product-images";

/**
 * Resolves one image_keys entry to something an <img src> can use.
 *
 * Three shapes are accepted, in the order the catalogue is migrating through:
 * a placeholder key, an uploaded storage object path (always contains a slash),
 * or an absolute URL. An unrecognised value falls back to a placeholder rather
 * than rendering a broken image.
 */
export function imageFor(key: string | undefined): string {
  if (!key) return FALLBACK_IMAGE;
  if (IMAGES[key]) return IMAGES[key];
  if (/^https?:\/\//i.test(key)) return key;
  if (key.includes("/")) {
    return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(key).data.publicUrl;
  }
  return FALLBACK_IMAGE;
}

export type Category = {
  slug: string;
  name: string;
  image: string;
  sortOrder: number;
};

type ProductRow = {
  net_weight_g?: number | null;
  making_charges_pkr?: number | null;
  stone_value_pkr?: number | null;
  id: string;
  sku: string;
  name: string;
  slug: string;
  category_slug: string;
  metal: string;
  karat: string;
  gross_weight_g: number;
  stones: string;
  price_pkr: number;
  sale_price_pkr: number | null;
  image_keys: string[];
  is_new: boolean;
  created_at: string;
};

/**
 * Detail-only columns. Optional because a product added before the detail
 * migration — or through a future admin screen that skips them — must still
 * render a usable page rather than an error.
 */
type ProductDetailRow = ProductRow & {
  description?: string | null;
  net_weight_g?: number | null;
  stone_weight_ct?: number | null;
  dimensions?: string | null;
  sizes?: string[] | null;
  metal_value_pkr?: number | null;
  making_charges_pkr?: number | null;
  stone_value_pkr?: number | null;
  rate_basis_pkr_per_g?: number | null;
};

/**
 * Today's price for a row, or the stored one when it cannot be rebuilt.
 *
 * price_pkr is the figure the piece was last saved at. It is kept as a fallback
 * and for coarse ordering in SQL, but what a visitor sees is recomputed here
 * against the published rate, so the catalogue never quotes a stale gold price.
 */
function priceOf(row: ProductRow, snapshot: RateSnapshot | undefined) {
  const live = livePriceFor(
    {
      metal: row.metal,
      karat: row.karat,
      netWeightG: Number(row.net_weight_g ?? row.gross_weight_g),
      makingChargesPkr: row.making_charges_pkr ?? 0,
      stoneValuePkr: row.stone_value_pkr ?? 0,
    },
    snapshot,
  );

  // A piece with no stored making charge would price at bare metal value, which
  // would be a real and expensive lie. Fall back to the stored figure instead.
  if (!live || row.making_charges_pkr == null) {
    return { pricePkr: row.price_pkr, salePricePkr: row.sale_price_pkr ?? undefined };
  }

  return {
    pricePkr: live.pricePkr,
    salePricePkr: liveSalePrice(row.price_pkr, row.sale_price_pkr, live.pricePkr),
    live,
  };
}

/** Maps a database row onto the Product shape ProductCard already consumes. */
export function mapProduct(
  row: ProductRow,
  categoryName: string,
  snapshot?: RateSnapshot | undefined,
): Product {
  const { pricePkr, salePricePkr } = priceOf(row, snapshot);

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    category: categoryName,
    metal: row.metal as Product["metal"],
    karat: row.karat,
    grossWeightG: Number(row.gross_weight_g),
    stones: row.stones,
    pricePkr,
    // tsconfig sets exactOptionalPropertyTypes, so an optional field must be
    // omitted entirely rather than set to undefined.
    ...(salePricePkr !== undefined ? { salePricePkr } : {}),
    images: [imageFor(row.image_keys?.[0]), imageFor(row.image_keys?.[1] ?? row.image_keys?.[0])],
    isNew: row.is_new,
  };
}

/**
 * The day's rates, or undefined if they cannot be read.
 *
 * Prices degrade to the last saved figure when this fails. A catalogue showing
 * yesterday's price is a small problem; a catalogue that will not load because
 * the rate table hiccuped is a much larger one.
 */
async function safeRateSnapshot(): Promise<RateSnapshot | undefined> {
  try {
    return await fetchRateSnapshot();
  } catch {
    return undefined;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, image_key, sort_order")
    .order("sort_order");

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    image: imageFor(c.image_key),
    sortOrder: c.sort_order,
  }));
}

export type CollectionData = {
  category: Category;
  products: Product[];
};

/**
 * Loads one category and all of its products in a single round trip.
 * The catalogue is small (48 rows), so filtering and sorting happen in memory —
 * that keeps live filter counts exact and avoids a query per facet change.
 */
export async function fetchCollection(slug: string): Promise<CollectionData> {
  const [snapshot, categoryResult, productsResult] = await Promise.all([
    safeRateSnapshot(),
    supabase
      .from("categories")
      .select("slug, name, image_key, sort_order")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("products")
      .select(BASE_COLUMNS)
      .eq("category_slug", slug)
      .order("created_at", { ascending: false }),
  ]);

  if (categoryResult.error) throw new Error(categoryResult.error.message);
  if (productsResult.error) throw new Error(productsResult.error.message);
  if (!categoryResult.data) throw new Error(`No collection found for "${slug}".`);

  const category: Category = {
    slug: categoryResult.data.slug,
    name: categoryResult.data.name,
    image: imageFor(categoryResult.data.image_key),
    sortOrder: categoryResult.data.sort_order,
  };

  return {
    category,
    products: (productsResult.data ?? []).map((row) =>
      mapProduct(row as ProductRow, category.name, snapshot),
    ),
  };
}

/**
 * Homepage product rails, from the same catalogue the collection pages use.
 * They were static fixtures before, which meant the homepage advertised pieces
 * that were not in the catalogue at all and could not be linked to.
 *
 * bridal  — the heaviest sets, price high to low, to anchor price perception.
 * everyday — the most accessible gold, price low to high, for the visitor the
 *            bridal rail just priced out.
 */
export async function fetchHomeRails(): Promise<{ bridal: Product[]; everyday: Product[] }> {
  const [snapshot, bridalResult, everydayResult] = await Promise.all([
    safeRateSnapshot(),
    supabase
      .from("products")
      .select(BASE_COLUMNS)
      .eq("category_slug", "bridal-sets")
      .order("price_pkr", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select(BASE_COLUMNS)
      .neq("category_slug", "bridal-sets")
      .eq("metal", "gold")
      .order("price_pkr", { ascending: true })
      .limit(8),
  ]);

  if (bridalResult.error) throw new Error(bridalResult.error.message);
  if (everydayResult.error) throw new Error(everydayResult.error.message);

  // The SQL above orders by the stored price_pkr, which is only ever an
  // approximation of today's. Re-sort on the live figures so the rails really
  // are the heaviest sets and the most accessible gold.
  const bridal = (bridalResult.data ?? [])
    .map((r) => mapProduct(r as ProductRow, "Bridal Sets", snapshot))
    .sort((a, b) => (b.salePricePkr ?? b.pricePkr) - (a.salePricePkr ?? a.pricePkr));

  const everyday = (everydayResult.data ?? [])
    .map((r) => mapProduct(r as ProductRow, "Everyday Gold", snapshot))
    .sort((a, b) => (a.salePricePkr ?? a.pricePkr) - (b.salePricePkr ?? b.pricePkr));

  return { bridal, everyday };
}

/** Maps category slugs to display names, for queries that span categories. */
async function categoryNames(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("categories").select("slug, name");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((c) => [c.slug, c.name]));
}

/**
 * The whole catalogue. Only 48 rows, so search filters this in memory rather
 * than issuing a query per keystroke — same reasoning as fetchCollection.
 */
export async function fetchAllProducts(): Promise<Product[]> {
  const [snapshot, names, productsResult] = await Promise.all([
    safeRateSnapshot(),
    categoryNames(),
    supabase.from("products").select(BASE_COLUMNS).order("created_at", { ascending: false }),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);

  return (productsResult.data ?? []).map((row) => {
    const r = row as ProductRow;
    return mapProduct(r, names.get(r.category_slug) ?? r.category_slug, snapshot);
  });
}

/** Pieces flagged new, newest first. */
export async function fetchNewArrivals(): Promise<Product[]> {
  const [snapshot, names, productsResult] = await Promise.all([
    safeRateSnapshot(),
    categoryNames(),
    supabase
      .from("products")
      .select(BASE_COLUMNS)
      .eq("is_new", true)
      .order("created_at", { ascending: false }),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);

  return (productsResult.data ?? []).map((row) => {
    const r = row as ProductRow;
    return mapProduct(r, names.get(r.category_slug) ?? r.category_slug, snapshot);
  });
}

/** Looks up saved wishlist entries by SKU. Returns [] for an empty list. */
export async function fetchProductsBySkus(skus: string[]): Promise<Product[]> {
  if (skus.length === 0) return [];

  const [snapshot, names, productsResult] = await Promise.all([
    safeRateSnapshot(),
    categoryNames(),
    supabase.from("products").select(BASE_COLUMNS).in("sku", skus),
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);

  const found = (productsResult.data ?? []).map((row) => {
    const r = row as ProductRow;
    return mapProduct(r, names.get(r.category_slug) ?? r.category_slug, snapshot);
  });

  // Preserve the order the visitor saved them in.
  const bySku = new Map(found.map((p) => [p.sku, p]));
  return skus.map((sku) => bySku.get(sku)).filter((p): p is Product => Boolean(p));
}

/**
 * Simple relevance search over name, category and stones. Exact-ish name
 * matches rank first, so typing "jhumka" does not surface a locket because its
 * stone list happens to mention pearls.
 */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const scored = products
    .map((p) => {
      const name = p.name.toLowerCase();
      let score = 0;
      if (name.startsWith(q)) score = 100;
      else if (name.includes(q)) score = 80;
      else if (p.category.toLowerCase().includes(q)) score = 50;
      else if (p.karat.toLowerCase() === q || p.metal.toLowerCase() === q) score = 40;
      else if (p.stones.toLowerCase().includes(q)) score = 20;
      return { p, score };
    })
    .filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  return scored.map((s) => s.p);
}

/**
 * The three parts of a listed price. Seeded so they sum to price_pkr exactly —
 * a customer with a calculator is the intended audience for this panel.
 */
export type PriceBreakdown = {
  metalValuePkr: number;
  makingChargesPkr: number;
  stoneValuePkr: number;
  /** The per-gram rate the metal value was struck at. */
  rateBasisPkrPerG: number;
};

export type ProductDetail = Product & {
  categorySlug: string;
  description: string;
  netWeightG: number;
  stoneWeightCt?: number;
  dimensions?: string;
  sizes: string[];
  /** Absent when the piece has no stored decomposition. */
  breakdown?: PriceBreakdown;
};

export type ProductPage = {
  product: ProductDetail;
  categoryName: string;
  related: Product[];
};

/**
 * net_weight_g, making_charges_pkr and stone_value_pkr are here because prices
 * are rebuilt from them against the day's rate — see lib/pricing. Without them
 * a product card could only show the price the piece was last saved at.
 */
const BASE_COLUMNS =
  "id, sku, name, slug, category_slug, metal, karat, gross_weight_g, net_weight_g, stones, price_pkr, sale_price_pkr, making_charges_pkr, stone_value_pkr, image_keys, is_new, created_at";

const DETAIL_COLUMNS = `${BASE_COLUMNS}, description, stone_weight_ct, dimensions, sizes, metal_value_pkr, rate_basis_pkr_per_g`;

/**
 * Fetches one product, falling back to the base columns if the detail columns
 * are not in the database yet. Postgrest rejects the whole select when a column
 * is unknown, so without this the page would break in the window between a
 * deploy and its migration being applied.
 */
async function selectProductRow(slug: string): Promise<ProductDetailRow> {
  const full = await supabase
    .from("products")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (!full.error) {
    if (!full.data) throw new Error(`No product found for "${slug}".`);
    return full.data as ProductDetailRow;
  }

  const base = await supabase.from("products").select(BASE_COLUMNS).eq("slug", slug).maybeSingle();

  if (base.error) throw new Error(base.error.message);
  if (!base.data) throw new Error(`No product found for "${slug}".`);

  console.warn(
    "[catalogue] Product detail columns are missing — run the product_detail_and_gold_rates migration.",
  );
  return base.data as ProductDetailRow;
}

function mapDetail(
  row: ProductDetailRow,
  categoryName: string,
  snapshot?: RateSnapshot | undefined,
): ProductDetail {
  const base = mapProduct(row, categoryName, snapshot);
  const { live } = priceOf(row, snapshot);

  const parts = [row.metal_value_pkr, row.making_charges_pkr, row.stone_value_pkr];
  const hasBreakdown =
    parts.every((v) => typeof v === "number") && typeof row.rate_basis_pkr_per_g === "number";

  return {
    ...base,
    categorySlug: row.category_slug,
    description: row.description ?? "",
    // Net weight is what the metal is actually valued on; fall back to gross.
    netWeightG: Number(row.net_weight_g ?? row.gross_weight_g),
    sizes: row.sizes ?? [],
    // exactOptionalPropertyTypes: omit rather than set undefined.
    ...(row.stone_weight_ct != null ? { stoneWeightCt: Number(row.stone_weight_ct) } : {}),
    ...(row.dimensions ? { dimensions: row.dimensions } : {}),
    // The metal value and the rate it was struck at come from today's rate when
    // one is published, so the panel's arithmetic matches the price above it.
    // Making and stone value are stored figures and do not move.
    ...(hasBreakdown
      ? {
          breakdown: {
            metalValuePkr: live?.metalValuePkr ?? (row.metal_value_pkr as number),
            makingChargesPkr: row.making_charges_pkr as number,
            stoneValuePkr: row.stone_value_pkr as number,
            rateBasisPkrPerG: live?.ratePerGram ?? (row.rate_basis_pkr_per_g as number),
          },
        }
      : {}),
  };
}

/**
 * One product plus its category name and four siblings for "You may also like".
 * The category and related queries need the product's category_slug, so this is
 * two waves rather than one.
 */
export async function fetchProductPage(slug: string): Promise<ProductPage> {
  const productRow = await selectProductRow(slug);

  const [snapshot, categoryResult, relatedResult] = await Promise.all([
    safeRateSnapshot(),
    supabase.from("categories").select("name").eq("slug", productRow.category_slug).maybeSingle(),
    supabase
      .from("products")
      .select(BASE_COLUMNS)
      .eq("category_slug", productRow.category_slug)
      .neq("slug", slug)
      .limit(4),
  ]);

  if (categoryResult.error) throw new Error(categoryResult.error.message);
  if (relatedResult.error) throw new Error(relatedResult.error.message);

  const categoryName = categoryResult.data?.name ?? productRow.category_slug;

  return {
    product: mapDetail(productRow, categoryName, snapshot),
    categoryName,
    related: (relatedResult.data ?? []).map((r) =>
      mapProduct(r as ProductRow, categoryName, snapshot),
    ),
  };
}

/** Short editorial line under the category banner. */
export const CATEGORY_BLURBS: Record<string, string> = {
  "bridal-sets":
    "Complete bridal suites in 21K and 22K gold. Every set is hallmarked, weighed in front of you, and priced against the day's rate.",
  "gold-bangles":
    "Karay and cuffs for daily wear and for keeping. Hand-finished in the workshop, from slim pairs to wide engraved bands.",
  rings:
    "Solitaires, bands and everyday rings in gold and certified diamond. Sizing adjusted in store at no charge.",
  earrings:
    "Jhumkay, chandbali and tops. Light enough for every day, detailed enough for the occasion.",
  "lockets-chains":
    "Ayat pendants, lockets and rope chains. A first gift, and often the one that gets worn the longest.",
  "silver-essentials":
    "925 sterling silver, properly stamped. Stacking rings, cuffs, anklets and studs at accessible prices.",
};
