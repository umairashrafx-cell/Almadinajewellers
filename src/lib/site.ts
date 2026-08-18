/**
 * Central brand + contact configuration.
 * Non-technical edits (phone numbers, tagline, addresses) happen here.
 */

export const SITE = {
  name: "Al-Madina Jewellers",
  tagline: "Heirlooms in the Making",
  /** Canonical origin. Used for share URLs and WhatsApp prefills, which must be
   * identical on the server and the client, so window.location is never read. */
  origin: "https://www.almadinajeweller.com",
  whatsapp: "92546502244", // wa.me number, digits only
  whatsappDisplay: "+92 54 6502244",
  phones: ["+92 321 7759959", "+92 321 7744282"],
  founder: "Haji Ashraf Siddiqui",
  address: "Sarafa Market, Mandi Bahauddin, Punjab, Pakistan",
  announcement: "Free insured delivery across Pakistan",
  instagram: "https://www.instagram.com/almadina.jewellers",
  tiktok: "https://www.tiktok.com/@almadinaj",
  facebook: "https://www.facebook.com/madinajewellerz",
};

/**
 * Branches. Kept here rather than in a database table because this is the file
 * non-technical edits happen in, and a one-row table with no admin screen is
 * harder to update than a line of config. Add an object per new branch.
 */
export const STORES = [
  {
    name: "Sarafa Market",
    city: "Mandi Bahauddin",
    address: "Sarafa Market, Mandi Bahauddin, Punjab, Pakistan",
    phones: ["+92 321 7759959", "+92 321 7744282"],
    whatsapp: "92546502244",
    hours: "Monday to Sunday, 11:00am – 8:00pm",
    /** Google Maps place query, used for both the embed and the directions link. */
    mapQuery: "Sarafa Bazar, Mandi Bahauddin, Punjab, Pakistan",
  },
];

/** Google Maps iframe source for a branch. No API key needed for this form. */
export function mapEmbedUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Opens turn-by-turn directions in the visitor's maps app. */
export function directionsUrl(query: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

/** Formats a PKR amount as "Rs. 1,250,000". */
export function formatPKR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-US")}`;
}

/** Formats a gram weight with 3 decimals, e.g. "18.420 g". */
export function formatGrams(grams: number) {
  return `${grams.toFixed(3)} g`;
}

/** Builds a wa.me link with a pre-filled message. */
export function whatsappLink(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Canonical URL for a product page. */
export function productUrl(slug: string) {
  return `${SITE.origin}/products/${slug}`;
}

/** Pre-filled product enquiry message. */
export function productEnquiryLink(name: string, sku: string, url?: string) {
  // Note: pass the page URL explicitly. Reading window here would break SSR hydration.
  const pageUrl = url ?? "";
  return whatsappLink(
    `Assalam-o-Alaikum, I'm interested in ${name} (SKU: ${sku})${pageUrl ? ` - ${pageUrl}` : ""}`,
  );
}
