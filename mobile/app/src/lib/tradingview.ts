/**
 * TradingView's own live prices, by the one route they allow.
 *
 * TradingView publishes no data feed for other apps: its prices are licensed
 * from the exchanges, and reading them out of its website would break its
 * terms. What it does offer, free, is a set of embeddable widgets — an iframe
 * it draws itself, with its own prices ticking in it every second and a link
 * back to it. So this is a window onto TradingView, not a source for this
 * app's figures: nothing in the widget is read, stored or converted here, and
 * the board under it keeps its own sources and its own arithmetic.
 *
 * The widget is "symbol info": one instrument, its price set large and bold,
 * its move and whether the market is open beside it, updating as it trades.
 * The shop asked for gold alone and in bold. The ticker tape draws every
 * symbol in the same small regular weight with no font setting, and the
 * single-quote widget, tried next, sets the price only a little larger than
 * the tape; this one is the large bold figure. It also carries a row of the
 * day's open, previous close and volume, which it offers no way to hide;
 * the panel cuts the frame off above it (see TradingViewTickers).
 */

export const TICKERS_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";

/**
 * Gold, and nothing else: spot gold in dollars an ounce, as OANDA quotes it.
 *
 * The figure the board's own gold agrees with -- measured side by side on 17
 * November 2026, the board's Swissquote spot sat twenty cents from it. Silver
 * and the dollar index stay on the board below, where they always were.
 */
export const TICKER_SYMBOL = { proName: "OANDA:XAUUSD", title: "Gold" } as const;

/**
 * What each row of the board is, as somebody would type it into TradingView
 * to find the same thing. Shown under the row's name so the figure can be
 * checked there.
 */
export const BOARD_TICKERS = {
  gold: "XAUUSD",
  silver: "XAGUSD",
  dollarIndex: "DXY",
  bitcoin: "BTCUSDT",
  crude: "CL1!",
} as const;

/**
 * The small line under a row's name: its unit, its TradingView ticker, and how
 * late it is if it is late. The ticker is left off where the unit already is
 * the ticker, so the dollar index reads "DXY" and not "DXY · DXY".
 */
export function rowCaption(unit: string, ticker: string, behind: number | null): string {
  const parts = unit === ticker ? [unit] : [unit, ticker];
  if (behind !== null) parts.push(`${behind} min behind`);
  return parts.join(" · ");
}

/**
 * How many whole minutes a quote is behind the moment it was fetched, when
 * that is worth saying.
 *
 * Under two minutes is a live quote and says nothing. Over an hour is a market
 * that is shut -- a weekend, a holiday -- where "behind" is the wrong word and
 * the board's own timestamp already tells the story. In between is a feed that
 * is delayed, which is crude's NYMEX contract on every weekday, and a figure
 * shown beside a live TradingView one must own up to it.
 */

export function minutesBehind(at: string, fetchedAt: string): number | null {
  const lag = Date.parse(fetchedAt) - Date.parse(at);
  if (!Number.isFinite(lag)) return null;
  const minutes = Math.round(lag / 60000);
  return minutes >= 2 && minutes <= 60 ? minutes : null;
}

/**
 * What the widget script is handed, as the JSON body of its own tag.
 *
 * Always TradingView's dark theme, in both of the app's. The quote sits on the
 * emerald panel that crowns the International tab, the same green as the
 * shop's own rate board, and on that green only the dark theme's pale figures
 * can be read. Transparent, so the panel's gradient shows through instead of
 * TradingView's own black.
 */
export function tickersConfig() {
  return {
    symbol: TICKER_SYMBOL.proName,
    width: "100%",
    isTransparent: true,
    colorTheme: "dark",
    locale: "en",
  };
}
