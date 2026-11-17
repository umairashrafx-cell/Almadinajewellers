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
 * instrument at a phone's width and hides the other four; the tape carries all
 * five past in a line, each price and its move updating as it trades.
 */

export const TICKERS_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";

/**
 * The same five the board carries, as TradingView names them.
 *
 * Spot metals from OANDA, spot like the board's own gold and silver; WTI as
 * TradingView's own composite quote; bitcoin against the dollar on Bitstamp, a
 * dollar market rather than a stablecoin one.
 *
 * The dollar index is Capital.com's, because TradingView's own TVC:DXY is not
 * licensed for widgets and draws an error mark in the tape. It is a CFD on the
 * index rather than the ICE quote the board carries, and the two can sit a few
 * tenths of a point apart -- one more reason the strip is labelled as
 * TradingView's and not set beside the board's figures as the same thing.
 */
export const TICKER_SYMBOLS = [
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "OANDA:XAGUSD", title: "Silver" },
  { proName: "CAPITALCOM:DXY", title: "Dollar index" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  { proName: "TVC:USOIL", title: "Crude oil" },
] as const;

/** What the widget script is handed, as the JSON body of its own tag. */
export function tickersConfig(dark: boolean) {
  return {
    symbols: TICKER_SYMBOLS,
    // Drawn on the app's own card, so it takes the card's colour in both themes.
    isTransparent: true,
    showSymbolLogo: false,
    // Price and move both, at any width; "compact" drops the move.
    displayMode: "adaptive",
    colorTheme: dark ? "dark" : "light",
    locale: "en",
  };
}
