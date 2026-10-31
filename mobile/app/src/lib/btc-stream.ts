import { useEffect, useState } from "react";

/**
 * Bitcoin, once a second, straight from the exchange.
 *
 * The other four instruments on the board cannot move faster than their
 * sources do — gold and the dollar index are quoted about once a minute on a
 * free endpoint, and asking sixty times for the same figure is how a free
 * endpoint stops answering. Bitcoin is the exception: Binance publishes a
 * ticker stream that pushes the last price and the day's move every thousand
 * milliseconds, over a public websocket, with no key and no account. One
 * socket, no polling, no rate limit to run into.
 *
 * It is quoted in USDT rather than dollars, which is the pair the volume is
 * actually in. The two sit within a fraction of a per cent of each other, and
 * the board says "indicative" over the whole block for exactly this class of
 * reason.
 *
 * Everything about it is optional. If the socket will not open — a network
 * that blocks it, an exchange that is down, a country that does not allow it —
 * this returns nothing and the board falls back to the figure the server
 * fetched, which is never worse than what it had before.
 */

const STREAM = "wss://stream.binance.com:9443/ws/btcusdt@ticker";

/** Long enough that a dead socket is noticed, short enough not to nag. */
const RETRY_MS = 20000;

export type LiveQuote = { usd: number; changePercent?: number };

export function useLiveBitcoin(): LiveQuote | undefined {
  const [quote, setQuote] = useState<LiveQuote>();

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const open = () => {
      if (stopped) return;

      try {
        socket = new WebSocket(STREAM);
      } catch {
        // Some WebViews throw on construction rather than firing onerror.
        return;
      }

      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(String(event.data)) as { c?: string; P?: string };
          const price = Number(frame.c);
          if (!Number.isFinite(price)) return;

          const move = Number(frame.P);
          setQuote({ usd: price, changePercent: Number.isFinite(move) ? move : undefined });
        } catch {
          // A frame we cannot read is not worth a thought; the next one is a
          // second away.
        }
      };

      socket.onclose = () => {
        if (!stopped) retry = setTimeout(open, RETRY_MS);
      };

      socket.onerror = () => {
        // onclose follows, which is where the retry lives.
        socket?.close();
      };
    };

    /*
     * Nothing streams while the app is in somebody's pocket. A websocket held
     * open behind a locked screen is battery spent on a number nobody is
     * reading, and Android may well kill it anyway.
     */
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!socket || socket.readyState > WebSocket.OPEN) open();
      } else {
        socket?.close();
        socket = undefined;
        if (retry) clearTimeout(retry);
      }
    };

    open();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (retry) clearTimeout(retry);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  return quote;
}
