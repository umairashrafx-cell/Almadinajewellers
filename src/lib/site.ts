/**
 * Central brand + contact configuration.
 * Non-technical edits (phone numbers, tagline, addresses) happen here.
 */

export const SITE = {
  name: "Al-Madina Jewellers",
  tagline: "Heirlooms in the Making",
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

/** Pre-filled product enquiry message. */
export function productEnquiryLink(name: string, sku: string, url?: string) {
  // Note: pass the page URL explicitly. Reading window here would break SSR hydration.
  const pageUrl = url ?? "";
  return whatsappLink(
    `Assalam-o-Alaikum, I'm interested in ${name} (SKU: ${sku})${pageUrl ? ` - ${pageUrl}` : ""}`,
  );
}
