import { Calculator, Gem, Heart, Store } from "lucide-react";
import { useState } from "react";

import { fetchRateSnapshot } from "@/lib/rates";
import { cn } from "@/lib/utils";

import { RATES_KEY, useCached } from "./lib/cache";
import { openShop } from "./lib/shop";
import { CalculatorScreen } from "./screens/CalculatorScreen";
import { RateScreen } from "./screens/RateScreen";
import { SavedScreen } from "./screens/SavedScreen";

/**
 * The app's own three screens, and a door to the rest of the shop.
 *
 * Everything here is bundled in the APK and works with no connection: the
 * board as it was last seen, the calculator that works from it, and the pieces
 * already saved. The catalogue, the forms and everything else stay on the
 * website, which opens in this same WebView when the Shop tab is tapped — the
 * back button brings you home.
 *
 * No router: three screens and a tab bar do not need one, and a router would
 * put a second idea of what a page is next to the website's.
 */
const TABS = [
  { id: "rate", label: "Rate", icon: Gem },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "saved", label: "Saved", icon: Heart },
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
        <button
          type="button"
          onClick={() => openShop("/collections")}
          className="inline-flex items-center gap-2 border border-gold/45 px-3 py-2 text-[11px] font-semibold tracking-widest text-gold-deep uppercase transition-colors hover:bg-gold hover:text-primary"
        >
          <Store className="h-4 w-4" aria-hidden />
          Shop
        </button>
      </header>

      <main className="flex-1">
        {tab === "rate" && <RateScreen rates={rates} />}
        {tab === "calculator" && <CalculatorScreen rates={rates} />}
        {tab === "saved" && <SavedScreen />}
      </main>

      <nav
        aria-label="Sections"
        className="sticky bottom-0 grid grid-cols-3 border-t border-gold/25 bg-ivory"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-3 text-[10px] font-semibold tracking-widest uppercase transition-colors",
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
