import { SITE, STORES, placeUrl } from "@/lib/site";

/**
 * The shop's identity in structured data.
 *
 * Given an @id so other pages can point at the shop rather than describe it a
 * second time — the sell page says it is about this store, and a search engine
 * reads that as one business, not two with the same name.
 */
export const STORE_SCHEMA_ID = `${SITE.origin}/stores#store`;

/** The JewelryStore node, without @context, for use inside a page's @graph. */
export function storeSchemaNode() {
  const store = STORES[0]!;

  return {
    "@type": "JewelryStore",
    "@id": STORE_SCHEMA_ID,
    name: SITE.name,
    description: SITE.tagline,
    url: `${SITE.origin}/stores`,
    telephone: store.phones[0],
    foundingDate: SITE.founded,
    // How Google confirms that this site, the Business Profile and the social
    // accounts are one business rather than several with a similar name.
    sameAs: [placeUrl(store.placeId), SITE.instagram, SITE.facebook, SITE.tiktok],
    founder: { "@type": "Person", name: SITE.founder },
    // Exact coordinates, so search engines place the shop where it is rather
    // than geocoding a street name shared with every jeweller on it.
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.lat,
      longitude: store.lng,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: store.name,
      addressLocality: store.city,
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      // Friday is the shop's closed day, so it is absent rather than listed.
      dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "11:00",
      closes: "20:00",
    },
  };
}
