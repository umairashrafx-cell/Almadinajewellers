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
  { id: "saved", label: "Saved", icon: Heart },
  { id: "store", label: "Store", icon: Store },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("rate");

  /*
   * One snapshot, two screens. The board and the calculator must never show
   * different figures, and fetching twice is how that starts.
   */
  const rates = useCached(RATES_KEY, fetchRateSnapshot);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <header className="flex items-center justify-between border-b border-gold/20 bg-ivory px-4 py-3">
        <p className="font-display text-lg tracking-[0.2em] text-primary uppercase">Al-Madina</p>
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
      </header>

      <main className="flex-1">
        {tab === "rate" && <RateScreen rates={rates} />}
        {tab === "pieces" && <PiecesScreen />}
        {tab === "calculator" && <CalculatorScreen rates={rates} />}
        {tab === "saved" && <SavedScreen />}
        {tab === "store" && <StoreScreen />}
      </main>

      <nav
        aria-label="Sections"
        className="sticky bottom-0 grid grid-cols-5 border-t border-gold/25 bg-ivory"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              /*
               * Five across a 360px phone leaves about seventy pixels a tab,
               * and "Calculator" is the one that decides the type size. Nine
               * pixels at narrower tracking fits it without wrapping; the
               * icons carry the recognition anyway.
               */
              "flex flex-col items-center gap-1 px-1 py-3 text-[9px] leading-none font-semibold tracking-wide uppercase transition-colors",
              tab === id ? "text-gold-deep" : "text-warmgrey",
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
