import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Google Analytics 4 and the Meta Pixel, both optional.
 *
 * The IDs come from the environment rather than the source, so this file works
 * unchanged across the live site, a preview deploy and a developer's machine —
 * and a local `bun run dev` does not pollute the shop's numbers. With neither
 * variable set this component renders nothing and loads nothing, which is the
 * correct behaviour until someone actually wants tracking.
 *
 *   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *   VITE_META_PIXEL_ID=1234567890
 *
 * The tags are injected after hydration rather than served in the document
 * head. Two third-party scripts in the head would block the first render of a
 * catalogue whose whole job is to show photographs quickly; analytics can
 * afford to be a moment late, and the page cannot.
 *
 * Both tools assume a full page load per screen. This is a single-page app, so
 * navigation is reported manually below — without that, every visit would look
 * like a one-page bounce no matter how much of the catalogue was browsed.
 */

const GA_ID = import.meta.env["VITE_GA_MEASUREMENT_ID"] as string | undefined;
const PIXEL_ID = import.meta.env["VITE_META_PIXEL_ID"] as string | undefined;

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean };

type TrackingWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
  fbq?: Fbq;
  _fbq?: Fbq;
};

function loadGoogleAnalytics(w: TrackingWindow) {
  if (!GA_ID || w.gtag) return;

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(tag);

  w.dataLayer = w.dataLayer ?? [];

  /*
   * This must push the `arguments` object itself, not a rest-parameter array.
   *
   * gtag.js decides what a dataLayer entry means by its type: an Arguments
   * object is a command, anything else is inert data. The modern spelling —
   * `(...args) => dataLayer.push(args)` — pushes a plain array, so every
   * command is silently ignored. The library still loads and the dataLayer
   * still fills up, which is what makes it such a convincing false positive:
   * nothing errors, and the only symptom is that no hit is ever sent.
   */
  const gtag = function (this: unknown) {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  } as Gtag;
  w.gtag = gtag;

  gtag("js", new Date());
  // Page views are sent by hand on navigation, so the automatic one is turned
  // off here to avoid counting the landing page twice.
  gtag("config", GA_ID, { send_page_view: false });
}

function loadMetaPixel(w: TrackingWindow) {
  if (!PIXEL_ID || w.fbq) return;

  const fbq: Fbq = Object.assign(
    (...args: unknown[]) => {
      fbq.queue!.push(args);
    },
    { queue: [] as unknown[], loaded: true },
  );
  w.fbq = fbq;
  w._fbq = fbq;

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(tag);

  fbq("init", PIXEL_ID);
}

export function Analytics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const loaded = useRef(false);

  useEffect(() => {
    if (!GA_ID && !PIXEL_ID) return;

    const w = window as TrackingWindow;

    if (!loaded.current) {
      loadGoogleAnalytics(w);
      loadMetaPixel(w);
      loaded.current = true;
    }

    // Fires on mount as well as on every later navigation, so the landing page
    // is counted once here rather than by either script's own initialisation.
    w.gtag?.("event", "page_view", {
      page_path: pathname,
      page_title: document.title,
      page_location: window.location.href,
    });
    w.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}
