import { GoldValueCalculator } from "@/components/sell/GoldValueCalculator";
import { formatRateStamp, goldOnly, type RateSnapshot } from "@/lib/rates";

import { Kept } from "../components/Kept";
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

  return (
    <div className="px-4 pb-10 pt-6">
      <Kept stale={rates.stale} loading={rates.loading} refresh={rates.refresh} />

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
      <dl className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border border-gold/25 bg-champagne/20 px-4 py-3">
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

      <div className="mt-8">
        <GoldValueCalculator snapshot={rates.data} side="buy" />
      </div>
    </div>
  );
}
