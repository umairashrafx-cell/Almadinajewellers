import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { fetchMarketSnapshot, type MarketSnapshot } from "@/lib/markets";
import { cn } from "@/lib/utils";

import { MARKETS_KEY, useCached } from "../lib/cache";
import { approxUsd, usableDollar, type Dollar } from "../lib/money";
import { useSettings } from "../lib/settings";

/**
 * The dollar, for the screens that say a rupee figure a second time.
 *
 * Null whenever there is nothing to add: the customer has not asked for
 * dollars, or they have and the app holds no rate fit to convert at. Every
 * reader treats those two the same way — it prints the rupee figure alone,
 * which is the screen exactly as it was before this existed.
 */
const DollarContext = createContext<Dollar | null>(null);

export function MoneyProvider({ children }: { children: ReactNode }) {
  const { currency } = useSettings();
  const [dollar, setDollar] = useState<Dollar | null>(null);

  const wanted = currency === "USD";

  return (
    <DollarContext.Provider value={wanted ? dollar : null}>
      {/*
        Beside the screens rather than around them. The feed is mounted only
        while dollars are wanted, and if it were a wrapper, switching currency
        would change what the screens' parent is — React would throw every
        screen away and build it again, under the thumb of somebody standing
        on the settings screen.
      */}
      {wanted ? <DollarFeed onDollar={setDollar} /> : null}
      {children}
    </DollarContext.Provider>
  );
}

/**
 * Fetches the board the dollar rides on, and only when somebody wants it.
 *
 * The same cache entry the international board keeps, so a customer who has
 * ever opened that board has a rate on the phone already, and a figure fetched
 * here is one that board opens with. No polling: a rate that moves a few paisa
 * in a day does not need asking for every fifteen seconds to say "roughly".
 * useCached asks again when the app comes back from the background.
 */
function DollarFeed({ onDollar }: { onDollar: (dollar: Dollar | null) => void }) {
  const markets = useCached<MarketSnapshot>(MARKETS_KEY, fetchMarketSnapshot);
  const quote = markets.data?.board.usdPkr;

  const rate = quote?.usd;
  const at = quote?.at;

  useEffect(() => {
    onDollar(usableDollar(quote, Date.now()));
    // The two fields are the whole of what the answer depends on; the quote
    // object itself is rebuilt by every fetch whether or not anything moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, at, onDollar]);

  return null;
}

/** The rate in force, for the settings screen to print beside the choice. */
export function useDollar(): Dollar | null {
  return useContext(DollarContext);
}

/**
 * A formatter for places that build a string rather than render an element —
 * the shared components, which take it as a prop so the website can go on not
 * knowing any of this exists.
 */
export function useApprox(): (pkr: number) => string | null {
  const dollar = useContext(DollarContext);
  return useCallback((pkr: number) => approxUsd(pkr, dollar), [dollar]);
}

/**
 * The second line under a rupee figure. Renders nothing when there is nothing
 * honest to say, so it can be dropped under any price without a condition.
 */
export function Approx({ pkr, className }: { pkr: number; className?: string }) {
  const text = approxUsd(pkr, useContext(DollarContext));
  if (!text) return null;

  return <span className={cn("nums block text-warmgrey", className)}>{text}</span>;
}
