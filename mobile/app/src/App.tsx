import {
  Calculator,
  ExternalLink,
  Gem,
  Heart,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { fetchRateSnapshot } from "@/lib/rates";
import { cn } from "@/lib/utils";

import { PushHousekeeping } from "./components/PushHousekeeping";
import { RATES_KEY, useCached } from "./lib/cache";
import { openShop } from "./lib/shop";
import { viewFromHistory, type View } from "./lib/views";
import { CalculatorScreen } from "./screens/CalculatorScreen";
import { PiecesScreen } from "./screens/PiecesScreen";
import { RateScreen } from "./screens/RateScreen";
import { SavedScreen } from "./screens/SavedScreen";
import { StoreScreen } from "./screens/StoreScreen";

/**
 * The app's own screens, and a door to the rest of the shop.
 *
 * Everything here is bundled in the APK and works with no connection: the
 * board as it was last seen, the calculator that works from it, the pieces
 * already saved, the catalogue as the phone last fetched it, and the shop's
 * own address and hours, which never change and are what somebody needs when
 * nothing will load at all. The forms, the cart and the rest stay on the
 * website, which opens in this same WebView — the back button brings you home.
 *
 * No router: a handful of screens and a tab bar do not need one, and a router
 * would put a second idea of what a page is next to the website's. What the
 * screens do borrow is history, because that is what Android's back button
 * actually is — see lib/views.ts.
 */
const TABS: ReadonlyArray<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "rate", label: "Rate", icon: Gem },
  { id: "pieces", label: "Pieces", icon: Sparkles },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "store", label: "Store", icon: Store },
];

export function App() {
  /*
   * The screen, read out of the history entry the app is sitting on.
   *
   * Not simply "rate": the Website button is a real navigation away, and
   * coming back from it rebuilds this page from scratch. Reading the entry is
   * what returns somebody to the tab they left instead of to the board.
   */
  const [view, setView] = useState<View>(() => viewFromHistory(window.history.state));

  useEffect(() => {
    const onPop = (event: PopStateEvent) => setView(viewFromHistory(event.state));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /**
   * Going to a screen, and leaving a way back to this one.
   *
   * Pushed rather than replaced, which is the whole point: four tabs deep,
   * four back presses walk out the way somebody came in, and only the screen
   * they started on leaves the app.
   */
  const go = (next: View) => {
    if (next === view) return;
    window.history.pushState({ view: next }, "");
    setView(next);
  };

  /*
   * A new screen starts at its top.
   *
   * The screens are one document under one scroller, so arriving at a tab
   * inherited wherever the last one had been scrolled to. Reading the rate
   * board to the foot and tapping Pieces landed somebody halfway down the
   * grid, under a blank page-end, with no sign that anything was above them —
   * it read as a broken screen rather than as a scroll position.
   *
   * On the view, not inside the handler, so a back press is answered the same
   * way a tab tap is. The screens are short enough that restoring a position
   * on the way back would buy less than the confusion it costs.
   *
   * "instant" spelled out, because the site sets `scroll-behavior: smooth` on
   * html and that is what a bare scrollTo would inherit: a tab tap would scrub
   * the whole height of the screen you just left and then the whole height of
   * the one you arrived at, in front of somebody who asked to be somewhere
   * else. Arriving is not a journey.
   */
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch {
      /*
       * WebView below 97 does not know the "instant" enum, and WebIDL rejects
       * an unknown enum rather than ignoring it: this throws there. It would
       * take the app with it — this effect runs on mount, and there is no
       * error boundary above it to catch anything, so the first screen would
       * be a blank one on every launch. minSdkVersion is 24, so those devices
       * are a supported target even though a WebView updated any time since
       * 2022 is fine.
       *
       * The fallback clears the inherited smooth scroll for the length of one
       * jump rather than animating it, so the old WebView arrives the same
       * way the new one does. Restoring the previous value hands the property
       * back to the stylesheet.
       */
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      root.style.scrollBehavior = previous;
    }
  }, [view]);

  /**
   * The tab you are already on, tapped again: back to the top.
   *
   * What every phone does, and the only way out of a long screen that does not
   * involve a dozen thumb strokes — the rate board and the catalogue are both
   * taller than a few screens.
   *
   * Smooth here, unlike the arrival above, and for the opposite reason: the
   * content is not changing, so the scroll is the whole of what happened and
   * seeing it is what says the tap was understood. The site turns this off
   * for anyone who has asked for reduced motion, through the html rule.
   */
  const onTab = (next: View) => {
    if (next === view) {
      window.scrollTo({ top: 0 });
      return;
    }
    go(next);
  };

  /*
   * One snapshot, two screens. The board and the calculator must never show
   * different figures, and fetching twice is how that starts.
   */
  const rates = useCached(RATES_KEY, fetchRateSnapshot);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      {/*
        Nothing on screen: the token housekeeping rate alerts need on launch,
        and somewhere for a tapped notification to land. It belongs in the
        shell because the app opens here, on its own screens, and never on the
        website where the same work was already being done.
      */}
      <PushHousekeeping showRates={() => go("rate")} />

      <header className="flex items-center justify-between border-b border-gold/20 bg-ivory px-4 py-3">
        {/*
          The full name, set the way it is on the shopfront and on a bill:
          AL-MADINA over JEWELLERS, the second line smaller and wider. On one
          line at 375px it would take two thirds of the header and leave the
          heart and the website button fighting for what is left — the stacked
          lockup says the whole name in the width of half of it.
        */}
        <p className="font-display text-primary uppercase">
          <span className="block text-lg leading-none tracking-[0.2em]">Al-Madina</span>
          <span className="mt-1 block text-[9px] leading-none tracking-[0.42em] text-gold-deep">
            Jewellers
          </span>
        </p>

        <div className="flex items-center gap-2">
          {/*
            The heart, filled while you are looking at what it holds. No label:
            at this size a word beside the Website button crowds the line, and
            a heart in a jeweller's app needs no explaining.

            Saved is a screen but not a tab. The bar below is for the four
            things somebody opens the app to do; the saved pieces are a place
            they come back to, not one of those four — and the bar keeps the
            room it needs to spell "Calculator".

            Opened over whatever they were doing and closed with a step back,
            so the cross here and Android's own button are one gesture and
            cannot disagree. The same arrangement as a piece opened over the
            grid in PiecesScreen.
          */}
          <button
            type="button"
            onClick={() => (view === "saved" ? window.history.back() : go("saved"))}
            aria-label="Saved pieces"
            aria-pressed={view === "saved"}
            className={cn(
              /*
               * 44px square, not 36. These two sit side by side in the top
               * right corner of a 375px screen — the farthest corner from a
               * thumb and the easiest pair in the app to fumble between.
               * Android asks for 48dp and WCAG for 44; 36 was neither.
               */
              "inline-grid h-11 w-11 place-items-center border transition-colors",
              view === "saved"
                ? "border-gold bg-gold text-primary"
                : "border-gold/45 text-gold-deep hover:bg-gold hover:text-primary",
            )}
          >
            <Heart className={cn("h-5 w-5", view === "saved" && "fill-current")} aria-hidden />
          </button>

          {/*
            The door to the rest of the website — the forms, the cart, the custom
            order. It said "Shop" while the app had no catalogue of its own; with
            a Pieces tab and a Store tab in the bar below, that word now belongs
            to two other things, and the honest name for what this opens is the
            website itself.
          */}
          <button
            type="button"
            onClick={() => openShop("/collections")}
            className="inline-flex h-11 items-center gap-2 border border-gold/45 px-3 text-[11px] font-semibold tracking-widest text-gold-deep uppercase transition-colors hover:bg-gold hover:text-primary"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Website
          </button>
        </div>
      </header>

      <main className="flex-1">
        {view === "rate" && <RateScreen rates={rates} />}
        {view === "pieces" && <PiecesScreen />}
        {view === "calculator" && <CalculatorScreen rates={rates} />}
        {view === "saved" && <SavedScreen showPieces={() => go("pieces")} />}
        {view === "store" && <StoreScreen />}
      </main>

      <nav
        aria-label="Sections"
        className="sticky bottom-0 grid grid-cols-4 border-t border-gold/25 bg-ivory"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-current={view === id ? "page" : undefined}
            className={cn(
              /*
               * Four across a 360px phone leaves ninety pixels a tab, which is
               * what "Calculator" needs at the house size. It was nine pixels
               * while Saved was down here too, and cramped at it.
               */
              "flex flex-col items-center gap-1 py-3 text-[10px] leading-none font-semibold tracking-widest uppercase transition-colors",
              view === id ? "text-gold-deep" : "text-warmgrey",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
