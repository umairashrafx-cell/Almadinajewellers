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
 * The widget is the ticker tape. Its still sibling, "tickers", shows a single
 * instrument at a phone's width and hides the rest; the tape carries them all
 * past in a line, each price and its move updating as it trades.
 */

export const TICKERS_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";

/**
 * Gold, silver and the dollar index, and nothing else.
 *
 * The three that move a jeweller's rate: the two metals themselves, and the
 * dollar they are priced in. Bitcoin and crude stay on the board below, but
 * the shop asked for the strip to carry only these, so a customer glancing at
 * it sees the figures that bear on what they are buying.
 *
 * Each is the TradingView symbol the board's own figure agrees with, measured
 * side by side on 17 November 2026:
 *   - Gold and silver: OANDA spot. The board's Swissquote spot sat twenty
 *     cents from it on gold and a cent on silver.
 *   - Dollar index: Pepperstone's USDX. The board computes the index live
 *     from six FX rates by ICE's own formula and sat about 0.015 under it.
 *     TradingView's own TVC:DXY is not licensed for widgets and draws a
 *     blank; Capital.com's DXY, tried first, sat a third of a point away.
 */
export const TICKER_SYMBOLS = [
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "OANDA:XAGUSD", title: "Silver" },
  { proName: "PEPPERSTONE:USDX", title: "Dollar index" },
] as const;

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
 * How many whole minutes a quote is behind the moment it was fetched, when
 * that is worth saying.
 *
 * Under two minutes is a live quote and says nothing. Over an hour is a market
 * that is shut -- a weekend, a holiday -- where "behind" is the wrong word and
 * the board's own timestamp already tells the story. In between is a feed that
 * is delayed, which is crude's NYMEX contract on every weekday, and a figure
 * shown beside a live TradingView one must own up to it.
 */
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

export function minutesBehind(at: string, fetchedAt: string): number | null {
  const lag = Date.parse(fetchedAt) - Date.parse(at);
  if (!Number.isFinite(lag)) return null;
  const minutes = Math.round(lag / 60000);
  return minutes >= 2 && minutes <= 60 ? minutes : null;
}

/** What the widget script is handed, as the JSON body of its own tag. */
/**
 * Always TradingView's dark theme, in both of the app's.
 *
 * The strip sits on the emerald panel that crowns the International tab, the
 * same green as the shop's own rate board, and on that green only the dark
 * theme's pale figures can be read. Transparent, so the panel's gradient
 * shows through instead of TradingView's own black.
 */
export function tickersConfig() {
  return {
    symbols: TICKER_SYMBOLS,
    isTransparent: true,
    showSymbolLogo: false,
    // Price and move both, at any width; "compact" drops the move.
    displayMode: "adaptive",
    colorTheme: "dark",
    locale: "en",
  };
}
