import { Calculator, ExternalLink, Gem, Heart, Sparkles, Store } from "lucide-react";
import { useState } from "react";

import { fetchRateSnapshot } from "@/lib/rates";
import { cn } from "@/lib/utils";

import { RATES_KEY, useCached } from "./lib/cache";
import { openShop } from "./lib/shop";
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
 * would put a second idea of what a page is next to the website's. The one
 * place that borrows from history is a piece opened over the grid, so that
 * Android's back button closes it.
 */
const TABS = [
  { id: "rate", label: "Rate", icon: Gem },
  { id: "pieces", label: "Pieces", icon: Sparkles },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "store", label: "Store", icon: Store },
] as const;

/**
 * Saved is a screen but not a tab.
 *
 * The bar is for the four things somebody opens the app to do. The saved
 * pieces are a place they come back to, not one of those four, so the heart
 * sits in the header beside the door to the website — and the bar keeps the
 * room it needs to spell "Calculator".
 */
type View = (typeof TABS)[number]["id"] | "saved";

export function App() {
  const [view, setView] = useState<View>("rate");

  /*
   * One snapshot, two screens. The board and the calculator must never show
   * different figures, and fetching twice is how that starts.
   */
  const rates = useCached(RATES_KEY, fetchRateSnapshot);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
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
          */}
          <button
            type="button"
            onClick={() => setView(view === "saved" ? "rate" : "saved")}
            aria-label="Saved pieces"
            aria-pressed={view === "saved"}
            className={cn(
              "inline-grid h-9 w-9 place-items-center border transition-colors",
              view === "saved"
                ? "border-gold bg-gold text-primary"
                : "border-gold/45 text-gold-deep hover:bg-gold hover:text-primary",
            )}
          >
            <Heart className={cn("h-4 w-4", view === "saved" && "fill-current")} aria-hidden />
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
            className="inline-flex items-center gap-2 border border-gold/45 px-3 py-2 text-[11px] font-semibold tracking-widest text-gold-deep uppercase transition-colors hover:bg-gold hover:text-primary"
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
        {view === "saved" && <SavedScreen />}
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
            onClick={() => setView(id)}
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
