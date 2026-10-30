import { SITE } from "@/lib/site";

/**
 * Leaving the app's own screens for the shop's website.
 *
 * The website opens in this same WebView — capacitor.config.ts allows
 * navigation to it — so it is the app that is showing the catalogue, not a
 * browser that was handed it. Android's back button then returns here, because
 * the shop is a page further on in the same history.
 *
 * location.assign, not replace: leaving a way back is the whole point.
 */
export function openShop(path = "/") {
  window.location.assign(`${SITE.origin}${path}`);
}
