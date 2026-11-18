import { useState } from "react";

import { Bitcoin, ChevronDown, DollarSign, Droplet, TrendingDown, TrendingUp } from "lucide-react";

import { MetalIcon } from "@/components/rate/MetalIcon";

import { eventTime, rangePosition } from "@/lib/markets";
import type {
  MarketBoard as Board,
  MarketEvent,
  MarketQuote,
  MarketRange,
  MarketSnapshot,
} from "@/lib/markets";
import {
  boardRows,
  changeIn,
  interbank,
  movedLabel,
  priceIn,
  provenance,
  rangeLabel,
  scope,
  tapHint,
  taken,
  unitLabel,
  withLiveBitcoin,
} from "@/lib/markets-board";
import type { PriceFormatter, Unit } from "@/lib/markets-board";
import { useTicks } from "@/lib/ticks";
import type { Tick } from "@/lib/ticks";
import { BOARD_TICKERS, minutesBehind, rowCaption } from "@/lib/tradingview";
import { cn } from "@/lib/utils";

import { InfoNote } from "@/components/ui/InfoNote";
import { useLiveBitcoin } from "../lib/btc-stream";
import type { Cached } from "../lib/cache";

/**
 * The world's prices, under the shop's own.
 *
 * Drawn in the shop's own language since the shop asked for the tab to be as
 * handsome as the Local one: each instrument a card with a gold medallion, its
 * name in the display serif, its price set large. What keeps it from being
 * mistaken for the shop's quotation is said rather than left to a duller
 * style -- the figures are in dollars, the section is headed "Indicative", and
 * the footnote says in so many words that the shop's own rate is the one that
 * settles a transaction.
 *
 * An instrument that could not be fetched is simply absent. A board of four is
 * honest; a board of five with a zero in it is not.
 *
 * Each instrument opens to show the high and the low it has traded between.
 * That is the one thing a customer asks after the price itself — whether today
 * is a good day to buy or a dear one — and it sits behind a tap rather than on
 * the face of the board, because five rows of three figures each is a trading
 * terminal and this is a jeweller's rate screen.
 */
export function MarketsBoard({ markets }: { markets: Cached<MarketSnapshot> }) {
  const live = useLiveBitcoin();

  /*
   * One row open at a time. Independent toggles would let the board grow by
   * five panels at once on a screen that is already scrolling, and nobody
   * compares two ranges by holding both open — they tap one, read it, and tap
   * the next.
   */
  const [open, setOpen] = useState<keyof Board | null>(null);

  /*
   * Dollars an ounce until somebody asks otherwise.
   *
   * That is the board's own language and the one its sources quote in, and
   * switching it by default would quietly turn a reference panel into a second
   * rupee rate sitting under the shop's own. The rupee view is the answer to a
   * question somebody chose to ask.
   */
  const [unit, setUnit] = useState<Unit>("usd");

  /*
   * The streamed bitcoin laid over the board the server fetched, and then the
   * rows worked out from it. Both are shared with the website's own board --
   * see lib/markets-board.ts, which carries the reasoning for each.
   */
  const board: Board = withLiveBitcoin(
    markets.data?.board ?? {},
    live,
    new Date().toISOString(),
  );
  const rows = boardRows(board, markets.data?.calendar);

  /*
   * No dollar rate, no choice to offer. An older deployment of the edge
   * function sends five instruments and no rupee, and against one of those
   * this board has to read exactly as it did before rather than showing a
   * control that cannot do anything.
   */
  const usdPkr = interbank(board);
  const showing: Unit = usdPkr === null ? "usd" : unit;
  const price = priceIn(showing, usdPkr);
  const change = changeIn(price);

  /*
   * Up or down since the last figure, row by row. Asked of the figure as it
   * is printed, so the arrow only ever moves when the digits do -- see
   * ticks.ts. Ahead of the early return below because it is a hook.
   */
  const ticks = useTicks(
    rows.map((row) => ({ key: row.key, usd: row.quote.usd, shown: price(row.key, row.quote.usd) })),
  );

  if (rows.length === 0) return null;

  const anyRange = rows.some((row) => row.quote.range);
  const anyEvents = rows.some((row) => row.events !== null);

  return (
    <section className="mt-8">
      <header className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-rate-gold-deep uppercase">
            Reference board
          </p>
          <h2 className="mt-0.5 font-display text-[26px] leading-tight font-semibold text-rate-emerald">
            International rates
          </h2>
        </div>
        <span className="mb-1 rounded-full border border-rate-gold/40 px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
          Indicative
        </span>
      </header>

      {usdPkr === null ? null : <UnitToggle unit={showing} usdPkr={usdPkr} onChange={setUnit} />}

      <ul className="mt-4 grid gap-3">
        {rows.map((row) => (
          <Row
            key={row.key}
            label={row.label}
            unit={rowCaption(
              unitLabel(row.key, showing, usdPkr, row.unit),
              BOARD_TICKERS[row.key],
              markets.data ? minutesBehind(row.quote.at, markets.data.fetchedAt) : null,
            )}
            price={price}
            change={change}
            quote={row.quote}
            rowKey={row.key}
            events={row.events}
            tick={ticks[row.key]}
            live={row.key === "bitcoin" && Boolean(live)}
            open={open === row.key}
            onToggle={() => setOpen((current) => (current === row.key ? null : row.key))}
          />
        ))}
      </ul>

      <span
        className="mx-auto mt-7 block h-px w-full max-w-xs bg-gradient-to-r from-transparent via-rate-gold/60 to-transparent"
        aria-hidden
      />
      <InfoNote align="center" className="mt-3 px-2">
        {markets.data ? (
          <>
            Reference prices from public sources, taken {taken(markets.data.fetchedAt)} and
            refreshed every five seconds while this screen is open.{" "}
            {live ? "Bitcoin ticks every second from the exchange; the" : "The"} arrow beside a
            price shows which way it last moved, and only moves when the source does.
          </>
        ) : (
          <>Streamed from the exchange. The rest of the board is not reachable just now.</>
        )}{" "}
        {tapHint(anyRange, anyEvents)} The shop&rsquo;s own rate is the one that settles a
        transaction.{" "}
        {showing === "tola" && usdPkr !== null ? (
          <>
            Gold and silver are converted at Rs.&nbsp;{usdPkr.toFixed(2)} to the dollar, the
            interbank rate — pure metal, before duty, premium or making.
          </>
        ) : null}
      </InfoNote>
    </section>
  );
}

/**
 * Dollars an ounce, or rupees a tola.
 *
 * Two buttons rather than a switch, because a switch has to be read to find
 * out which way it is pointing and a pair of labels says it outright. The
 * dollar rate itself sits beside them, unlabelled in the rupee view and named
 * in neither: a customer who wants to check the conversion can see what it was
 * done at, and one who does not is reading two short words.
 *
 * The same pill as the Local and International tabs above it, so it reads as
 * a control the app already taught rather than a new one.
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
    <div className="mt-4 flex items-center justify-between gap-3 px-1">
      <span className="flex flex-col">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-rate-ink/70 uppercase">
          Metals in
        </span>
        {unit === "tola" ? (
          <span className="nums mt-0.5 text-[10px] text-rate-ink/60">
            $1 = Rs.&nbsp;{usdPkr.toFixed(2)}
          </span>
        ) : null}
      </span>

      <span className="card-lift-sm grid grid-cols-2 gap-1 rounded-full border border-gold/20 bg-white p-1">
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
              "rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide transition-colors",
              unit === choice.id
                ? "bg-rate-emerald text-rate-ivory shadow-sm"
                : "text-rate-ink/70 active:bg-rate-gold/10",
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
  unit,
  price,
  change,
  quote,
  events,
  tick,
  live,
  open,
  onToggle,
}: {
  rowKey: keyof Board;
  label: string;
  unit: string;
  /** Formats a figure in whichever units the board is currently showing. */
  price: PriceFormatter;
  /** The same, signed, for a move. */
  change: PriceFormatter;
  quote: MarketQuote;
  events: MarketEvent[] | null;
  /** Which way the printed figure last moved, and how many times it has. */
  tick: Tick | undefined;
  live: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const move = quote.changePercent;
  const rising = typeof move === "number" && move > 0;
  const falling = typeof move === "number" && move < 0;
  const range = quote.range;
  const panelId = `market-range-${rowKey}`;

  /* Either half is enough to be worth opening. The metals carry both in
   * practice, but a day when gold has releases and no range is a real day. */
  const expandable = Boolean(range) || events !== null;

  /* The day's move, cash first and the percentage after it. See movedLabel. */
  const moved = movedLabel(rowKey, quote, change);

  const face = (
    <>
      <Medallion rowKey={rowKey} />

      <span className="min-w-0 flex-1 text-left">
        <span className="block font-display text-[19px] leading-tight font-semibold whitespace-nowrap text-rate-emerald">
          {label}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10.5px] leading-snug text-rate-ink/65">
          {unit}
          {/*
            Said only where it is true. One instrument on this board streams
            and four are fetched, and a badge over the whole block would claim
            for the metals something only bitcoin can honestly offer.
          */}
          {live ? (
            <span className="flex items-center gap-1 font-semibold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden />
              live
            </span>
          ) : null}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <TickedPrice tick={tick}>{price(rowKey, quote.usd)}</TickedPrice>
        {moved === null ? null : (
          <span
            className={cn(
              "nums mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
              rising && "bg-success/10 text-success",
              falling && "bg-red-700/10 text-red-700",
              !rising && !falling && "bg-rate-gold/10 text-rate-ink/60",
            )}
          >
            {rising ? <TrendingUp className="h-3 w-3" aria-hidden /> : null}
            {falling ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
            {moved}
          </span>
        )}
      </span>

      {/*
        Only drawn where there is something behind it. A chevron on a row
        that cannot open is an invitation to a tap that does nothing.
      */}
      {expandable ? (
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rate-gold/10 text-rate-gold-deep"
          aria-hidden
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")}
          />
        </span>
      ) : null}
    </>
  );

  const card =
    "card-lift-sm overflow-hidden rounded-xl border border-rate-gold/35 bg-white/70 transition-colors";

  /*
   * A row with nothing behind it is not a button. The instrument is still on
   * the board with its price and its move — it simply has nothing more to say,
   * which is the case whenever a source published a price but no high and low,
   * or an instrument is sitting on a figure kept from an earlier fetch. Crude
   * and bitcoin are here permanently: the metals calendar is not theirs.
   */
  if (!expandable) {
    return (
      <li className={card}>
        <div className="flex items-center gap-2.5 px-3 py-3.5">{face}</div>
      </li>
    );
  }

  return (
    <li className={cn(card, open && "border-rate-gold/70")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2.5 px-3 py-3.5 text-left active:bg-rate-gold/5"
      >
        {face}
      </button>

      {open ? (
        <div id={panelId} className="space-y-4 border-t border-rate-gold/25 px-4 pt-3.5 pb-4">
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
 * The metals take the shop's own artwork -- the gold piece and the silver
 * bar the Local tab already uses -- so gold here is recognisably the same
 * gold. The three that are not metals get a line drawing in the text gold.
 */
function Medallion({ rowKey }: { rowKey: keyof Board }) {
  const drawn = "h-5 w-5 text-rate-gold-deep";

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rate-gold/60 bg-gradient-to-br from-white to-rate-ivory shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_1px_3px_rgb(22_61_52/0.10)]"
      aria-hidden
    >
      {rowKey === "gold" ? <MetalIcon karat="24K" className="h-7 w-7 object-contain" /> : null}
      {rowKey === "silver" ? <MetalIcon karat="999" className="h-7 w-7 object-contain" /> : null}
      {rowKey === "dollarIndex" ? <DollarSign className={drawn} strokeWidth={1.8} /> : null}
      {rowKey === "bitcoin" ? <Bitcoin className={drawn} strokeWidth={1.8} /> : null}
      {rowKey === "crude" ? <Droplet className={drawn} strokeWidth={1.8} /> : null}
    </span>
  );
}

/**
 * A price with the arrow of its last move beside it.
 *
 * The arrow stays until the next move, so a glance at any moment says which
 * way each figure last went; the flash behind the figure is the moment it
 * went. The flash is keyed on the tick's count so it replays on every move,
 * two rises in a row included, and it is only ever drawn after a real move --
 * a board that has just opened shows its figures plain until one changes.
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
        "nums -mx-1 flex items-center justify-end gap-1 rounded-md px-1 text-[17px] leading-tight font-bold tracking-tight",
        direction === "up" && "text-success",
        direction === "down" && "text-red-700",
        direction && "tick-flash",
      )}
    >
      <span className="w-2 text-[9px] leading-none" aria-hidden>
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
  rowKey: keyof Board;
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
   * rate cannot move it -- but it can introduce rounding that nudges a price
   * sitting exactly on its high to the wrong side of it. The arithmetic stays
   * where the source put it; only the labels change units.
   */
  const position = rangePosition(usd, range);

  return (
    <div className="border-l-2 border-rate-gold/50 pl-3">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
        {rangeLabel(range.window)}
      </p>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-[11px] text-ink tabular-nums">
          <span className="sr-only">Low </span>
          {price(rowKey, range.low)}
        </span>

        <span
          className="relative h-1.5 flex-1 rounded-full bg-gradient-to-r from-rate-gold/20 via-rate-gold/45 to-rate-gold/20"
          aria-hidden
        >
          {position === null ? null : (
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rate-gold-deep shadow-sm ring-2 ring-white"
              style={{ left: `${position * 100}%` }}
            />
          )}
        </span>

        <span className="text-[11px] text-ink tabular-nums">
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
        <p className="mt-2 text-[11px] text-ink tabular-nums">
          {change(rowKey, range.change)}{" "}
          <span className="text-warmgrey">on the contract today</span>
        </p>
      ) : null}

      <InfoNote label="Source" className="mt-1.5">
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
function Releases({ rowKey, events }: { rowKey: keyof Board; events: MarketEvent[] }) {
  return (
    <div className="border-l-2 border-rate-gold/50 pl-3">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
        Today&rsquo;s data
      </p>

      {events.length === 0 ? (
        <p className="mt-2 text-[11px] text-ink">Nothing is scheduled today.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {events.map((event) => (
            <li key={`${event.at}-${event.currency}-${event.title}`} className="flex gap-2.5">
              <span className="w-[54px] shrink-0 text-[11px] font-semibold text-rate-emerald tabular-nums">
                {eventTime(event.at)}
              </span>

              <span className="min-w-0">
                <span className="block text-[11px] leading-snug text-ink">
                  {event.title}
                  <span className="ml-1.5 text-warmgrey">{event.currency}</span>
                </span>

                <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[10px] text-warmgrey">
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
                    <span className="font-semibold text-ink">Actual {event.actual}</span>
                  ) : null}
                  {event.forecast ? <span>Expected {event.forecast}</span> : null}
                  {event.previous ? <span>Last {event.previous}</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <InfoNote label="Source" className="mt-1.5">
        {scope(rowKey)} From the metals calendar at metalsmine.com, in Pakistan time (PKT).
      </InfoNote>
    </div>
  );
}
