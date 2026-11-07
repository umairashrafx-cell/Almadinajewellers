import { useState } from "react";

import { ChevronDown, Globe, TrendingDown, TrendingUp } from "lucide-react";

import {
  MARKET_ROWS,
  formatChange,
  formatQuote,
  rangePosition,
  rangeWindowLabel,
} from "@/lib/markets";
import type { MarketBoard as Board, MarketQuote, MarketRange, MarketSnapshot } from "@/lib/markets";
import { cn } from "@/lib/utils";

import { useLiveBitcoin } from "../lib/btc-stream";
import type { Cached } from "../lib/cache";

/**
 * The world's prices, under the shop's own.
 *
 * Deliberately quieter than the board above it: smaller type, no gold, a grey
 * rule between rows. Someone standing at the counter is being quoted a figure
 * in rupees a tola, and nothing on this block should be mistakable for it.
 * These are dollars an ounce from public endpoints — context, not a quotation,
 * and the footnote says so in those words.
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

  const rows = MARKET_ROWS.filter((row) => board[row.key]);
  if (rows.length === 0) return null;

  const anyRange = rows.some((row) => board[row.key]?.range);

  return (
    <section className="mt-10 border border-warmgrey/25 bg-white/50">
      <header className="flex items-center justify-between gap-3 border-b border-warmgrey/20 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-warmgrey uppercase">
          <Globe className="h-3.5 w-3.5 text-warmgrey" aria-hidden />
          International markets
        </h2>
        <span className="text-[10px] tracking-widest text-warmgrey/80 uppercase">Indicative</span>
      </header>

      <ul className="divide-y divide-warmgrey/15">
        {rows.map((row) => (
          <Row
            key={row.key}
            label={row.label}
            unit={row.unit}
            quote={board[row.key]!}
            rowKey={row.key}
            live={row.key === "bitcoin" && Boolean(live)}
            open={open === row.key}
            onToggle={() => setOpen((current) => (current === row.key ? null : row.key))}
          />
        ))}
      </ul>

      <p className="border-t border-warmgrey/20 px-4 py-3 text-[11px] leading-relaxed text-warmgrey">
        {markets.data ? (
          <>
            Reference prices from public sources, taken {taken(markets.data.fetchedAt)} and
            refreshed every fifteen seconds while this screen is open.
          </>
        ) : (
          <>Streamed from the exchange. The rest of the board is not reachable just now.</>
        )}{" "}
        {anyRange ? <>Tap an instrument for its high and low. </> : null}
        The shop&rsquo;s own rate above is the one that settles a transaction.
      </p>
    </section>
  );
}

function Row({
  rowKey,
  label,
  unit,
  quote,
  live,
  open,
  onToggle,
}: {
  rowKey: keyof Board;
  label: string;
  unit: string;
  quote: MarketQuote;
  live: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const move = quote.changePercent;
  const rising = typeof move === "number" && move > 0;
  const falling = typeof move === "number" && move < 0;
  const range = quote.range;
  const panelId = `market-range-${rowKey}`;

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
        ? `${formatChange(rowKey, quote.change)} (${percent})`
        : percent;

  const face = (
    <>
      <span className="min-w-0 text-left">
        <span className="block text-sm text-ink">{label}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] tracking-wide text-warmgrey">
          {unit}
          {/*
            Said only where it is true. One instrument on this board streams
            and four are fetched, and a badge over the whole block would claim
            for the metals something only bitcoin can honestly offer.
          */}
          {live ? (
            <span className="flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
              live
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <span className="text-right">
          <span className="block text-sm font-semibold text-ink tabular-nums">
            {formatQuote(rowKey, quote.usd)}
          </span>
          {moved === null ? null : (
            <span
              className={cn(
                "mt-0.5 flex items-center justify-end gap-1 text-[11px] tabular-nums",
                rising && "text-primary",
                falling && "text-red-700",
                !rising && !falling && "text-warmgrey",
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
        {range ? (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-warmgrey transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        ) : null}
      </span>
    </>
  );

  /*
   * A row with no range is not a button. The instrument is still on the board
   * with its price and its move — it simply has nothing more to say, which is
   * the case whenever a source published a price but no high and low, or an
   * instrument is sitting on a figure kept from an earlier fetch.
   */
  if (!range) {
    return <li className="flex items-baseline justify-between gap-4 px-4 py-3">{face}</li>;
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left active:bg-warmgrey/5"
      >
        {face}
      </button>

      {open ? (
        <div id={panelId} className="px-4 pb-4">
          <RangeBar rowKey={rowKey} price={quote.usd} range={range} />
        </div>
      ) : null}
    </li>
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
  price,
  range,
}: {
  rowKey: keyof Board;
  price: number;
  range: MarketRange;
}) {
  const position = rangePosition(price, range);

  return (
    <div className="border-l-2 border-warmgrey/25 pl-3">
      <p className="text-[10px] font-semibold tracking-widest text-warmgrey uppercase">
        {rangeWindowLabel(range.window)}
      </p>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-[11px] text-ink tabular-nums">
          <span className="sr-only">Low </span>
          {formatQuote(rowKey, range.low)}
        </span>

        <span className="relative h-1 flex-1 rounded-full bg-warmgrey/25" aria-hidden>
          {position === null ? null : (
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-white"
              style={{ left: `${position * 100}%` }}
            />
          )}
        </span>

        <span className="text-[11px] text-ink tabular-nums">
          <span className="sr-only">High </span>
          {formatQuote(rowKey, range.high)}
        </span>
      </div>

      {/*
        The metals only. Their row carries no move at all — the spot source
        publishes a price and nothing else — so this is the one place gold and
        silver can say what the day has done, and it says whose day it was.
      */}
      {range.instrument && typeof range.change === "number" ? (
        <p className="mt-2 text-[11px] text-ink tabular-nums">
          {formatChange(rowKey, range.change)}{" "}
          <span className="text-warmgrey">on the contract today</span>
        </p>
      ) : null}

      <p className="mt-2 text-[10px] leading-relaxed text-warmgrey">{provenance(range)}</p>
    </div>
  );
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
