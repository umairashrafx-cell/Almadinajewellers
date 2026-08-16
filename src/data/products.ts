import bridal from "@/assets/cat-bridal.jpg";
import bangles from "@/assets/cat-bangles.jpg";
import rings from "@/assets/cat-rings.jpg";
import earrings from "@/assets/cat-earrings.jpg";
import lockets from "@/assets/cat-lockets.jpg";
import silver from "@/assets/cat-silver.jpg";
import heroBridal from "@/assets/hero-bridal.jpg";

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

/**
 * Sample catalogue data used until the products table is connected.
 * Prices in PKR, weights in grams.
 */
export const bridalSets: Product[] = [
  {
    id: "b1",
    sku: "AMJ-BR-1001",
    name: "Gulbadan Bridal Set",
    slug: "gulbadan-bridal-set",
    category: "Bridal Sets",
    metal: "gold",
    karat: "22K",
    grossWeightG: 118.44,
    stones: "Ruby, Pearl & Zircon",
    pricePkr: 4500000,
    images: [heroBridal, bridal],
    isNew: true,
  },
  {
    id: "b2",
    sku: "AMJ-BR-1002",
    name: "Shahjahani Polki Set",
    slug: "shahjahani-polki-set",
    category: "Bridal Sets",
    metal: "gold",
    karat: "22K",
    grossWeightG: 96.21,
    stones: "Polki, Emerald & Pearl",
    pricePkr: 3850000,
    images: [bridal, heroBridal],
  },
  {
    id: "b3",
    sku: "AMJ-BR-1003",
    name: "Noor Jahan Rani Haar",
    slug: "noor-jahan-rani-haar",
    category: "Bridal Sets",
    metal: "gold",
    karat: "21K",
    grossWeightG: 74.86,
    stones: "Kundan & Pearl",
    pricePkr: 2650000,
    salePricePkr: 2495000,
    images: [heroBridal, earrings],
  },
  {
    id: "b4",
    sku: "AMJ-BR-1004",
    name: "Zohra Diamond Bridal Suite",
    slug: "zohra-diamond-bridal-suite",
    category: "Bridal Sets",
    metal: "diamond",
    karat: "18K",
    grossWeightG: 58.32,
    stones: "Certified Diamond 4.20 ct",
    pricePkr: 3200000,
    images: [rings, heroBridal],
    isNew: true,
  },
  {
    id: "b5",
    sku: "AMJ-BR-1005",
    name: "Mahnoor Jhumar Set",
    slug: "mahnoor-jhumar-set",
    category: "Bridal Sets",
    metal: "gold",
    karat: "22K",
    grossWeightG: 64.15,
    stones: "Ruby & Pearl",
    pricePkr: 2280000,
    images: [earrings, bridal],
  },
  {
    id: "b6",
    sku: "AMJ-BR-1006",
    name: "Sadaf Meenakari Set",
    slug: "sadaf-meenakari-set",
    category: "Bridal Sets",
    metal: "gold",
    karat: "21K",
    grossWeightG: 52.77,
    stones: "Meenakari, Zircon & Pearl",
    pricePkr: 1780000,
    images: [bridal, earrings],
  },
];

export const everydayGold: Product[] = [
  {
    id: "e1",
    sku: "AMJ-BN-2101",
    name: "Sana Slim Kara Pair",
    slug: "sana-slim-kara-pair",
    category: "Gold Bangles",
    metal: "gold",
    karat: "21K",
    grossWeightG: 18.42,
    stones: "Plain polished gold",
    pricePkr: 385000,
    images: [bangles, rings],
    isNew: true,
  },
  {
    id: "e2",
    sku: "AMJ-LK-2204",
    name: "Ayesha Locket & Chain",
    slug: "ayesha-locket-chain",
    category: "Lockets & Chains",
    metal: "gold",
    karat: "21K",
    grossWeightG: 6.84,
    stones: "Single zircon",
    pricePkr: 148000,
    salePricePkr: 132000,
    images: [lockets, bangles],
  },
  {
    id: "e3",
    sku: "AMJ-RG-2310",
    name: "Hania Solitaire Ring",
    slug: "hania-solitaire-ring",
    category: "Rings",
    metal: "diamond",
    karat: "18K",
    grossWeightG: 3.96,
    stones: "Certified Diamond 0.32 ct",
    pricePkr: 265000,
    images: [rings, lockets],
  },
  {
    id: "e4",
    sku: "AMJ-ER-2418",
    name: "Rida Everyday Tops",
    slug: "rida-everyday-tops",
    category: "Earrings",
    metal: "gold",
    karat: "22K",
    grossWeightG: 4.21,
    stones: "Pearl drop",
    pricePkr: 96000,
    images: [earrings, lockets],
  },
  {
    id: "e5",
    sku: "AMJ-SL-2502",
    name: "Mehr Silver Stack Trio",
    slug: "mehr-silver-stack-trio",
    category: "Silver Essentials",
    metal: "silver",
    karat: "925",
    grossWeightG: 9.12,
    stones: "Cubic zircon",
    pricePkr: 45000,
    images: [silver, rings],
    isNew: true,
  },
  {
    id: "e6",
    sku: "AMJ-BN-2108",
    name: "Zainab Textured Bangle",
    slug: "zainab-textured-bangle",
    category: "Gold Bangles",
    metal: "gold",
    karat: "22K",
    grossWeightG: 12.66,
    stones: "Hand-engraved, no stones",
    pricePkr: 268000,
    images: [bangles, silver],
  },
  {
    id: "e7",
    sku: "AMJ-LK-2211",
    name: "Fatima Ayat Pendant",
    slug: "fatima-ayat-pendant",
    category: "Lockets & Chains",
    metal: "gold",
    karat: "21K",
    grossWeightG: 5.38,
    stones: "Plain polished gold",
    pricePkr: 116000,
    images: [lockets, earrings],
  },
  {
    id: "e8",
    sku: "AMJ-RG-2325",
    name: "Amna Ruby Band",
    slug: "amna-ruby-band",
    category: "Rings",
    metal: "gold",
    karat: "21K",
    grossWeightG: 4.74,
    stones: "Ruby & Zircon",
    pricePkr: 128000,
    salePricePkr: 112000,
    images: [rings, bangles],
  },
];

export const categories = [
  { name: "Bridal Sets", slug: "bridal-sets", image: bridal },
  { name: "Gold Bangles", slug: "gold-bangles", image: bangles },
  { name: "Rings", slug: "rings", image: rings },
  { name: "Earrings", slug: "earrings", image: earrings },
  { name: "Lockets & Chains", slug: "lockets-chains", image: lockets },
  { name: "Silver Essentials", slug: "silver-essentials", image: silver },
];

/** Indicative gold rates — will move to an editable table. */
export const goldRates = [
  { karat: "24K", perGram: 27850, perTola: 324840 },
  { karat: "22K", perGram: 25530, perTola: 297770 },
  { karat: "21K", perGram: 24370, perTola: 284240 },
  { karat: "18K", perGram: 20890, perTola: 243630 },
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
