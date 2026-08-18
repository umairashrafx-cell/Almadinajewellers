import bridal from "@/assets/cat-bridal.jpg";
import bangles from "@/assets/cat-bangles.jpg";
import rings from "@/assets/cat-rings.jpg";
import earrings from "@/assets/cat-earrings.jpg";
import lockets from "@/assets/cat-lockets.jpg";
import silver from "@/assets/cat-silver.jpg";
import heroBridal from "@/assets/hero-bridal.jpg";

import type { Product } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

/**
 * The products table stores `image_keys` as short strings ("bridal", "rings"),
 * not URLs — real photography is not uploaded yet. This maps those keys onto
 * the bundled placeholder assets. When real images land in Supabase Storage,
 * replace imageFor() with a public-URL builder and nothing else has to change.
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

export function imageFor(key: string | undefined): string {
  return (key && IMAGES[key]) || FALLBACK_IMAGE;
}

export type Category = {
  slug: string;
  name: string;
  image: string;
  sortOrder: number;
};

type ProductRow = {
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

/** Maps a database row onto the Product shape ProductCard already consumes. */
export function mapProduct(row: ProductRow, categoryName: string): Product {
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
    pricePkr: row.price_pkr,
    // tsconfig sets exactOptionalPropertyTypes, so an optional field must be
    // omitted entirely rather than set to undefined.
    ...(row.sale_price_pkr !== null ? { salePricePkr: row.sale_price_pkr } : {}),
    images: [imageFor(row.image_keys?.[0]), imageFor(row.image_keys?.[1] ?? row.image_keys?.[0])],
    isNew: row.is_new,
  };
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
  const [categoryResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("slug, name, image_key, sort_order")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("products")
      .select(
        "id, sku, name, slug, category_slug, metal, karat, gross_weight_g, stones, price_pkr, sale_price_pkr, image_keys, is_new, created_at",
      )
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
      mapProduct(row as ProductRow, category.name),
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
  const [bridalResult, everydayResult] = await Promise.all([
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

  return {
    bridal: (bridalResult.data ?? []).map((r) => mapProduct(r as ProductRow, "Bridal Sets")),
    everyday: (everydayResult.data ?? []).map((r) => mapProduct(r as ProductRow, "Everyday Gold")),
  };
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

const BASE_COLUMNS =
  "id, sku, name, slug, category_slug, metal, karat, gross_weight_g, stones, price_pkr, sale_price_pkr, image_keys, is_new, created_at";

const DETAIL_COLUMNS = `${BASE_COLUMNS}, description, net_weight_g, stone_weight_ct, dimensions, sizes, metal_value_pkr, making_charges_pkr, stone_value_pkr, rate_basis_pkr_per_g`;

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

function mapDetail(row: ProductDetailRow, categoryName: string): ProductDetail {
  const base = mapProduct(row, categoryName);

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
    ...(hasBreakdown
      ? {
          breakdown: {
            metalValuePkr: row.metal_value_pkr as number,
            makingChargesPkr: row.making_charges_pkr as number,
            stoneValuePkr: row.stone_value_pkr as number,
            rateBasisPkrPerG: row.rate_basis_pkr_per_g as number,
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

  const [categoryResult, relatedResult] = await Promise.all([
    supabase.from("categories").select("name").eq("slug", productRow.category_slug).maybeSingle(),
    supabase
      .from("products")
      .select(
        "id, sku, name, slug, category_slug, metal, karat, gross_weight_g, stones, price_pkr, sale_price_pkr, image_keys, is_new, created_at",
      )
      .eq("category_slug", productRow.category_slug)
      .neq("slug", slug)
      .limit(4),
  ]);

  if (categoryResult.error) throw new Error(categoryResult.error.message);
  if (relatedResult.error) throw new Error(relatedResult.error.message);

  const categoryName = categoryResult.data?.name ?? productRow.category_slug;

  return {
    product: mapDetail(productRow, categoryName),
    categoryName,
    related: (relatedResult.data ?? []).map((r) => mapProduct(r as ProductRow, categoryName)),
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
