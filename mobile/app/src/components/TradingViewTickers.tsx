import { useEffect, useRef, useState } from "react";

import { TICKERS_SCRIPT, tickersConfig } from "../lib/tradingview";

/**
 * The crown of the International tab: TradingView's live gold, set large.
 *
 * Built as the Local tab's "Today's Gold Rate" panel is built — emerald to
 * forest, a gold hairline, a serif title with one word in gold — so the two
 * tabs read as one board in two languages. The gold pill hanging from its
 * foot says what the figures are in, because the one thing this panel must
 * never be mistaken for is the shop's own rupee rate next door.
 *
 * The quote itself is TradingView's symbol-info widget in TradingView's
 * iframe — see lib/tradingview.ts for why it is that and nothing more. On this
 * green it is drawn in their dark theme, in both of the app's themes.
 *
 * With no connection the script never arrives. The panel stays as the tab's
 * heading and the quote's place in it simply closes up, rather than the whole
 * crown vanishing and leaving the board below without a title.
 */
export function TradingViewTickers() {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;

    /*
     * The widget's documented embed: an empty element for it to fill and a
     * script tag whose body is the configuration.
     */
    const target = document.createElement("div");
    target.className = "tradingview-widget-container__widget";

    const script = document.createElement("script");
    script.src = TICKERS_SCRIPT;
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify(tickersConfig());
    script.onerror = () => setFailed(true);

    container.replaceChildren(target, script);
    return () => container.replaceChildren();
  }, []);

  return (
    <section className="mt-5">
      <div className="relative overflow-hidden rounded-2xl border border-rate-gold/60 bg-gradient-to-br from-rate-emerald to-rate-forest px-1 pt-6 pb-8 shadow-[0_10px_28px_rgb(6_63_50/0.28)]">
        {/* A soft gold glow in one corner, the light catching the panel. */}
        <span
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rate-gold/15 blur-3xl"
          aria-hidden
        />

        <header className="relative px-4 text-center">
          <h2 className="font-display text-[30px] leading-tight font-light text-rate-ivory">
            International <span className="font-semibold text-rate-gold-light">Gold</span>
          </h2>
          <p className="mt-1.5 flex items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.26em] text-rate-ivory/80 uppercase">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rate-gold-light/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rate-gold-light" />
            </span>
            Live from TradingView
          </p>
        </header>

        {failed ? null : (
          <>
            <span
              className="relative mx-4 mt-4 block h-px bg-gradient-to-r from-transparent via-rate-gold/60 to-transparent"
              aria-hidden
            />
            {/*
              Light colour scheme on the frame's container, in both themes. A
              page marked dark draws any frame whose own document is not dark on
              an opaque backing, whatever that document asks for -- which is a
              slab across the green. The widget still draws in its dark theme.

              Cut off at 205px, below the "market open" line. Under it the
              widget draws a row of previous close, open and volume that it
              offers no setting to hide, and the shop asked for it gone. The
              row starts about 220px down the frame and the line above it ends
              about 190px down, measured at 360 and 412 wide; the logo stays,
              in the frame's top corner, and the link to TradingView below.

              The cut is on a wrapper of our own. The widget's script writes
              its full height onto the container it is given, inline, which
              beats any class set there.
            */}
            <div className="relative mt-1 h-[205px] overflow-hidden [color-scheme:light]">
              <div ref={host} className="tradingview-widget-container" />
            </div>
          </>
        )}
      </div>

      {/* The pill hanging from the panel's foot, as the date does on Local. */}
      <p className="relative z-10 -mt-4 flex justify-center">
        <span className="nums inline-flex items-center gap-2 rounded-full border border-rate-gold/50 bg-gradient-to-b from-rate-gold-light to-rate-gold px-4 py-1.5 text-[11px] font-medium text-rate-forest shadow-[0_4px_12px_rgb(22_61_52/0.14)]">
          US dollars an ounce · live
        </span>
      </p>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-rate-ink/70">
        Tap a price to open it on{" "}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-rate-gold-deep underline decoration-rate-gold/50 underline-offset-2"
        >
          TradingView
        </a>
        .
      </p>
    </section>
  );
}
