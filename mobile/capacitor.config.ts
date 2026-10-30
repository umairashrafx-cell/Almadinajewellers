import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The shop's Android app.
 *
 * It replaces the Trusted Web Activity that is on Play today, and it keeps that
 * app's identity: the package name and the upload key must not change, or the
 * listing's installs and reviews cannot be carried over.
 *
 * The app shows the website, as the TWA did. What Capacitor buys is a native
 * process around it — notifications first, and screens of the shop's own later.
 */
const config: CapacitorConfig = {
  appId: "com.almadinajeweller.app",
  appName: "Al-Madina Jewellers",

  /**
   * The bundled first screen (www/index.html), which hands over to the live
   * site. Not server.url: Capacitor documents that setting as not meant for
   * production, and an app with no page of its own has nothing to show when the
   * phone is offline. www/index.html explains the rest.
   */
  webDir: "www",

  server: {
    /**
     * Where the WebView may go without leaving the app. Everything else —
     * WhatsApp, Instagram, Play, maps, a tel: link — keeps Capacitor's default
     * of opening outside it, which is what those links are for.
     *
     * Both hosts: the apex redirects to www, and the redirect has to be allowed
     * to follow or a link to the bare domain would bounce a customer out into
     * the browser.
     */
    allowNavigation: ["www.almadinajeweller.com", "almadinajeweller.com"],
  },

  android: {
    /**
     * How the website knows it is being read inside the app.
     *
     * The TWA was recognised by its android-app:// referrer; a Capacitor
     * WebView sends no such thing, so it says who it is in the user agent
     * instead, on every request including the first page. The site looks for
     * "AlMadinaApp" in src/routes/__root.tsx and hides what has no place in the
     * app — the staff admin link, and the buttons offering to install the app.
     *
     * Changing this string means changing that script too.
     */
    appendUserAgent: "AlMadinaApp/1",

    /** Madina green behind the WebView, so a slow page is never a white flash. */
    backgroundColor: "#0B3D2E",
  },

  plugins: {
    /**
     * The status bar reads as part of the shop's green, with light icons on it,
     * which is what the Trusted Web Activity did with the website's own
     * theme-color. The strip itself is coloured by android:windowBackground in
     * the app's theme.
     *
     * Capacitor keeps the page out from under the bars on its own: the website
     * does not ask for viewport-fit=cover, so the WebView is inset by the
     * status and gesture bars rather than drawn behind them. Nothing on the
     * site has to know about safe areas.
     */
    SystemBars: {
      style: "DARK",
    },
  },
};

export default config;
