import { describe, expect, test } from "vitest";

import {
  BOARD_TICKERS,
  TICKERS_SCRIPT,
  TICKER_SYMBOLS,
  minutesBehind,
  rowCaption,
  tickersConfig,
} from "./tradingview";

/**
 * The TradingView strip's configuration. The widget itself is TradingView's
 * and is checked by looking at it; what can go wrong on this side is the
 * list it is handed and the theme it is drawn in.
 */
describe("the TradingView strip", () => {
  test("loads the ticker tape from TradingView's own host", () => {
    expect(new URL(TICKERS_SCRIPT).host).toBe("s3.tradingview.com");
    expect(TICKERS_SCRIPT).toMatch(/embed-widget-ticker-tape\.js$/);
  });

  test("carries gold, silver and the dollar index, and nothing else", () => {
    expect(TICKER_SYMBOLS.map((symbol) => symbol.title)).toEqual([
      "Gold",
      "Silver",
      "Dollar index",
    ]);
  });

  test("does not ask for TradingView's own dollar index, which widgets cannot show", () => {
    expect(TICKER_SYMBOLS.map((symbol) => symbol.proName)).not.toContain("TVC:DXY");
  });

  test("is drawn in TradingView's dark theme, for the emerald panel it sits on", () => {
    expect(tickersConfig().colorTheme).toBe("dark");
  });

  test("is transparent, so the panel's own green shows through", () => {
    expect(tickersConfig().isTransparent).toBe(true);
  });

  test("survives being written into a script tag as JSON", () => {
    const config = tickersConfig();
    expect(JSON.parse(JSON.stringify(config))).toEqual(config);
  });
});

describe("the board's rows, against TradingView", () => {
  test("shows the metals and the index by the symbols the board agrees with", () => {
    expect(TICKER_SYMBOLS.map((symbol) => symbol.proName)).toEqual([
      "OANDA:XAUUSD",
      "OANDA:XAGUSD",
      "PEPPERSTONE:USDX",
    ]);
  });

  test("names each row's TradingView ticker under its unit", () => {
    expect(rowCaption("per ounce", BOARD_TICKERS.gold, null)).toBe("per ounce · XAUUSD");
  });

  test("does not say the dollar index's ticker twice", () => {
    expect(rowCaption("DXY", BOARD_TICKERS.dollarIndex, null)).toBe("DXY");
  });

  test("owns up to a delayed figure", () => {
    expect(rowCaption("WTI, per barrel", BOARD_TICKERS.crude, 10)).toBe(
      "WTI, per barrel · CL1! · 10 min behind",
    );
  });
});

describe("how far behind a quote is", () => {
  const fetched = "2026-11-17T18:02:00Z";

  test("is not mentioned for a live quote", () => {
    expect(minutesBehind("2026-11-17T18:01:30Z", fetched)).toBeNull();
  });

  test("is the delay, in minutes, for a delayed feed", () => {
    // Yahoo's crude, stamped 17:52 on a board fetched at 18:02.
    expect(minutesBehind("2026-11-17T17:52:26Z", fetched)).toBe(10);
  });

  test("is not mentioned for a market that is shut", () => {
    expect(minutesBehind("2026-11-14T22:00:00Z", fetched)).toBeNull();
  });

  test("is not mentioned when a time cannot be read", () => {
    expect(minutesBehind("whenever", fetched)).toBeNull();
  });

  test("is not mentioned for a quote stamped after the fetch", () => {
    // The live bitcoin is stamped as it arrives, after the board was fetched.
    expect(minutesBehind("2026-11-17T18:02:04Z", fetched)).toBeNull();
  });
});
