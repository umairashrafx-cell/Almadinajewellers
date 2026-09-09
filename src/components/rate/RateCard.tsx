import type { RateCardData } from "@/lib/rates";
import { MetalIcon } from "@/components/rate/MetalIcon";

/**
 * One metal, one rate.
 *
 * The per-tola figure is the loudest thing on the card because it is the one
 * anybody came for; per gram sits under it in the same column so the two read
 * as one answer rather than two.
 *
 * The figures are ordinary selectable text — never an image — so they can be
 * copied into a calculator, read aloud by a screen reader, and indexed.
 */
export function RateCard({ rate }: { rate: RateCardData }) {
  return (
    <li className="group grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-xl border border-rate-gold/35 bg-white/70 px-4 py-4 shadow-[0_1px_2px_rgb(22_61_52/0.04)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px hover:border-rate-gold/70 hover:shadow-[0_8px_24px_rgb(22_61_52/0.10)] sm:grid-cols-[auto_1fr_auto] sm:gap-x-6 sm:px-6 sm:py-5">
      {/* Medallion */}
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rate-gold-light to-rate-gold text-rate-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
        aria-hidden="true"
      >
        <MetalIcon karat={rate.karat} className="h-6 w-6 stroke-current sm:h-7 sm:w-7" />
      </span>

      {/* Name and purity */}
      <div className="min-w-0">
        <h3 className="font-display text-xl font-normal leading-tight text-rate-ink sm:text-2xl">
          {rate.label}
        </h3>
        <p className="nums mt-0.5 text-sm text-rate-ink/80">{rate.purity}</p>
      </div>

      {/*
        The rule only exists where there is a row to divide. On a narrow screen
        the price sits under the name rather than beside it, and a vertical line
        across a stacked card divides nothing.
      */}
      <div className="col-span-2 flex items-center gap-4 border-t border-rate-gold/25 pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="ml-auto text-right">
          <p className="nums text-2xl font-bold leading-none tracking-tight text-rate-emerald sm:text-[32px]">
            {rate.perTola.toLocaleString("en-US")}
          </p>
          <p className="nums mt-1.5 text-xs text-rate-ink/80 sm:text-sm">
            {rate.perGram.toLocaleString("en-US")} per gram
          </p>
        </div>
      </div>
    </li>
  );
}
