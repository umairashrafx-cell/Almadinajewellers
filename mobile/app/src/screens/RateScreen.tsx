import { useState } from "react";

import { RateAlerts } from "@/components/app/RateAlerts";
import { GoldRateBoard } from "@/components/rate/GoldRateBoard";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { fetchMarketSnapshot } from "@/lib/markets";
import type { MarketSnapshot } from "@/lib/markets";
import { SITE, whatsappLink } from "@/lib/site";
import type { RateSnapshot } from "@/lib/rates";
import { cn } from "@/lib/utils";

import { Kept } from "../components/Kept";
import { useApprox } from "../components/Money";
import { MarketsBoard } from "../components/MarketsBoard";
import { RateDrivers } from "../components/RateDrivers";
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
   * Opens on the shop's own board, every time.
   *
   * Not remembered between visits, and deliberately: somebody who opened the
   * world prices once on a Tuesday is not asking to be shown Comex instead of
   * the shop's rate for the rest of the month. The figure this app exists for
   * is the local one, and it is what the tab should land on.
   */
  const [board, setBoard] = useState<Board>("local");

  if (rates.empty) return <NoRatesYet refresh={rates.refresh} loading={rates.loading} />;
  if (!rates.data) return <Waiting />;

  return (
    <div className="px-4 pt-6 pb-10">
      <Toggle board={board} onChange={setBoard} />

      {board === "international" ? (
        <International />
      ) : (
        <Local snapshot={rates.data} rates={rates} />
      )}
    </div>
  );
}

type Board = "local" | "international";

/**
 * The shop's board, or the world's.
 *
 * Two boards stacked was the screen before this: the shop's rate, the alerts
 * card, a paragraph, and then the international prices — a customer who
 * wanted Comex scrolled past everything they had already read, and one who
 * wanted the 22K figure had the rest of the world underneath it whether they
 * asked or not. They are different questions and now they are two answers.
 *
 * Tabs rather than a pair of toggle buttons, because that is what this is: a
 * control that swaps the panel under it, which a screen reader should say out
 * loud rather than leave somebody to discover.
 */
const BOARDS: ReadonlyArray<{ id: Board; label: string }> = [
  { id: "local", label: "Local" },
  { id: "international", label: "International" },
];

function Toggle({ board, onChange }: { board: Board; onChange: (next: Board) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Which rates"
      className="card-lift-sm grid grid-cols-2 gap-1 rounded-full border border-gold/20 bg-white p-1"
    >
      {BOARDS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`rates-tab-${id}`}
          aria-selected={board === id}
          aria-controls={`rates-panel-${id}`}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-full py-2.5 text-[11px] font-semibold tracking-widest uppercase transition-colors",
            board === id ? "bg-primary text-ivory" : "text-warmgrey",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The shop's own board, and the offer to be told about tomorrow's. */
function Local({ snapshot, rates }: { snapshot: RateSnapshot; rates: Cached<RateSnapshot> }) {
  const approx = useApprox();

  return (
    <div role="tabpanel" id="rates-panel-local" aria-labelledby="rates-tab-local" className="mt-5">
      <Kept
        stale={rates.stale}
        loading={rates.loading}
        savedAt={rates.savedAt}
        refresh={rates.refresh}
      />

      {/*
        showBrand false, which is what the board's own documentation asks for
        on "a page whose own heading already said so".

        It was true here, and it cost the app its first screen. The board's
        brand block is a logo, a wordmark and a TRUST · PURITY · TIMELESS
        BEAUTY ribbon — right on the website's rate page, where the board
        stands alone and has to introduce itself, and right in the picture the
        shop forwards on WhatsApp. In the app it sat two centimetres under the
        header's own AL-MADINA JEWELLERS, so the name was said twice and the
        24K figure — the one thing anybody opens this app for — started below
        the fold of a 375×812 phone and well below it on a shorter one.

        Dropping it lifts the first rate to around 290px: visible on launch, on
        every phone, with the stamp and the staleness line above it.
      */}
      <GoldRateBoard snapshot={snapshot} showBrand={false} showFooter={false} approx={approx} />

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
    </div>
  );
}

/**
 * The world's prices, which a customer in the Sarafa follows alongside the
 * shop's.
 *
 * The fetch lives in here rather than in the screen, so it starts when
 * somebody asks for these figures and not while they are reading the shop's.
 * It repolls every fifteen seconds, which is worth doing for a board somebody
 * is watching and not worth doing in the background of a different one.
 */
function International() {
  const markets = useCached<MarketSnapshot>(MARKETS_KEY, fetchMarketSnapshot, 15000);

  return (
    <div
      role="tabpanel"
      id="rates-panel-international"
      aria-labelledby="rates-tab-international"
      className="mt-1"
    >
      <MarketsBoard markets={markets} />

      {/*
        Under the board rather than over it, because it is the reading of
        those figures and a reading is no use before the figures.
      */}
      {markets.data ? <RateDrivers board={markets.data.board} /> : null}
    </div>
  );
}

/**
 * The board's own shape, drawn empty, while the first one is fetched.
 *
 * A line of centred text in the middle of an otherwise blank screen is what
 * the app showed here, and on a bad connection it is indistinguishable from a
 * screen that has failed. The shape of the thing that is coming says the
 * opposite — it is on its way, and it is a board — and it holds the layout
 * still, so nothing jumps when the figures land.
 *
 * `animate-pulse` only; Tailwind's own reduced-motion handling covers anyone
 * who has asked for less, and there is nothing moving here but opacity.
 */
function Waiting() {
  return (
    <div className="px-4 pt-6 pb-10" aria-busy="true" aria-live="polite">
      <p className="sr-only">Reading the board</p>

      <div className="animate-pulse">
        <div className="rounded-xl border border-rate-gold/40 bg-rate-emerald/90 px-5 py-6">
          <div className="mx-auto h-7 w-48 rounded bg-rate-ivory/25" />
          <div className="mx-auto mt-3 h-3 w-32 rounded bg-rate-ivory/20" />
        </div>

        <ul className="mt-7 grid gap-3">
          {[0, 1, 2].map((row) => (
            <li
              key={row}
              className="flex items-center gap-4 rounded-xl border border-rate-gold/35 bg-white/70 px-4 py-5"
            >
              <span className="h-12 w-12 shrink-0 rounded-full border border-rate-gold/40 bg-champagne/40" />
              <span className="flex-1">
                <span className="block h-5 w-28 rounded bg-champagne/60" />
                <span className="mt-2 block h-3 w-16 rounded bg-champagne/45" />
              </span>
              <span className="h-7 w-24 shrink-0 rounded bg-champagne/60" />
            </li>
          ))}
        </ul>
      </div>
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
