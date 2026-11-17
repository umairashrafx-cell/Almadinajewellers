import { describe, expect, test } from "vitest";

import { TICKERS_SCRIPT, TICKER_SYMBOLS, tickersConfig } from "./tradingview";

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

  test("carries the board's five instruments, in the board's order", () => {
    expect(TICKER_SYMBOLS.map((symbol) => symbol.title)).toEqual([
      "Gold",
      "Silver",
      "Dollar index",
      "Bitcoin",
      "Crude oil",
    ]);
  });

  test("does not ask for TradingView's own dollar index, which widgets cannot show", () => {
    expect(TICKER_SYMBOLS.map((symbol) => symbol.proName)).not.toContain("TVC:DXY");
  });

  test("is drawn dark on a dark app and light on a light one", () => {
    expect(tickersConfig(true).colorTheme).toBe("dark");
    expect(tickersConfig(false).colorTheme).toBe("light");
  });

  test("is transparent, so it sits on the app's own card in either theme", () => {
    expect(tickersConfig(false).isTransparent).toBe(true);
  });

  test("survives being written into a script tag as JSON", () => {
    const config = tickersConfig(false);
    expect(JSON.parse(JSON.stringify(config))).toEqual(config);
  });
});
