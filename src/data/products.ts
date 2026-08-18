import bridal from "@/assets/cat-bridal.jpg";
import bangles from "@/assets/cat-bangles.jpg";
import rings from "@/assets/cat-rings.jpg";
import earrings from "@/assets/cat-earrings.jpg";
import lockets from "@/assets/cat-lockets.jpg";
import silver from "@/assets/cat-silver.jpg";

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

export const testimonials = [
  {
    name: "Nimra Shahid",
    city: "Lahore",
    quote:
      "They weighed everything in front of me and explained each charge. My bridal set arrived exactly as promised.",
  },
  {
    name: "Sadia Iqbal",
    city: "Mandi Bahauddin",
    quote:
      "Three generations of my family have bought from this shop. The trust is the reason we keep going back.",
  },
  {
    name: "Ayesha Malik",
    city: "London, UK",
    quote:
      "Ordered from abroad over WhatsApp. Photos, video call, insured delivery to my mother in Gujrat. Faultless.",
  },
];
