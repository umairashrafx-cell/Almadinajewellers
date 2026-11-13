import { Clock } from "lucide-react";

import { GoldValueCalculator } from "@/components/sell/GoldValueCalculator";
import { formatRateStamp, goldOnly, rateAgeNote, type RateSnapshot } from "@/lib/rates";

import { Kept } from "../components/Kept";
import { useApprox } from "../components/Money";
import type { Cached } from "../lib/cache";

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
export function CalculatorScreen({ rates }: { rates: Cached<RateSnapshot> }) {
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
        <p className="w-full text-[11px] text-warmgrey">Per tola · {formatRateStamp(rates.data)}</p>
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
      <GoldValueCalculator snapshot={rates.data} side="buy" approx={approx} />
    </div>
  );
}
