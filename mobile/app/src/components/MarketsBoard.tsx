import { Globe, TrendingDown, TrendingUp } from "lucide-react";

import { MARKET_ROWS, formatQuote } from "@/lib/markets";
import type { MarketBoard as Board, MarketQuote, MarketSnapshot } from "@/lib/markets";
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
 */
export function MarketsBoard({ markets }: { markets: Cached<MarketSnapshot> }) {
  const live = useLiveBitcoin();

  /*
   * The streamed price wins over the fetched one whenever the socket is up.
   * It is the same instrument quoted seconds ago rather than minutes, and if
   * the socket never opens the server's figure is still there underneath.
   */
  const fetched = markets.data?.board ?? {};
  const board: Board = live
    ? { ...fetched, bitcoin: { ...live, at: new Date().toISOString() } }
    : fetched;

  const rows = MARKET_ROWS.filter((row) => board[row.key]);
  if (rows.length === 0) return null;

  return (
    <section className="mt-10 border border-warmgrey/25 bg-white/50">
      <header className="flex items-center justify-between gap-3 border-b border-warmgrey/20 px-4 py-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-warmgrey uppercase">
          <Globe className="h-3.5 w-3.5 text-warmgrey" aria-hidden />
          International markets
        </h2>
        <span className="text-[10px] tracking-widest text-warmgrey/80 uppercase">Indicative</span>
      </header>

      <dl className="divide-y divide-warmgrey/15">
        {rows.map((row) => (
          <Row
            key={row.key}
            label={row.label}
            unit={row.unit}
            quote={board[row.key]!}
            rowKey={row.key}
            live={row.key === "bitcoin" && Boolean(live)}
          />
        ))}
      </dl>

      <p className="border-t border-warmgrey/20 px-4 py-3 text-[11px] leading-relaxed text-warmgrey">
        {markets.data ? (
          <>
            Reference prices from public sources, taken {taken(markets.data.fetchedAt)} and
            refreshed every fifteen seconds while this screen is open.
          </>
        ) : (
          <>Streamed from the exchange. The rest of the board is not reachable just now.</>
        )}{" "}
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
}: {
  rowKey: keyof Board;
  label: string;
  unit: string;
  quote: MarketQuote;
  live: boolean;
}) {
  const move = quote.changePercent;
  const rising = typeof move === "number" && move > 0;
  const falling = typeof move === "number" && move < 0;

  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="min-w-0">
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
      </dt>

      <dd className="shrink-0 text-right">
        <span className="block text-sm font-semibold text-ink tabular-nums">
          {formatQuote(rowKey, quote.usd)}
        </span>
        {typeof move === "number" ? (
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
            {move > 0 ? "+" : ""}
            {move.toFixed(2)}%
          </span>
        ) : null}
      </dd>
    </div>
  );
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
