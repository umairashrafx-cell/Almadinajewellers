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
    /**
     * Google Maps place query. Was "Sarafa Bazar" while the address above said
     * "Sarafa Market" — the same place under two names, which is exactly the
     * inconsistency that weakens a local listing. Aligned on the address.
     */
    mapQuery: "Sarafa Market, Mandi Bahauddin, Punjab, Pakistan",
    /**
     * Google Business Profile place ID. Stable and language-independent, unlike
     * a name search, so links built from it always land on our own listing
     * rather than whatever Google matches for the text that day.
     */
    placeId: "ChIJxX07bsF9HzkR428mpQWvxm8",
    /**
     * The shop's coordinates, read off the Business Profile listing.
     *
     * The embedded map is built from these rather than from a name or address
     * search. Sarafa Bazar is a street of jewellers and Google was resolving
     * "Sarafa Market, Mandi Bahauddin" to a neighbouring shop's listing —
     * a map on our own Visit Us page showing a competitor. Coordinates cannot
     * be mis-resolved.
     */
    lat: 32.5855319,
    lng: 73.4924667,
  },
];

/**
 * Google Maps iframe source for a branch. No API key needed for this form.
 *
 * Built from coordinates, not from a query. A text search put a neighbouring
 * jeweller's listing on our own Visit Us page, and the place-ID form cannot be
 * verified from the served response because the embed renders entirely
 * client-side — both times it was tried, a valid ID and a deliberately invalid
 * one returned byte-identical shells.
 *
 * Coordinates have no such ambiguity: Google drops a pin exactly there. The
 * trade is that the pin carries no business name, which is a fair price for a
 * map that is definitely of the right shop.
 */
export function mapEmbedUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
}

/**
 * Opens turn-by-turn directions in the visitor's maps app. The place ID is the
 * authoritative destination when present; the text query stays as the label and
 * as the fallback for clients that ignore it.
 */
export function directionsUrl(query: string, placeId?: string) {
  const destination = `destination=${encodeURIComponent(query)}`;
  const place = placeId ? `&destination_place_id=${encodeURIComponent(placeId)}` : "";
  return `https://www.google.com/maps/dir/?api=1&${destination}${place}`;
}

/** Canonical public link to a branch's Google Business Profile. */
export function placeUrl(placeId: string) {
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

/** Opens the Google review box for a branch directly, already addressed to it. */
export function reviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
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
