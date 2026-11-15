import bridal from "@/assets/cat-bridal.webp";
import bangles from "@/assets/cat-bangles.webp";
import rings from "@/assets/cat-rings.webp";
import earrings from "@/assets/cat-earrings.webp";
import lockets from "@/assets/cat-lockets.webp";
import silver from "@/assets/cat-silver.webp";

/** Shape the product card and detail page consume. Rows come from Supabase. */
export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  metal: "gold" | "silver" | "diamond";
  karat: string;
  grossWeightG: number;
  /**
   * Metal plus polish: the grams the gold rate is charged on, and the weight
   * shown wherever a piece is listed. Absent on a piece with no stored net
   * weight, where the gross figure stands in.
   */
  pricedWeightG?: number;
  stones: string;
  pricePkr: number;
  salePricePkr?: number;
  images: [string, string];
  isNew?: boolean;
  /**
   * When the piece sold. Present only on a sold piece, which is shown labelled
   * SOLD with no price and no way to order it — see lib/catalogue.
   */
  soldAt?: string;
};

export const categories = [
  { name: "Bridal Sets", slug: "bridal-sets", image: bridal },
  { name: "Gold Bangles", slug: "gold-bangles", image: bangles },
  { name: "Rings", slug: "rings", image: rings },
  { name: "Earrings", slug: "earrings", image: earrings },
  { name: "Lockets & Chains", slug: "lockets-chains", image: lockets },
  { name: "Silver Essentials", slug: "silver-essentials", image: silver },
];
