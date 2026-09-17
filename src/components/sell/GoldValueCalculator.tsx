import { useId, useState } from "react";

import { ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  RATE_BOARD,
  SELL_PURITIES,
  buyingRateFor,
  metalValue,
  rateFor,
  type RateSnapshot,
  type SellPurity,
  type WeightUnit,
} from "@/lib/rates";
import { SITE, formatPKR, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: "g", label: "Grams" },
  { value: "tola", label: "Tola" },
];

const label = "text-xs font-semibold uppercase tracking-[0.2em] text-ink/80";

/*
 * A choice drawn as a button but built as a radio. The native input keeps the
 * arrow keys, the form semantics and the screen reader's "2 of 5"; the span is
 * only what it looks like. Forty-four pixels tall, for a thumb.
 */
const segment =
  "grid h-11 cursor-pointer select-none place-items-center rounded-[2px] border border-gold/55 bg-white text-sm font-semibold tracking-wide text-ink transition-colors hover:border-gold hover:bg-champagne/30 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold";

const money = (n: number) => n.toLocaleString("en-US");

/** The gold rows of the board: what a customer buying from the shop pays. */
const BOARD_GOLD = RATE_BOARD.filter((row) => row.karat !== "999");

/**
 * Which side of the counter the estimate is for.
 *
 * "sell" is a customer selling to the shop, valued at the buying rate. "buy"
 * is a customer buying from the shop, valued at the board's own rates, for
 * the gold rate page, where a figure lower than the board above it would read
 * as a mistake.
 */
export type CalculatorSide = "sell" | "buy";

/**
 * What a seller's gold is worth at today's buying rate — an estimate, and
 * labelled as one.
 *
 * The arithmetic is metalValue, the same function behind the rate page's
 * calculator, and the rate is buyingRateFor, which starts from the one buying
 * figure the shop publishes. Nothing here knows a number of its own.
 *
 * The result shows its working — weight times rate — because a customer who
 * can see how the figure was reached can check it, and one who has checked it
 * arrives at the counter expecting that figure rather than a better one.
 */
export function GoldValueCalculator({
  snapshot,
  side = "sell",
}: {
  snapshot: RateSnapshot;
  side?: CalculatorSide;
}) {
  const selling = side === "sell";
  const [amount, setAmount] = useState("10");
  const [unit, setUnit] = useState<WeightUnit>("g");
  // Selling: 20K first, what jewellery is bought at, so the estimate a seller
  // sees before touching anything matches the buying rate above it. Buying:
  // 22K, jewellery, the row most customers come for.
  const [purity, setPurity] = useState<string>(selling ? "20K" : "22K");
  const id = useId();

  const rate = selling
    ? buyingRateFor(snapshot, purity as SellPurity)
    : snapshot.date
      ? rateFor(snapshot, purity)
      : undefined;
  const boardRow = BOARD_GOLD.find((row) => row.karat === purity);
  const purityName = !selling && boardRow ? `${boardRow.name} (${purity})` : purity;
  const weight = Number.parseFloat(amount);
  const hasWeight = Number.isFinite(weight) && weight > 0;
  const result = hasWeight && rate ? metalValue(weight, unit, rate) : null;

  const weightText = hasWeight ? weight.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "";
  const unitWord = unit === "g" ? (weight === 1 ? "gram" : "grams") : "tola";

  // What the customer has worked out, so the shop answers the question they
  // actually have. Nothing identifying — a CNIC number has no place in a chat.
  const message = [
    selling
      ? `Assalam-o-Alaikum ${SITE.name}. I would like to ask about selling my gold.`
      : `Assalam-o-Alaikum ${SITE.name}. I would like to ask about buying gold.`,
    `Purity: ${purityName}`,
    hasWeight ? `Weight: ${weightText} ${unitWord}` : null,
    result ? `Estimated value: ${formatPKR(result.value)}` : null,
    selling
      ? "I understand the final value is confirmed after testing and weighing. Please guide me about the final valuation."
      : "I understand making charges and any stones are additional. Please confirm today's price.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mt-12 grid overflow-hidden border border-gold/50 bg-ivory shadow-[var(--shadow-soft)] lg:grid-cols-[1.1fr_1fr]">
      <form
        aria-label="Gold value calculator"
        onSubmit={(e) => e.preventDefault()}
        className="p-6 sm:p-8 lg:p-10"
      >
        <fieldset>
          <legend className={label}>Purity</legend>
          {selling ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {SELL_PURITIES.map((p) => (
                <label key={p} className="relative">
                  <input
                    type="radio"
                    name={`${id}-purity`}
                    value={p}
                    checked={purity === p}
                    onChange={() => setPurity(p)}
                    className="peer sr-only"
                  />
                  <span className={segment}>{p}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {BOARD_GOLD.map((row) => (
                <label key={row.karat} className="relative">
                  <input
                    type="radio"
                    name={`${id}-purity`}
                    value={row.karat}
                    checked={purity === row.karat}
                    onChange={() => setPurity(row.karat)}
                    className="peer sr-only"
                  />
                  <span className={cn(segment, "h-14 content-center gap-0.5 leading-tight")}>
                    <span>{row.name}</span>
                    <span className="nums text-xs font-medium opacity-80">{row.karat}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-3 text-[13px] leading-relaxed text-ink/75">
            {selling
              ? "Each purity is valued at its own rate — 24K at the 24K rate. Jewellery sold as 22K is bought at the 20K rate, so choose 20K for it. Not sure of the purity? Testing at the counter establishes it."
              : "Each is valued at today's rate on the board above. This is the metal value only — making charges and any stones are additional."}
          </p>
        </fieldset>

        <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor={`${id}-weight`} className={label}>
              Weight
            </label>
            <div className="relative mt-3">
              <input
                id={`${id}-weight`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby={`${id}-weight-unit`}
                className="nums h-12 w-full rounded-[2px] border border-gold/60 bg-white px-4 pr-20 text-lg text-ink transition-colors focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              />
              <span
                id={`${id}-weight-unit`}
                className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm text-ink/70"
              >
                {unit === "g" ? "grams" : "tola"}
              </span>
            </div>
          </div>

          <fieldset>
            <legend className={label}>Unit</legend>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:w-52">
              {UNITS.map((u) => (
                <label key={u.value} className="relative">
                  <input
                    type="radio"
                    name={`${id}-unit`}
                    value={u.value}
                    checked={unit === u.value}
                    onChange={() => setUnit(u.value)}
                    className="peer sr-only"
                  />
                  <span className={cn(segment, "h-12")}>{u.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </form>

      <div className="flex flex-col bg-primary p-6 text-ivory sm:p-8 lg:p-10">
        {rate ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {selling ? "Today’s applicable buying rate" : "Today’s rate"} · {purityName}
            </p>
            <p className="nums mt-3 text-xl text-ivory">
              Rs. {money(rate.perGram)}{" "}
              <span className="text-base text-champagne/85">per gram</span>
            </p>
            <p className="nums mt-1 text-sm text-champagne/85">
              Rs. {money(rate.perTola)} per tola
            </p>

            <div className="mt-8 border-t border-gold/25 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Estimated gold value
              </p>
              {/*
                Announced politely and whole, so a screen reader hears the new
                figure once the typing stops rather than every digit of it.
              */}
              <p
                aria-live="polite"
                aria-atomic="true"
                className="nums mt-3 min-h-[1.1em] font-display text-[44px] font-normal leading-none text-rate-gold-light sm:text-[56px]"
              >
                {result ? (
                  <span key={result.value} className="value-in inline-block">
                    {formatPKR(result.value)}
                  </span>
                ) : (
                  <span className="text-3xl text-champagne/70">Enter a weight</span>
                )}
              </p>
              {result ? (
                <p className="nums mt-4 text-sm text-champagne/85">
                  {weightText} {unit === "g" ? "g" : "tola"} × Rs.{" "}
                  {money(unit === "g" ? rate.perGram : rate.perTola)} per{" "}
                  {unit === "g" ? "gram" : "tola"}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="font-display text-2xl font-light leading-snug text-ivory">
            Today&rsquo;s {selling ? "buying " : ""}rate has not been published yet. Ask us on
            WhatsApp and we will send you the figure.
          </p>
        )}

        <div className="mt-8 lg:mt-auto lg:pt-10">
          <ActionLink
            href={whatsappLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {selling ? "Get My Quote on WhatsApp" : "Get a Price on WhatsApp"}
          </ActionLink>
        </div>
      </div>
    </div>
  );
}
