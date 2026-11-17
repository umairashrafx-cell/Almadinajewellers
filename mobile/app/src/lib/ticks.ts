import { useRef } from "react";

/**
 * Which way a figure on the international board last moved.
 *
 * A ticker's arrow is a promise that the number beside it has just changed, so
 * it is only ever raised by a change somebody can see. Bitcoin's figure is
 * pushed once a second by the exchange and earns an arrow most seconds; the
 * metals, the dollar index and crude are re-read every fifteen seconds and
 * earn one only when their source has actually published something new. No
 * figure is ever nudged to keep an arrow busy.
 *
 * Two values travel together because they answer different questions. `shown`
 * is the figure as printed, and decides WHETHER there was a tick: a bitcoin
 * that moved forty cents still reads the same to the dollar, and an arrow
 * flashing over unchanged digits looks like the board making things up. `usd`
 * is the figure as the source sent it, and decides WHICH WAY: switching the
 * metals from dollars to rupees changes every printed figure without the
 * world having moved at all, and that must not read as a tick either.
 */

export type Direction = "up" | "down";

export type Tick = {
  /** The source's figure at the last printed change. */
  usd: number;
  /** The figure as it was printed then. */
  shown: string;
  /** Which way the last real move went. Absent until there has been one. */
  direction?: Direction;
  /**
   * Counts the moves. Used as a React key so the flash restarts on every
   * tick, including two rises in a row, which a class alone would not do.
   */
  seq: number;
};

/**
 * The tick after this one, given what is about to be printed.
 *
 * Returns the same object when nothing changed, so a caller can tell a quiet
 * second from a moving one by identity.
 */
export function nextTick(previous: Tick | undefined, usd: number, shown: string): Tick {
  if (!previous || !Number.isFinite(previous.usd)) return { usd, shown, seq: 0 };
  if (shown === previous.shown) return previous;

  /*
   * The print changed but the source did not: the units were switched. The
   * new print becomes the baseline and the arrow stays as it was, because the
   * last real move is still the last real move.
   */
  if (usd === previous.usd || !Number.isFinite(usd)) return { ...previous, shown };

  return {
    usd,
    shown,
    direction: usd > previous.usd ? "up" : "down",
    seq: previous.seq + 1,
  };
}

/**
 * The tick for every row on the board, kept across renders.
 *
 * Worked out during render rather than in an effect, so the arrow and the new
 * figure arrive in the same frame instead of the arrow following a frame late.
 * nextTick is idempotent for a figure it has already seen, which is what makes
 * that safe under a render React runs twice.
 */
export function useTicks<K extends string>(
  rows: ReadonlyArray<{ key: K; usd: number; shown: string }>,
): Partial<Record<K, Tick>> {
  const kept = useRef<Partial<Record<K, Tick>>>({});
  const next: Partial<Record<K, Tick>> = {};
  for (const row of rows) next[row.key] = nextTick(kept.current[row.key], row.usd, row.shown);
  // A row that dropped off the board starts afresh when it comes back, rather
  // than flashing against a figure from however long ago it went missing.
  kept.current = next;
  return next;
}
