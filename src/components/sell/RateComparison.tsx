import type { MetalRate } from "@/lib/rates";
import { cn } from "@/lib/utils";

const money = (n: number) => n.toLocaleString("en-US");

/**
 * The two rates side by side, as figures rather than as a percentage.
 *
 * No difference is computed or printed. A percentage invites the reader to
 * treat the gap as a fee to be haggled over; two published figures and a
 * plain reason for the distance between them is the whole of the argument.
 */
export function RateComparison({ jewellery, buying }: { jewellery: MetalRate; buying: MetalRate }) {
  return (
    <div className="mt-12 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
      <Figure label="Today's jewellery rate" note="What 22K jewellery sells at" rate={jewellery} />

      <div className="flex items-center justify-center">
        <span className="sr-only">compared with</span>
        <span
          className="grid h-12 w-12 place-items-center rounded-full border border-gold/60 bg-ivory font-display text-lg italic text-rate-gold-deep"
          aria-hidden="true"
        >
          vs
        </span>
      </div>

      <Figure
        label="Today's buying rate"
        note="What we pay for jewellery — the 20K rate"
        rate={buying}
        emphasis
      />
    </div>
  );
}

function Figure({
  label,
  note,
  rate,
  emphasis = false,
}: {
  label: string;
  note: string;
  rate: MetalRate;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "border p-6 text-center sm:p-8",
        emphasis ? "border-primary bg-primary text-ivory" : "border-gold/50 bg-card text-ink",
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.2em]",
          emphasis ? "text-gold" : "text-rate-gold-deep",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "nums mt-4 font-display text-[40px] font-normal leading-none sm:text-5xl",
          emphasis ? "text-ivory" : "text-primary",
        )}
      >
        Rs. {money(rate.perTola)}
      </p>
      <p className={cn("mt-2 text-sm", emphasis ? "text-champagne/85" : "text-ink/75")}>
        per tola · Rs. {money(rate.perGram)} per gram
      </p>
      <p
        className={cn(
          "mt-5 border-t pt-4 text-sm",
          emphasis ? "border-gold/25 text-champagne/85" : "border-gold/30 text-ink/75",
        )}
      >
        {note}
      </p>
    </div>
  );
}
