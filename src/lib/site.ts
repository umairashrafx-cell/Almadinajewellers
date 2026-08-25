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
  /** The branded 1200x630 card shown when a link is shared. */
  shareImage: "/og-image.jpg",
  founded: "1985",
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
     * The query the embedded map is built from. **It must name the business.**
     *
     * An address-only search — "Sarafa Market, Mandi Bahauddin" — resolved to a
     * neighbouring jeweller's listing, because Sarafa Bazar is a street of
     * jewellers and the address alone does not distinguish us from the shop
     * next door. Naming the business resolves to our own listing, which is what
     * puts our name, and our rating, on the pin.
     *
     * The city stays in the string deliberately: it is what keeps the result
     * correct for someone opening the page from Dubai or London rather than
     * from down the road.
     */
    mapEmbedQuery: "Al-Madina Jewellers, Sarafa Market, Mandi Bahauddin",
    /** Coordinates from the Business Profile, for the GeoCoordinates schema. */
    lat: 32.5855319,
    lng: 73.4924667,
  },
];

/**
 * Google Maps iframe source for a branch. No API key needed for this form.
 *
 * Pass a query that names the business, not a bare address — see mapEmbedQuery
 * for why. A named result carries the shop's own label and rating on the pin,
 * which plain coordinates cannot.
 *
 * hl=en pins the map's labels to English so the embed reads the same for every
 * visitor rather than following whatever locale their browser reports.
 */
export function mapEmbedUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17&hl=en&output=embed`;
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

/**
 * An absolute URL for anything the site serves.
 *
 * Share metadata and JSON-LD have to carry absolute URLs — a scraper reading
 * the markup has no page to resolve "/og-image.jpg" against. Bundled assets
 * arrive here as hashed root-relative paths and uploaded photographs as full
 * Supabase URLs, so both shapes are handled.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE.origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** The default share card, absolute. */
export function shareImageUrl(): string {
  return absoluteUrl(SITE.shareImage);
}

/**
 * The best share image for a piece.
 *
 * Much of the catalogue still points at bundled placeholders — one stock
 * photograph standing in for many pieces — and previewing a bridal set with a
 * picture of earrings is worse than previewing it with the brand card. An
 * uploaded photograph always resolves to an absolute storage URL, so that is
 * the test. As real photography lands, product shares start using it on their
 * own, with no change here.
 */
export function productShareImage(imageUrl: string): string {
  return /^https?:\/\//i.test(imageUrl) ? imageUrl : shareImageUrl();
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
