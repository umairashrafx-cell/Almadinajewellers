import { describe, expect, test } from "vitest";

import { nextTick } from "./ticks";
import type { Tick } from "./ticks";

/**
 * The international board's up-and-down arrows, as arithmetic.
 *
 * The rule under test is that an arrow is only ever raised by a figure that
 * visibly changed, and only ever points the way the source moved.
 */

/** Runs a sequence of (usd, shown) frames through nextTick, as a board would. */
function run(frames: Array<[number, string]>): Tick {
  let tick: Tick | undefined;
  for (const [usd, shown] of frames) tick = nextTick(tick, usd, shown);
  if (!tick) throw new Error("no frames");
  return tick;
}

describe("the arrow beside a price", () => {
  test("is absent on the first figure, which has nothing to be compared with", () => {
    const tick = nextTick(undefined, 91234.5, "$91,235");
    expect(tick.direction).toBeUndefined();
    expect(tick.seq).toBe(0);
  });

  test("points up when the printed figure rises", () => {
    const tick = run([
      [91234.5, "$91,235"],
      [91240.1, "$91,240"],
    ]);
    expect(tick.direction).toBe("up");
    expect(tick.seq).toBe(1);
  });

  test("points down when the printed figure falls", () => {
    const tick = run([
      [4012.4, "$4,012"],
      [4009.9, "$4,010"],
    ]);
    expect(tick.direction).toBe("down");
    expect(tick.seq).toBe(1);
  });

  test("counts every move, so two rises in a row both flash", () => {
    const tick = run([
      [100, "$100"],
      [101, "$101"],
      [102, "$102"],
    ]);
    expect(tick.direction).toBe("up");
    expect(tick.seq).toBe(2);
  });

  test("does not move for a change too small to show", () => {
    // Forty cents on a bitcoin still prints the same to the dollar. An arrow
    // flashing over unchanged digits would be the board inventing a move.
    const first = nextTick(undefined, 91234.6, "$91,235");
    const quiet = nextTick(first, 91235.0, "$91,235");
    expect(quiet).toBe(first);
  });

  test("measures the next move from the last printed change, not the last frame", () => {
    // Creeps up by cents without the print moving, then crosses a dollar.
    const tick = run([
      [100.2, "$100"],
      [100.4, "$100"],
      [100.6, "$101"],
    ]);
    expect(tick.direction).toBe("up");
    expect(tick.usd).toBe(100.6);
  });

  test("holds still when the units are switched and the world has not moved", () => {
    const moved = run([
      [4000, "$4,000"],
      [4010, "$4,010"],
    ]);
    const switched = nextTick(moved, 4010, "Rs. 1,309,000");
    expect(switched.direction).toBe("up");
    expect(switched.seq).toBe(moved.seq);
    expect(switched.shown).toBe("Rs. 1,309,000");
  });

  test("ticks again after a unit switch once the source moves", () => {
    const switched = run([
      [4000, "$4,000"],
      [4000, "Rs. 1,305,000"],
      [3995, "Rs. 1,303,400"],
    ]);
    expect(switched.direction).toBe("down");
    expect(switched.seq).toBe(1);
  });

  test("is the same answer when asked twice about the same figure", () => {
    // React may render twice; the second asking must not count a second move.
    const first = run([
      [10, "$10"],
      [11, "$11"],
    ]);
    expect(nextTick(first, 11, "$11")).toBe(first);
  });
});
