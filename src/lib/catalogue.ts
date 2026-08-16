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
