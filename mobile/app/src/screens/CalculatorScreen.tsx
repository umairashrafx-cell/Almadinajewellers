import { useState } from "react";
import { ChevronRight, Clock, HandCoins, ImageDown, Loader2 } from "lucide-react";

import { GoldValueCalculator } from "@/components/sell/GoldValueCalculator";
import { formatRateStamp, goldOnly, rateAgeNote, type RateSnapshot } from "@/lib/rates";
import { renderRateCard } from "@/lib/share-card";
import { SITE } from "@/lib/site";

import { Kept } from "../components/Kept";
import { useApprox } from "../components/Money";
import type { Cached } from "../lib/cache";
import { shareImage } from "../lib/share";

/**
 * The board above, as a picture, through the phone's own share sheet.
 *
 * The shop sends the day's rates to customers and to a broadcast list every
 * morning, and a screenshot of a phone screen is what that looked like before
 * this. renderRateCard is the picture the website and the admin screen already
 * share — 1080×1350, JPEG, the shop's own card — so the app sends the same
 * image rather than inventing a second one that would drift from it.
 *
 * It carries the whole board, gold and silver, where the line above it shows
 * only the gold the calculator prices. That is deliberate: what is being sent
 * is the shop's rates, and a recipient asking about silver should not need a
 * second message.
 *
 * shareImage, not the Web Share API: see lib/share.ts. A failure is said on
 * the screen rather than swallowed, because a button that did nothing is
 * indistinguishable from one that is broken.
 */
function ShareChart({ snapshot }: { snapshot: RateSnapshot }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setFailure(null);
    try {
      await shareImage({
        blob: await renderRateCard(snapshot),
        filename: `al-madina-gold-rate-${snapshot.date}.jpg`,
        title: "Today's Gold Rate",
        text: `${SITE.name} · ${SITE.origin}/gold-rate-in-mandi-bahauddin-today`,
      });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The picture could not be made.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="-mr-1 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-semibold tracking-wider text-gold-deep uppercase transition-colors active:bg-champagne/50 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ImageDown className="h-3.5 w-3.5" aria-hidden />
        )}
        {busy ? "Making…" : "Share"}
      </button>
      {failure ? (
        <span role="status" className="text-[11px] text-destructive">
          {failure}
        </span>
      ) : null}
    </span>
  );
}

/**
 * What a weight is worth, at the rates on the board.
 *
 * The website's calculator, unchanged — the same component, so the same
 * arithmetic, the same purities and the same custom-hallmark handling. Two
 * copies of this sum is exactly how an app and a website start quoting
 * different figures for the same gold.
 *
 * side="buy" prices at the rates the shop sells at, which is the board this
 * app opens on. The selling side lives on the website's own sell page, where
 * the buying rate is shown beside it.
 */
export function CalculatorScreen({
  rates,
  showZakat,
}: {
  rates: Cached<RateSnapshot>;
  showZakat: () => void;
}) {
  const approx = useApprox();

  if (!rates.data) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <p className="max-w-xs text-sm leading-relaxed text-warmgrey">
          The calculator works from the day&rsquo;s rates. Open the rate screen once with a
          connection and it will work without one from then on.
        </p>
      </div>
    );
  }

  const ageNote = rateAgeNote(rates.data);

  return (
    <div className="px-4 pt-6 pb-10">
      <Kept
        stale={rates.stale}
        loading={rates.loading}
        savedAt={rates.savedAt}
        refresh={rates.refresh}
      />

      <h1 className="font-display text-2xl font-light tracking-wide text-primary">
        What is my gold worth?
      </h1>
      <div className="hairline mt-5 max-w-24" />

      {/*
        The figures the sum is worked from, in a line.

        The calculator's own small print says "the rates from the board above",
        which is true of the two pages it sits on in the website. In the app the
        board is a tab away, so the board comes here in miniature — and seeing
        the rate beside the estimate is what makes the estimate mean anything.
      */}
      <dl className="card-lift-sm mt-6 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-gold/15 bg-white px-4 py-3.5">
        {goldOnly(rates.data).map((rate) => (
          <div key={rate.karat} className="flex items-baseline gap-2">
            <dt className="text-[11px] tracking-widest text-warmgrey uppercase">{rate.karat}</dt>
            <dd className="text-sm font-semibold text-ink">
              {rate.perTola.toLocaleString("en-PK")}
            </dd>
          </div>
        ))}
        {/*
          The stamp and the way to send it, on one line. The button sits with
          the date rather than above the figures because it is about them
          rather than part of them, and because a row of numbers with a button
          over it reads as a thing to press before the numbers are read.
        */}
        <div className="flex w-full items-center justify-between gap-1.5">
          <p className="text-[11px] text-warmgrey">Per tola · {formatRateStamp(rates.data)}</p>
          <ShareChart snapshot={rates.data} />
        </div>
      </dl>

      {/*
        Said out loud when the board the sum is worked from is not today's.

        The stamp in the line above carries the date, but an estimate is read
        as a price, and a price worked from a three-day-old board is wrong in a
        way that a date nobody stopped to compare does not convey. Nothing is
        rendered on an ordinary day. It is the same line the board itself
        shows on the rate screen, out of the same function, so the two cannot
        come to disagree.
      */}
      {ageNote ? (
        <p className="card-lift-sm mt-3 flex items-start gap-2 rounded-xl border border-gold/20 bg-champagne/35 px-4 py-3.5 text-xs leading-relaxed text-ink">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
          <span>{ageNote}</span>
        </p>
      ) : null}

      {/*
        No margin of our own. The calculator carries mt-12 for the page it sits
        on in the website, where it follows a whole section; stacking another
        mt-8 on top of that put 80px of ivory between the rate line and the
        purity buttons — nearly a sixth of a phone screen spent on nothing.
      */}
      <GoldValueCalculator
        snapshot={rates.data}
        side="buy"
        approx={approx}
        compact
        shareCard={shareImage}
      />

      {/*
        The question that most often follows "what is my gold worth" in this
        market, once a year: how much zakat is on it.
      */}
      <button
        type="button"
        onClick={showZakat}
        className="card-lift-sm mt-6 flex w-full items-center gap-3.5 rounded-xl border border-gold/20 bg-white px-4 py-4 text-left transition-colors active:bg-champagne/40"
      >
        <HandCoins className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">Work out your zakat</span>
          <span className="mt-0.5 block text-xs text-warmgrey">
            Gold, silver and savings, against today&rsquo;s nisab
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-warmgrey" aria-hidden />
      </button>
    </div>
  );
}
