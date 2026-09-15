import { useEffect } from "react";

/**
 * Registers /sw.js, which shows an offline page when a page cannot load.
 *
 * Production only. A service worker on the dev server would sit between the
 * developer and every code change, and Vite's module requests are exactly the
 * kind of traffic it should never see.
 *
 * Registered after the page has loaded, so installing it never competes with
 * the first render. Failure is silent: without a worker the site works exactly
 * as it did, it just has no offline page.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
