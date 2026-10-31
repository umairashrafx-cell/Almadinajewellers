import { RefreshCcw } from "lucide-react";

import { RateAlerts } from "@/components/app/RateAlerts";
import { GoldRateBoard } from "@/components/rate/GoldRateBoard";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { fetchMarketSnapshot } from "@/lib/markets";
import type { MarketSnapshot } from "@/lib/markets";
import { SITE, whatsappLink } from "@/lib/site";
import type { RateSnapshot } from "@/lib/rates";

import { Kept } from "../components/Kept";
import { MarketsBoard } from "../components/MarketsBoard";
import { MARKETS_KEY, useCached } from "../lib/cache";
import type { Cached } from "../lib/cache";

/**
 * The board, as the shop sets it.
 *
 * The same component the website renders, handed a snapshot that may have come
 * off the phone rather than the network — which is the point of the screen. A
 * customer standing in the bazaar with one bar of signal still sees this
 * morning's figures, with a line saying when they were taken.
 */
export function RateScreen({ rates }: { rates: Cached<RateSnapshot> }) {
  /*
   * Fetched here rather than in App, because this is the only screen that
   * shows them, and before the early returns below, because a hook cannot be
   * called conditionally. It costs nothing when there is no board to draw: the
   * request is made either way and the markets block renders nothing until it
   * has something to say.
   */
  const markets = useCached<MarketSnapshot>(MARKETS_KEY, fetchMarketSnapshot);

  if (rates.empty) return <NoRatesYet refresh={rates.refresh} loading={rates.loading} />;
  if (!rates.data) return <Waiting />;

  return (
    <div className="px-4 pb-10 pt-6">
      <Kept stale={rates.stale} loading={rates.loading} refresh={rates.refresh} />
      <GoldRateBoard snapshot={rates.data} showBrand showFooter={false} />

      {/*
        The offer to be told tomorrow, on the screen somebody opened to find
        out about today. The same card the website shows on its rate page —
        this is where it belongs in the app, since a customer who has these
        screens may never open that page.
      */}
      <RateAlerts />

      <p className="mt-8 text-center text-xs leading-relaxed text-warmgrey">
        Rates move through the day. Your price is confirmed against the rate at the time of
        purchase, and every piece is weighed in front of you before it is billed.
      </p>

      {/*
        The world's prices, after the shop's own and after the sentence that
        ends them. A customer in the Sarafa follows gold in dollars and the
        rupee against it; this is that context, kept visibly separate from the
        figure they are actually being quoted.
      */}
      <MarketsBoard markets={markets} />
    </div>
  );
}

function Waiting() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <p className="text-sm tracking-widest text-warmgrey uppercase">Reading the board…</p>
    </div>
  );
}

/**
 * Nothing on the phone and nothing from the network: the first launch without
 * a connection. The shop's numbers are the useful thing to offer here —
 * somebody who wants today's rate badly enough can be told it.
 */
function NoRatesYet({ refresh, loading }: { refresh: () => void; loading: boolean }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <p className="text-[11px] tracking-widest text-gold uppercase">Al-Madina Jewellers</p>
        <h1 className="mt-4 font-display text-3xl font-light tracking-wide text-primary">
          Today&rsquo;s rate has not reached this phone
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-warmgrey">
          The board needs a connection the first time. Once it has been seen, it stays on the phone
          and opens without one.
        </p>

        <div className="mt-8 grid gap-3">
          <ActionButton onClick={refresh} disabled={loading}>
            {loading ? "Trying" : "Try again"}
          </ActionButton>
          {SITE.phones.map((phone) => (
            <ActionLink key={phone} variant="outline" href={`tel:${phone.replace(/\s/g, "")}`}>
              Call {phone}
            </ActionLink>
          ))}
          <ActionLink
            variant="outline"
            href={whatsappLink("Assalam-o-Alaikum, please tell me today's gold rate.")}
          >
            Ask on WhatsApp
          </ActionLink>
        </div>
      </div>
    </div>
  );
}

/** Exported for the Calculator screen, which shows the same line. */
export function Refresh({ refresh, loading }: { refresh: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={refresh}
      disabled={loading}
      className="inline-flex items-center gap-2 text-[11px] tracking-widest text-gold-deep uppercase disabled:opacity-50"
    >
      <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
      {loading ? "Checking" : "Check again"}
    </button>
  );
}
