import { useState } from "react";

import { Bitcoin, ChevronDown, DollarSign, Droplet, TrendingDown, TrendingUp } from "lucide-react";

import { MetalIcon } from "@/components/rate/MetalIcon";

import {
  MARKET_ROWS,
  calendarCurrencies,
  convertsToTola,
  eventTime,
  eventsToday,
  formatQuote,
  perTolaPKR,
  rangePosition,
  rangeWindowLabel,
} from "@/lib/markets";
import type {
  MarketBoard as Board,
  MarketEvent,
  MarketQuote,
  MarketRange,
  MarketSnapshot,
} from "@/lib/markets";
import { formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

import { useLiveBitcoin } from "../lib/btc-stream";
import type { Cached } from "../lib/cache";
import { useTicks } from "../lib/ticks";
import { BOARD_TICKERS, minutesBehind, rowCaption } from "../lib/tradingview";
import type { Tick } from "../lib/ticks";

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
/**
 * Which units the two metals are shown in.
 *
 * Only the metals move. A tola of the dollar index is not a thing, and nobody
 * weighs a barrel of crude or a bitcoin in one, so those three stay in their
 * own units whichever way this is set -- which is why the control says
 * "metals in" rather than pretending to convert the whole board.
 */
type Unit = "usd" | "tola";

/** What one dollar buys, when the board is carrying a usable figure for it. */
function interbank(board: Board): number | null {
  const quote = board.usdPkr?.usd;
  return typeof quote === "number" && Number.isFinite(quote) && quote > 0 ? quote : null;
}

/**
 * A price formatter that knows which units the board is in.
 *
 * Built once and handed down, so the row and the range bar do not each have
 * to decide what to do about tolas -- they ask for a figure formatted and get
 * one. Anything it cannot honestly convert comes back in dollars rather than
 * coming back wrong: a row that is not a metal, a board with no dollar rate,
 * and a figure perTolaPKR refuses all take the same path out.
 */
function priceIn(unit: Unit, usdPkr: number | null) {
  return (key: keyof Board, value: number): string => {
    if (unit === "usd" || usdPkr === null || !convertsToTola(key)) return formatQuote(key, value);
    const converted = perTolaPKR(value, usdPkr);
    if (converted === null) return formatQuote(key, value);
    // To the rupee. The paisa on a figure this size is noise, and the shop's
    // own board next door is quoted whole.
    return formatPKR(Math.round(converted));
  };
}

/**
 * The same, for a move: sign first, magnitude formatted like a price.
 *
 * Kept here rather than reusing formatChange because the sign has to sit
 * outside whichever currency the magnitude ends up in. In dollars it produces
 * exactly what formatChange always did.
 */
function changeIn(price: (key: keyof Board, value: number) => string) {
  return (key: keyof Board, value: number): string => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${price(key, Math.abs(value))}`;
  };
}

/** What to call a metal's unit once it is being quoted by weight. */
function unitLabel(key: keyof Board, unit: Unit, usdPkr: number | null, fallback: string): string {
  if (unit === "usd" || usdPkr === null || !convertsToTola(key)) return fallback;
  // 24K said out loud on the gold only. Spot gold is pure metal and the shop's
  // own headline rate is 22K, so the two figures are not the same thing and
  // the board must not let them be read as though they were.
  return key === "gold" ? "per tola, 24K" : "per tola";
}

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
   * The streamed price wins over the fetched one whenever the socket is up.
   * It is the same instrument quoted seconds ago rather than minutes, and if
   * the socket never opens the server's figure is still there underneath.
   *
   * The range is carried across by hand rather than by spreading the fetched
   * quote underneath: the stream sends a price and a move and nothing else, and
   * spreading would quietly pair a live price with whatever else was in the old
   * object. So the range comes over, named, and nothing else does. It stays
   * CoinGecko's twenty-four hours while the price is the exchange's latest
   * tick, which is why a bitcoin that has just made a new high shows its two
   * numbers without a marker between them.
   */
  const fetched = markets.data?.board ?? {};
  const board: Board = live
    ? {
        ...fetched,
        bitcoin: {
          ...live,
          // Spread rather than assigned, because the key has to be absent when
          // there is no range to carry over, not present and undefined.
          ...(fetched.bitcoin?.range ? { range: fetched.bitcoin.range } : {}),
          at: new Date().toISOString(),
        },
      }
    : fetched;

  /*
   * Each row with its own two answers worked out once: the range it traded in,
   * and the releases due today that move it. `events` being null rather than
   * empty is the honest case — see eventsToday — and it travels as null all the
   * way to the panel, which then says nothing instead of saying "nothing".
   */
  /*
   * Gold and silver's releases are not repeated here: they have a section of
   * their own under the board (GoldCalendar), laid out to be read on a phone.
   * The dollar index keeps its list, because its basket's releases are not
   * the metals' and appear nowhere else.
   */
  const calendar = markets.data?.calendar;
  const rows = MARKET_ROWS.flatMap((row) => {
    const quote = board[row.key];
    const events = row.key === "dollarIndex" ? eventsToday(row.key, calendar) : null;
    return quote ? [{ ...row, quote, events }] : [];
  });

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
      <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-rate-ink/70">
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
      </p>
    </section>
  );
}

/** What the footnote offers, said only about what the board actually has. An
 *  older deployment of the function sends ranges and no calendar, and this
 *  screen has to read correctly against it. */
function tapHint(anyRange: boolean, anyEvents: boolean): string | null {
  if (anyRange && anyEvents) return "Tap an instrument for its range and the day's releases.";
  if (anyRange) return "Tap an instrument for its high and low.";
  if (anyEvents) return "Tap an instrument for the day's releases.";
  return null;
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
  price: (key: keyof Board, value: number) => string;
  /** The same, signed, for a move. */
  change: (key: keyof Board, value: number) => string;
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

  /*
   * The cash figure leads and the percentage follows it in brackets, because
   * "down four hundred dollars" is the sentence somebody standing at a counter
   * actually says. Where a source gives a percentage but no cash figure the
   * percentage stands alone exactly as it did before, rather than sitting in
   * brackets after nothing.
   */
  const percent = typeof move === "number" ? `${move > 0 ? "+" : ""}${move.toFixed(2)}%` : null;
  const moved =
    percent === null
      ? null
      : typeof quote.change === "number"
        ? `${change(rowKey, quote.change)} (${percent})`
        : percent;

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
  price: (key: keyof Board, value: number) => string;
  change: (key: keyof Board, value: number) => string;
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
        {rangeWindowLabel(range.window)}
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

      <p className="mt-2 text-[10px] leading-relaxed text-warmgrey">{provenance(range)}</p>
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

      <p className="mt-2 text-[10px] leading-relaxed text-warmgrey">
        {scope(rowKey)} From the metals calendar at metalsmine.com, in Pakistan time (PKT).
      </p>
    </div>
  );
}

/**
 * Whose releases these are, said plainly.
 *
 * Gold is watching one country's data and the dollar index is watching the six
 * currencies it is measured against, and a reader is entitled to know which of
 * those they are looking at before drawing a conclusion from a short list.
 */
function scope(rowKey: keyof Board): string {
  const currencies = calendarCurrencies(rowKey) ?? [];
  if (currencies.length === 0) return "";
  if (currencies.length === 1) {
    return `High and medium impact ${currencies[0]} releases.`;
  }

  return `High and medium impact releases for the index basket — ${currencies.join(", ")}.`;
}

/**
 * Where the two figures came from, in one sentence.
 *
 * Always said, never implied. A range measured over a half-finished trading
 * session is not a day's range, and a futures range under a spot price is not
 * that price's range — both are worth showing and neither is worth leaving
 * unlabelled.
 */
function provenance(range: MarketRange): string {
  if (range.instrument) {
    return `${range.instrument}. The price above is spot, which can sit outside this range.`;
  }

  return range.window === "24h"
    ? "A rolling twenty-four hours."
    : "The current trading session, not a full day.";
}

/** "11:47am", or the date too once it is no longer today. */
function taken(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "recently";

  const sameDay = at.toDateString() === new Date().toDateString();
  return at.toLocaleString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
  });
}
