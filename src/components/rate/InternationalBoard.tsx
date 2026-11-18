import { useState } from "react";

import { Bitcoin, ChevronDown, DollarSign, Droplet, TrendingDown, TrendingUp } from "lucide-react";

import { MetalIcon } from "@/components/rate/MetalIcon";
import { InfoNote } from "@/components/ui/InfoNote";

import { eventTime, rangePosition } from "@/lib/markets";
import type { MarketEvent, MarketQuote, MarketRange, MarketSnapshot } from "@/lib/markets";
import {
  boardRows,
  changeIn,
  interbank,
  moveDirection,
  movedLabel,
  priceIn,
  provenance,
  rangeLabel,
  scope,
  tapHint,
  taken,
  unitLabel,
} from "@/lib/markets-board";
import type { BoardRowKey, PriceFormatter, Unit } from "@/lib/markets-board";
import { useTicks } from "@/lib/ticks";
import type { Tick } from "@/lib/ticks";
import { BOARD_TICKERS, minutesBehind, rowCaption } from "@/lib/tradingview";
import { cn } from "@/lib/utils";

/**
 * The world's prices, on the shop's own rate page.
 *
 * The same board the Android app shows on its International tab, and the same
 * figures: every number, unit and source sentence comes out of
 * lib/markets-board.ts, which both screens share, so a customer who checks the
 * app against this page cannot be shown gold at two prices.
 *
 * What is not shared is the drawing of it, and deliberately. The app's board is
 * a stack of cards sized for a phone held at arm's length; this one is set in
 * the proportions of the shop's own rate cards directly above it -- the same
 * medallion, the same Cormorant name, the same figure weight -- so it reads as
 * the next section of this page rather than as a phone screen pasted into it.
 *
 * It is rendered from the server with its figures already in it. This page is
 * the shop's recurring-traffic magnet, and a board that arrived after paint
 * would be a board no crawler ever saw.
 */

/**
 * Why this board does not stream.
 *
 * The app opens a websocket to the exchange and ticks bitcoin once a second,
 * which is right for a screen somebody has deliberately opened and is sitting
 * and watching. This is a public page, and the same choice would be wrong on
 * it three times over: it would hold a socket open to a third party for every
 * visitor who ever lands here from a search, spend their battery and their
 * data on a figure they did not come for, and give a crawler nothing it could
 * not already read in the HTML.
 *
 * So the web board refreshes the whole snapshot on a timer instead, at a sixth
 * of the app's rate, and React Query stops the timer while the tab is not
 * focused -- see the query's own settings. The arrows still work: they say
 * which way each figure last moved, which is what they always promised, and
 * they simply move on the half-minute rather than the second.
 */
export const REFRESH_MS = 30_000;

export function InternationalBoard({ snapshot }: { snapshot: MarketSnapshot | null }) {
  /*
   * One row open at a time. Independent toggles would let the board grow by
   * five panels at once in the middle of a page somebody is already scrolling,
   * and nobody compares two ranges by holding both open.
   */
  const [open, setOpen] = useState<BoardRowKey | null>(null);

  /*
   * Dollars an ounce until somebody asks otherwise.
   *
   * That is the board's own language and the one its sources quote in, and
   * switching it by default would quietly turn a reference panel into a second
   * rupee rate sitting under the shop's own. The rupee view is the answer to a
   * question somebody chose to ask.
   */
  const [unit, setUnit] = useState<Unit>("usd");

  const board = snapshot?.board ?? {};
  const rows = boardRows(board, snapshot?.calendar);

  /*
   * No dollar rate, no choice to offer. An older deployment of the edge
   * function sends five instruments and no rupee, and against one of those
   * this board has to read as it would have before rather than showing a
   * control that cannot do anything.
   */
  const usdPkr = interbank(board);
  const showing: Unit = usdPkr === null ? "usd" : unit;
  const price = priceIn(showing, usdPkr);
  const change = changeIn(price);

  /*
   * Up or down since the last figure, row by row. Asked of the figure as it is
   * printed, so an arrow only ever appears when the digits actually changed --
   * see lib/ticks.ts. Ahead of the early return below because it is a hook.
   */
  const ticks = useTicks(
    rows.map((row) => ({ key: row.key, usd: row.quote.usd, shown: price(row.key, row.quote.usd) })),
  );

  // Nothing to show rather than a board of dashes. The shop's own rates are
  // above this and they are the part of the page that matters.
  if (rows.length === 0) return null;

  const anyRange = rows.some((row) => row.quote.range);
  const anyEvents = rows.some((row) => row.events !== null);

  return (
    <div className="mt-10">
      {usdPkr === null ? null : <UnitToggle unit={showing} usdPkr={usdPkr} onChange={setUnit} />}

      <ul className="mt-6 grid gap-3 sm:gap-4">
        {rows.map((row) => (
          <Row
            key={row.key}
            rowKey={row.key}
            label={row.label}
            caption={rowCaption(
              unitLabel(row.key, showing, usdPkr, row.unit),
              BOARD_TICKERS[row.key],
              snapshot ? minutesBehind(row.quote.at, snapshot.fetchedAt) : null,
            )}
            price={price}
            change={change}
            quote={row.quote}
            events={row.events}
            tick={ticks[row.key]}
            open={open === row.key}
            onToggle={() => setOpen((current) => (current === row.key ? null : row.key))}
          />
        ))}
      </ul>

      <InfoNote size="md" className="mt-6" label="Where these figures come from">
        {snapshot ? (
          <>
            Reference prices from public sources, taken {taken(snapshot.fetchedAt)} Pakistan time
            and refreshed about every half minute while this page is open. The arrow beside a price
            shows which way it last moved, and only moves when the source does.{" "}
          </>
        ) : null}
        {tapHint(anyRange, anyEvents, "Open")} The shop&rsquo;s own rate, published above, is the
        one that settles a transaction.{" "}
        {showing === "tola" && usdPkr !== null ? (
          <>
            Gold and silver are converted at Rs.&nbsp;{usdPkr.toFixed(2)} to the dollar, the
            interbank rate — pure metal, before duty, premium or making.
          </>
        ) : null}
      </InfoNote>
    </div>
  );
}

/**
 * Dollars an ounce, or rupees a tola.
 *
 * Two buttons rather than a switch, because a switch has to be read to find
 * out which way it is pointing and a pair of labels says it outright. Square,
 * like every other control on this site: the app rounds its own version
 * because everything on a phone screen is a rounded card, and the website does
 * not.
 */
function UnitToggle({
  unit,
  usdPkr,
  onChange,
}: {
  unit: Unit;
  usdPkr: number;
  onChange: (unit: Unit) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-[11px] font-semibold tracking-[0.2em] text-warmgrey uppercase">
          Metals in
        </span>
        {unit === "tola" ? (
          <span className="nums mt-1 text-xs text-warmgrey">$1 = Rs.&nbsp;{usdPkr.toFixed(2)}</span>
        ) : null}
      </span>

      <span className="grid grid-cols-2 gap-px rounded-[2px] border border-rate-gold/40 bg-rate-gold/20 p-px">
        {(
          [
            { id: "usd", label: "$ / oz" },
            { id: "tola", label: "Rs / tola" },
          ] as ReadonlyArray<{ id: Unit; label: string }>
        ).map((choice) => (
          <button
            key={choice.id}
            type="button"
            aria-pressed={unit === choice.id}
            onClick={() => onChange(choice.id)}
            className={cn(
              "rounded-[1px] px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
              unit === choice.id
                ? "bg-rate-emerald text-rate-ivory"
                : "bg-white text-rate-ink/70 hover:bg-rate-gold/10",
            )}
          >
            {choice.label}
          </button>
        ))}
      </span>
    </div>
  );
}

function Row({
  rowKey,
  label,
  caption,
  price,
  change,
  quote,
  events,
  tick,
  open,
  onToggle,
}: {
  rowKey: BoardRowKey;
  label: string;
  caption: string;
  /** Formats a figure in whichever units the board is currently showing. */
  price: PriceFormatter;
  /** The same, signed, for a move. */
  change: PriceFormatter;
  quote: MarketQuote;
  events: MarketEvent[] | null;
  /** Which way the printed figure last moved, and how many times it has. */
  tick: Tick | undefined;
  open: boolean;
  onToggle: () => void;
}) {
  const direction = moveDirection(quote);
  const moved = movedLabel(rowKey, quote, change);
  const range = quote.range;
  const panelId = `international-${rowKey}`;

  /* Either half is enough to be worth opening. The metals carry both in
   * practice, but a day when gold has releases and no range is a real day. */
  const expandable = Boolean(range) || events !== null;

  const face = (
    <>
      <Medallion rowKey={rowKey} />

      <span className="min-w-0 flex-1 text-left">
        <span className="block font-display text-[19px] leading-tight font-semibold tracking-[0.01em] whitespace-nowrap text-rate-emerald sm:text-[26px]">
          {label}
        </span>
        <span className="mt-1 block text-[11px] leading-snug text-rate-ink/70 sm:text-sm">
          {caption}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <TickedPrice tick={tick}>{price(rowKey, quote.usd)}</TickedPrice>
        {moved === null ? null : (
          <span
            className={cn(
              "nums mt-1.5 inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10.5px] font-semibold sm:px-2 sm:text-xs",
              direction === "up" && "bg-success/10 text-success",
              direction === "down" && "bg-red-700/10 text-red-700",
              direction === "flat" && "bg-rate-gold/15 text-rate-ink/70",
            )}
          >
            {direction === "up" ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : null}
            {direction === "down" ? <TrendingDown className="h-3.5 w-3.5" aria-hidden /> : null}
            {moved}
          </span>
        )}
      </span>

      {/*
        Only drawn where there is something behind it. A chevron on a row that
        cannot open is an invitation to a click that does nothing.
      */}
      {expandable ? (
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rate-gold/10 text-rate-gold-deep sm:h-6 sm:w-6"
          aria-hidden
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 sm:h-4 sm:w-4",
              open && "rotate-180",
            )}
          />
        </span>
      ) : null}
    </>
  );

  const card =
    "overflow-hidden rounded-xl border bg-white/70 shadow-[0_1px_2px_rgb(22_61_52/0.04)] transition-[border-color,box-shadow]";

  /*
   * A row with nothing behind it is not a button. The instrument is still on
   * the board with its price and its move — it simply has nothing more to say,
   * which is the case whenever a source published a price but no high and low.
   */
  if (!expandable) {
    return (
      <li className={cn(card, "border-rate-gold/35")}>
        <div className="flex items-center gap-2.5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-5">{face}</div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        card,
        open
          ? "border-rate-gold/70 shadow-[0_8px_24px_rgb(22_61_52/0.10)]"
          : "border-rate-gold/35 hover:border-rate-gold/70",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2.5 px-3 py-4 text-left hover:bg-rate-gold/5 sm:gap-6 sm:px-6 sm:py-5"
      >
        {face}
      </button>

      {open ? (
        <div
          id={panelId}
          className="grid gap-6 border-t border-rate-gold/25 px-3 pt-4 pb-5 sm:grid-cols-2 sm:px-6"
        >
          {range ? (
            <RangeBar rowKey={rowKey} usd={quote.usd} range={range} price={price} change={change} />
          ) : null}
          {events ? <Releases rowKey={rowKey} events={events} /> : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * The coin each instrument sits on, as each of the shop's own rates does.
 *
 * The metals take the shop's own artwork — the gold piece and the silver bar
 * the board above already uses — so gold here is recognisably the same gold.
 * The three that are not metals get a line drawing in the text gold.
 */
function Medallion({ rowKey }: { rowKey: BoardRowKey }) {
  const drawn = "h-6 w-6 text-rate-gold-deep sm:h-7 sm:w-7";

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rate-gold/60 bg-gradient-to-br from-white to-rate-ivory shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_3px_rgb(22_61_52/0.10)] sm:h-14 sm:w-14"
      aria-hidden
    >
      {rowKey === "gold" ? (
        <MetalIcon karat="24K" className="h-7 w-7 object-contain sm:h-9 sm:w-9" />
      ) : null}
      {rowKey === "silver" ? (
        <MetalIcon karat="999" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
      ) : null}
      {rowKey === "dollarIndex" ? <DollarSign className={drawn} strokeWidth={1.6} /> : null}
      {rowKey === "bitcoin" ? <Bitcoin className={drawn} strokeWidth={1.6} /> : null}
      {rowKey === "crude" ? <Droplet className={drawn} strokeWidth={1.6} /> : null}
    </span>
  );
}

/**
 * A price with the arrow of its last move beside it.
 *
 * The arrow stays until the next move, so a glance at any moment says which
 * way each figure last went; the flash behind the figure is the moment it
 * went. The flash is keyed on the tick's count so it replays on every move,
 * two rises in a row included, and it is only ever drawn after a real move —
 * a board that has just loaded shows its figures plain until one changes.
 *
 * The arrow's slot is reserved before there is an arrow to put in it, so the
 * first tick does not shove the figure sideways.
 */
function TickedPrice({ tick, children }: { tick: Tick | undefined; children: string }) {
  const direction = tick?.direction;

  return (
    <span
      key={tick?.seq ?? 0}
      className={cn(
        "nums -mx-1 flex items-center justify-end gap-1 rounded-[2px] px-1 text-xl leading-none font-bold tracking-tight sm:gap-1.5 sm:text-[32px]",
        direction === "up" && "text-success",
        direction === "down" && "text-red-700",
        direction && "tick-flash",
      )}
    >
      <span className="w-2.5 text-[11px] leading-none" aria-hidden>
        {direction === "up" ? "▲" : direction === "down" ? "▼" : null}
      </span>
      <span className="text-rate-emerald">{children}</span>
      {direction ? (
        <span className="sr-only">
          {direction === "up" ? ", last moved up" : ", last moved down"}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The high, the low, and where the price sits between them.
 *
 * The marker is the part that has to be earned: it appears only when the price
 * is genuinely inside the range being drawn. The two numbers are shown either
 * way, because they are true regardless of whether a dot can be placed between
 * them.
 */
function RangeBar({
  rowKey,
  usd,
  range,
  price,
  change,
}: {
  rowKey: BoardRowKey;
  /** The live price in dollars, which is what places the marker. */
  usd: number;
  range: MarketRange;
  price: PriceFormatter;
  change: PriceFormatter;
}) {
  /*
   * Placed on the dollar figures, always.
   *
   * The marker is a ratio, and converting both ends and the price by the same
   * rate cannot move it — but it can introduce rounding that nudges a price
   * sitting exactly on its high to the wrong side of it. The arithmetic stays
   * where the source put it; only the labels change units.
   */
  const position = rangePosition(usd, range);

  return (
    <div className="border-l-2 border-rate-gold/50 pl-4">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
        {rangeLabel(range.window)}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <span className="nums text-sm text-ink">
          <span className="sr-only">Low </span>
          {price(rowKey, range.low)}
        </span>

        <span
          className="relative h-1.5 flex-1 rounded-full bg-gradient-to-r from-rate-gold/20 via-rate-gold/45 to-rate-gold/20"
          aria-hidden
        >
          {position === null ? null : (
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rate-gold-deep ring-2 ring-white"
              style={{ left: `${position * 100}%` }}
            />
          )}
        </span>

        <span className="nums text-sm text-ink">
          <span className="sr-only">High </span>
          {price(rowKey, range.high)}
        </span>
      </div>

      {/*
        The metals only. Their row carries no move at all — the spot source
        publishes a price and nothing else — so this is the one place gold and
        silver can say what the day has done, and it says whose day it was.
      */}
      {range.instrument && typeof range.change === "number" ? (
        <p className="nums mt-3 text-sm text-ink">
          {change(rowKey, range.change)}{" "}
          <span className="text-warmgrey">on the contract today</span>
        </p>
      ) : null}

      <InfoNote size="md" label="Source" className="mt-2">
        {provenance(range)}
      </InfoNote>
    </div>
  );
}

/**
 * The releases due today that move this instrument.
 *
 * What a dealer actually wants from a calendar is the next hour: at half past
 * six this evening the American jobs figure lands, and until then the ounce is
 * waiting. So this is a list of times and names, nothing ranked and nothing
 * predicted — the forecast and the last reading are the feed's own figures,
 * shown because they are the two numbers the release will be judged against.
 *
 * An empty list is printed as an empty day rather than hidden. Saturday has no
 * releases on it, and "nothing is scheduled" is a useful thing to be told; it
 * is only a day the feed never covered that this is never asked about, which
 * eventsToday settles by returning null instead of an empty list.
 */
function Releases({ rowKey, events }: { rowKey: BoardRowKey; events: MarketEvent[] }) {
  return (
    <div className="border-l-2 border-rate-gold/50 pl-4">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
        Today&rsquo;s data
      </p>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink">Nothing is scheduled today.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={`${event.at}-${event.currency}-${event.title}`} className="flex gap-3">
              <span className="nums w-[62px] shrink-0 text-sm font-semibold text-rate-emerald">
                {eventTime(event.at)}
              </span>

              <span className="min-w-0">
                <span className="block text-sm leading-snug text-ink">
                  {event.title}
                  <span className="ml-1.5 text-warmgrey">{event.currency}</span>
                </span>

                <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-warmgrey">
                  {/*
                    High is the only thing on this list worth a colour. Marking
                    medium as well would leave nothing unmarked, and the point
                    of the mark is that three releases a week carry it.
                  */}
                  <span
                    className={cn(
                      "font-semibold tracking-wide uppercase",
                      event.impact === "High" ? "text-red-700" : "text-warmgrey",
                    )}
                  >
                    {event.impact === "High" ? "High impact" : "Medium"}
                  </span>
                  {event.actual ? (
                    <span className="nums font-semibold text-ink">Actual {event.actual}</span>
                  ) : null}
                  {event.forecast ? <span className="nums">Expected {event.forecast}</span> : null}
                  {event.previous ? <span className="nums">Last {event.previous}</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <InfoNote size="md" label="Source" className="mt-2">
        {scope(rowKey)} From the metals calendar at metalsmine.com, in Pakistan time (PKT).
      </InfoNote>
    </div>
  );
}
