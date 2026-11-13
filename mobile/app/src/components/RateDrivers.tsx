import { useState } from "react";

import {
  driversFor,
  formatPct,
  type MarketBoard,
  type RateDrivers as Drivers,
  type TrailWindow,
} from "@/lib/markets";
import { cn } from "@/lib/utils";

/**
 * What is behind today's rate.
 *
 * This panel exists instead of a buy-or-sell call, and the difference is the
 * whole point of it. A signal would be investment advice, which the shop is
 * not licensed to give and which would be coming from the party selling the
 * gold; a customer who bought on it and watched the rate fall would have a
 * grievance with the shop, and rightly. So nothing here is a recommendation,
 * and the last line says so in plain words.
 *
 * What it does instead is answer the question the signal was standing in for.
 * Somebody who has watched the local rate climb for a month wants to know
 * whether that was the metal or the rupee, because the two mean quite
 * different things about what happens next, and the board already carries
 * both numbers — it had simply never put them together.
 *
 * It used to go on to set the shop's own buy-and-sell gap beside the month's
 * move and tell the customer which was the bigger number. The shop asked for
 * that to go: it read as the shop advising somebody on when to buy, which is
 * the one thing this panel exists not to do. What is left is the market's own
 * figures and nothing else.
 */
export function RateDrivers({ board }: { board: MarketBoard }) {
  const [window, setWindow] = useState<TrailWindow>("month");

  const drivers = driversFor(board, "gold", window);
  /* No history yet, or only half of it: the panel is simply not drawn. */
  if (!drivers) return null;

  return (
    <section className="card-lift mt-7 rounded-xl border border-rate-gold/35 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[10px] font-semibold tracking-[0.2em] text-gold-deep uppercase">
          What is behind the rate
        </h3>
        <WindowToggle window={window} onWindow={setWindow} />
      </div>

      <Split drivers={drivers} />
      <Sentence drivers={drivers} />

      <p className="mt-3 border-t border-rate-gold/20 pt-3 text-[11px] leading-relaxed text-warmgrey">
        This is what the market has done, not what it will do. We do not forecast the rate and this
        is not advice to buy or sell.
      </p>
    </section>
  );
}

function WindowToggle({
  window,
  onWindow,
}: {
  window: TrailWindow;
  onWindow: (next: TrailWindow) => void;
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-full border border-rate-gold/40">
      {(["week", "month"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={window === option}
          onClick={() => onWindow(option)}
          className={cn(
            "px-3 py-1 text-[10px] font-semibold tracking-widest uppercase transition-colors",
            window === option ? "bg-rate-emerald text-rate-ivory" : "bg-transparent text-warmgrey",
          )}
        >
          {option === "week" ? "1W" : "1M"}
        </button>
      ))}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "strong" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span
        className={cn("text-[13px]", tone === "strong" ? "font-semibold text-ink" : "text-ink")}
      >
        {label}
      </span>
      <span
        className={cn(
          "nums text-[13px]",
          tone === "strong" ? "font-semibold text-primary" : "text-warmgrey",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The two halves and their product.
 *
 * The per cents do not add up to the tola figure and are not meant to — gold
 * +5% with the rupee +5% is +10.25% a tola — so the three are not laid out as
 * a sum. The rule under the first two is a divider, not a plus.
 */
function Split({ drivers }: { drivers: Drivers }) {
  return (
    <div className="mt-3">
      <Row label="Gold, in dollars" value={formatPct(drivers.metalPct)} />
      {/*
        Said as the dollar against the rupee rather than the other way round,
        because that is the direction the figure is quoted in and inverting it
        in words while leaving the sign alone is how a reader ends up with the
        move backwards. A plus here is a weaker rupee, which the sentence
        below spells out when it matters.
      */}
      <Row label="Dollar against the rupee" value={formatPct(drivers.rupeePct)} />

      <div className="mt-1 border-t border-rate-gold/25 pt-1">
        <Row label="Gold per tola, in rupees" value={formatPct(drivers.tolaPct)} tone="strong" />
      </div>
    </div>
  );
}

/** Under a tenth of a per cent either way is a rate that did not move. */
const FLAT_PCT = 0.1;

function Sentence({ drivers }: { drivers: Drivers }) {
  const period = drivers.window === "week" ? "week" : "month";

  if (Math.abs(drivers.tolaPct) < FLAT_PCT) {
    return (
      <p className="mt-3 text-[13px] leading-relaxed text-ink">
        {drivers.opposed
          ? `Over the last ${period} the metal and the rupee pulled against each other, and the tola price finished where it started.`
          : `The tola price is where it was a ${period} ago.`}
      </p>
    );
  }

  const direction = drivers.tolaPct > 0 ? "up" : "down";

  /*
   * "Pulled against each other" is reserved for the case where that is the
   * story — two moves of a size, in opposite directions. Said whenever the
   * signs differ it would dress up gold at a fifth of a per cent against the
   * rupee at seven as a tug of war, when what actually happened is the rupee.
   * So dominance is read first and opposition only decides the wording.
   */
  const because =
    drivers.mostly === "metal"
      ? drivers.opposed
        ? "Most of that is the metal; the rupee moved the other way and took a little off."
        : "Most of that is the metal, not the rupee."
      : drivers.mostly === "rupee"
        ? `Most of that is the rupee, not the metal — gold in dollars ${
            Math.abs(drivers.metalPct) < FLAT_PCT
              ? "barely moved"
              : `moved ${formatPct(drivers.metalPct)}`
          }.`
        : drivers.opposed
          ? "The metal and the rupee pulled against each other; what you see is the difference."
          : "The metal and the rupee moved by about as much as each other.";

  return (
    <p className="mt-3 text-[13px] leading-relaxed text-ink">
      Over the last {period} the rupee price of a tola is {direction}{" "}
      <span className="nums">{formatPct(Math.abs(drivers.tolaPct)).replace("+", "")}</span>.{" "}
      {because}
    </p>
  );
}
