import { describe, expect, test } from "vitest";

import { soldOn, toNumber } from "@/lib/admin";

/**
 * The day a piece sold.
 *
 * The shop closes late. A sale rung up at nine in the evening in Mandi
 * Bahauddin is already the next day in UTC, because Pakistan is five hours
 * ahead — so a date rendered in the browser's or the server's own zone reads a
 * day late every evening, and the panel would disagree with the shop about
 * when its own stock went out. Pinning the zone is the whole point of the
 * function, so that is what is tested.
 */
describe("soldOn", () => {
  test("reads a late Pakistani evening as that day, not the next", () => {
    // 15 November, 9pm in Mandi Bahauddin — already the 15th at 16:00 UTC.
    expect(soldOn("2026-11-15T16:00:00Z")).toBe("15 November 2026");
  });

  test("does not roll a late sale into tomorrow", () => {
    // 11:30pm in Pakistan on the 15th, which is 18:30 UTC on the 15th.
    expect(soldOn("2026-11-15T18:30:00Z")).toBe("15 November 2026");
  });

  test("a sale just after midnight belongs to the new day", () => {
    // 00:30 on the 16th in Pakistan is 19:30 UTC on the 15th — the trap a
    // naive formatter falls into, reporting the 15th.
    expect(soldOn("2026-11-15T19:30:00Z")).toBe("16 November 2026");
  });

  test("writes the month out, the way the shop would say it", () => {
    expect(soldOn("2026-03-01T08:00:00Z")).toBe("1 March 2026");
  });
});

/**
 * Blank number fields.
 *
 * Every numeric field in the admin forms is read through toNumber, and an
 * untouched number input hands back "", not 0. A blank making-charge silently
 * becoming zero would under-price a piece, so blank has to stay undefined.
 */
describe("toNumber", () => {
  test("a blank field is undefined, not zero", () => {
    expect(toNumber("")).toBeUndefined();
    expect(toNumber(null)).toBeUndefined();
    expect(toNumber(undefined)).toBeUndefined();
  });

  test("a real zero survives", () => {
    expect(toNumber("0")).toBe(0);
    expect(toNumber(0)).toBe(0);
  });

  test("something unparseable is undefined rather than NaN", () => {
    expect(toNumber("abc")).toBeUndefined();
  });

  test("ordinary figures come through", () => {
    expect(toNumber("411000")).toBe(411000);
    expect(toNumber("11.664")).toBe(11.664);
  });
});
