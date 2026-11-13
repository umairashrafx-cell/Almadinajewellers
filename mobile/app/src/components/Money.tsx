import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { fetchMarketSnapshot, type MarketSnapshot } from "@/lib/markets";
import { cn } from "@/lib/utils";

import { MARKETS_KEY, useCached } from "../lib/cache";
import { approx, usableRate, type Foreign, type Rate } from "../lib/money";
import { useSettings } from "../lib/settings";

/**
 * The rate, for the screens that say a rupee figure a second time.
 *
 * Null whenever there is nothing to add: the customer has asked for rupees
 * only, or they have asked for another currency and the app holds no rate fit
 * to convert at. Every reader treats those two the same way — it prints the
 * rupee figure alone, which is the screen exactly as it was before this
 * existed.
 */
const RateContext = createContext<Rate | null>(null);

export function MoneyProvider({ children }: { children: ReactNode }) {
  const { currency } = useSettings();
  const [rate, setRate] = useState<Rate | null>(null);

  const wanted = currency === "PKR" ? null : currency;

  return (
    // Checked against the choice as well as held: a rate fetched for the
    // pound must not be printed for the moment after somebody picks the euro.
    <RateContext.Provider value={wanted && rate?.code === wanted ? rate : null}>
      {/*
        Beside the screens rather than around them. The feed is mounted only
        while a currency is wanted, and if it were a wrapper, switching
        currency would change what the screens' parent is — React would throw
        every screen away and build it again, under the thumb of somebody
        standing on the settings screen.
      */}
      {wanted ? <RateFeed code={wanted} onRate={setRate} /> : null}
      {children}
    </RateContext.Provider>
  );
}

/**
 * Fetches the board the rates ride on, and only when somebody wants one.
 *
 * The same cache entry the international board keeps, so a customer who has
 * ever opened that board has the rates on the phone already, and a board
 * fetched here is one that board opens with. No polling: a rate that moves a
 * few paisa in a day does not need asking for every fifteen seconds to say
 * "roughly". useCached asks again when the app comes back from the background.
 */
function RateFeed({ code, onRate }: { code: Foreign; onRate: (rate: Rate | null) => void }) {
  const markets = useCached<MarketSnapshot>(MARKETS_KEY, fetchMarketSnapshot);
  const quote = markets.data?.board.usdPkr;
  const fx = markets.data?.fx;

  // What the answer depends on, as plain values. The objects themselves are
  // rebuilt by every fetch whether or not anything in them moved.
  const dollar = quote?.usd;
  const at = quote?.at;
  const day = fx?.day;
  const cross = fx?.perUsd?.[code.toLowerCase()];

  useEffect(() => {
    onRate(usableRate(code, quote, fx, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, dollar, at, day, cross, onRate]);

  return null;
}

/** The rate in force, for the settings screen to print beside the choice. */
export function useRate(): Rate | null {
  return useContext(RateContext);
}

/**
 * A formatter for places that build a string rather than render an element —
 * the shared components, which take it as a prop so the website can go on not
 * knowing any of this exists.
 */
export function useApprox(): (pkr: number) => string | null {
  const rate = useContext(RateContext);
  return useCallback((pkr: number) => approx(pkr, rate), [rate]);
}

/**
 * The second line under a rupee figure. Renders nothing when there is nothing
 * honest to say, so it can be dropped under any price without a condition.
 */
export function Approx({ pkr, className }: { pkr: number; className?: string }) {
  const text = approx(pkr, useContext(RateContext));
  if (!text) return null;

  return <span className={cn("nums block text-warmgrey", className)}>{text}</span>;
}
