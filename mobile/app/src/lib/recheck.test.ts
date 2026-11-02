import { describe, expect, test } from "vitest";

import { RECHECK_AFTER_MS, shouldRecheck } from "./recheck";

const NOW = Date.parse("2026-11-02T13:00:00Z");

describe("asking again when the app comes back", () => {
  test("asks when nothing has ever arrived", () => {
    // First launch with no signal, then a signal. Nothing is being protected
    // by waiting.
    expect(shouldRecheck(undefined, NOW)).toBe(true);
  });

  test("does not ask for what just arrived", () => {
    // Out to a WhatsApp message and straight back in. The figures on screen
    // are seconds old; a request here is spent for nothing.
    expect(shouldRecheck(NOW - 2_000, NOW)).toBe(false);
    expect(shouldRecheck(NOW, NOW)).toBe(false);
  });

  test("asks for this morning's board in the evening", () => {
    // The case the whole thing exists for: opened at nine, picked up at six,
    // and the shop has published since.
    expect(shouldRecheck(NOW - 9 * 60 * 60 * 1000, NOW)).toBe(true);
  });

  test("asks the moment the interval is up, not after it", () => {
    expect(shouldRecheck(NOW - RECHECK_AFTER_MS, NOW)).toBe(true);
    expect(shouldRecheck(NOW - RECHECK_AFTER_MS + 1, NOW)).toBe(false);
  });

  test("asks when the phone's clock has moved backwards", () => {
    // A phone correcting itself, or a border crossed. A stamp in the future
    // would otherwise read as fresher than now for as long as the gap lasts,
    // and the board would stop being checked at all.
    expect(shouldRecheck(NOW + 60 * 60 * 1000, NOW)).toBe(true);
  });

  test("waits as long as it is told to", () => {
    expect(shouldRecheck(NOW - 5_000, NOW, 10_000)).toBe(false);
    expect(shouldRecheck(NOW - 15_000, NOW, 10_000)).toBe(true);
  });

  test("leaves a minute between asks", () => {
    expect(RECHECK_AFTER_MS).toBe(60_000);
  });
});
