/**
 * Right-sized product photographs.
 *
 * Product photographs are uploaded to Supabase Storage at full size — 250 to
 * 320 KB each — and were sent at that size everywhere, including into a card
 * 164 pixels wide on a phone. Supabase resizes a stored image on request and
 * caches the result, so each place asks for the width it actually draws: a
 * 400px copy is about 80 KB, a quarter of the original, and a browser that
 * accepts WebP is sent WebP.
 *
 * Only Supabase Storage URLs are rewritten. Images bundled with the site are
 * returned untouched, with no srcset, because they are already sized.
 */

const STORAGE_OBJECT = "/storage/v1/object/public/";
const STORAGE_RENDER = "/storage/v1/render/image/public/";

function isStorageUrl(src: string): boolean {
  return src.includes(STORAGE_OBJECT);
}

/**
 * One resized copy of a stored photograph, or the source unchanged.
 *
 * `height` and `resize=contain` are not optional: asked for a width alone,
 * Supabase returns that width at the original height — a 1144×1375 photograph
 * comes back 400×1375, squashed. Bounding the height at twice the width and
 * containing inside that box keeps the shape and leaves the width in charge for
 * anything up to 1:2, which every photograph here is.
 */
export function sizedImage(src: string, width: number, quality = 75): string {
  if (!isStorageUrl(src)) return src;
  const url = src.replace(STORAGE_OBJECT, STORAGE_RENDER);
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}width=${width}&height=${width * 2}&resize=contain&quality=${quality}`;
}

/**
 * `src`, `srcSet` and `sizes` for an <img>, spread straight onto it.
 *
 * `widths` are the copies to offer and `sizes` tells the browser how wide the
 * image is drawn, so it picks the smallest copy that is still sharp on that
 * screen. `src` is the middle copy, for the rare browser without srcset.
 */
export function responsiveImage(
  src: string,
  widths: number[],
  sizes: string,
): { src: string; srcSet?: string; sizes?: string } {
  if (!isStorageUrl(src) || widths.length === 0) return { src };
  const sorted = [...widths].sort((a, b) => a - b);
  const middle = sorted[Math.floor((sorted.length - 1) / 2)] ?? sorted[0]!;
  return {
    src: sizedImage(src, middle),
    srcSet: sorted.map((w) => `${sizedImage(src, w)} ${w}w`).join(", "),
    sizes,
  };
}

/** A product card: half the screen on a phone, a quarter on a wide screen. */
export const CARD_WIDTHS = [400, 600, 900];
export const CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
