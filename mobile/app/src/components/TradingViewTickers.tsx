import { useEffect, useRef, useState } from "react";

import { TICKERS_SCRIPT, tickersConfig } from "../lib/tradingview";

/**
 * Whether the app is drawn dark right now.
 *
 * Read from the class rather than from settings, because the class is what is
 * actually on screen — it already folds in "follow the phone" — and watched,
 * so switching the theme in settings redraws the widget to match instead of
 * leaving a white panel on a dark page.
 */
function useDarkClass(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/**
 * TradingView's live tickers, above the board.
 *
 * Their widget, in their iframe, with their prices moving every second —
 * see lib/tradingview.ts for why it is that and nothing more. It is labelled
 * as theirs and in dollars, because the board below it is the one this app
 * vouches for and the two must not be read as the same thing.
 *
 * With no connection the script never arrives and the strip removes itself
 * rather than sitting there as an empty box with a heading.
 */
export function TradingViewTickers() {
  const host = useRef<HTMLDivElement>(null);
  const dark = useDarkClass();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;

    /*
     * The widget's documented embed: an empty element for it to fill and a
     * script tag whose body is the configuration. Rebuilt from nothing on a
     * theme change, because the widget reads its colours once.
     */
    const target = document.createElement("div");
    target.className = "tradingview-widget-container__widget";

    const script = document.createElement("script");
    script.src = TICKERS_SCRIPT;
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify(tickersConfig(dark));
    script.onerror = () => setFailed(true);

    container.replaceChildren(target, script);
    return () => container.replaceChildren();
  }, [dark]);

  if (failed) return null;

  return (
    <section className="mt-6 border border-warmgrey/25 bg-white/50">
      <header className="flex items-center justify-between gap-3 border-b border-warmgrey/20 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-warmgrey uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
          Live from TradingView
        </h2>
        <span className="text-[10px] tracking-widest text-warmgrey/80 uppercase">US $</span>
      </header>

      {/*
        Light colour scheme on the frame's container, in both themes. A page
        marked dark draws any frame whose own document is not dark on an opaque
        white backing, whatever that document asks for -- so the dark theme
        got a white slab here until the container stopped claiming dark. The
        widget still draws its own text in the theme it was handed.
      */}
      <div ref={host} className="tradingview-widget-container min-h-[46px] [color-scheme:light]" />

      <p className="border-t border-warmgrey/20 px-4 py-3 text-[11px] leading-relaxed text-warmgrey">
        Prices and moves as TradingView shows them, updating as they trade. Tap one to open it on{" "}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          TradingView
        </a>
        .
      </p>
    </section>
  );
}
