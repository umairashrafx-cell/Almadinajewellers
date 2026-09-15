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
  stones: string;
  pricePkr: number;
  salePricePkr?: number;
  images: [string, string];
  isNew?: boolean;
};

export const categories = [
  { name: "Bridal Sets", slug: "bridal-sets", image: bridal },
  { name: "Gold Bangles", slug: "gold-bangles", image: bangles },
  { name: "Rings", slug: "rings", image: rings },
  { name: "Earrings", slug: "earrings", image: earrings },
  { name: "Lockets & Chains", slug: "lockets-chains", image: lockets },
  { name: "Silver Essentials", slug: "silver-essentials", image: silver },
];
