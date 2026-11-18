import { describe, expect, test } from "vitest";

import { DEFAULTS, STARTS, readSettings, startBoard, startView, wantsDark } from "./settings";

/**
 * What the app does with whatever it finds in storage.
 *
 * The store itself is a few lines around localStorage and a class on the root
 * element. The part that can be got wrong is reading back something this build
 * did not write — an older build's, a newer one's, or nothing.
 */
describe("settings read back from the phone", () => {
  test("are the defaults when nothing was ever stored", () => {
    expect(readSettings(null)).toEqual(DEFAULTS);
    expect(readSettings(undefined)).toEqual(DEFAULTS);
    expect(readSettings("")).toEqual(DEFAULTS);
  });

  test("are light, in rupees and opening on home by default", () => {
    // An update must not turn the app dark for people who never asked, the
    // shop prices in rupees, and the app opened on home before it could choose.
    expect(DEFAULTS).toEqual({ theme: "light", currency: "PKR", start: "home" });
  });

  test("keep every one of the ten currencies", () => {
    for (const currency of ["USD", "GBP", "EUR", "AED", "SAR", "QAR", "KWD", "OMR", "CAD", "AUD"]) {
      expect(readSettings(JSON.stringify({ theme: "light", currency })).currency).toBe(currency);
    }
  });

  test("are what was stored", () => {
    expect(readSettings('{"theme":"dark","currency":"USD","start":"rate-local"}')).toEqual({
      theme: "dark",
      currency: "USD",
      start: "rate-local",
    });
    expect(readSettings('{"theme":"phone","currency":"PKR"}')).toEqual({
      theme: "phone",
      currency: "PKR",
      start: "home",
    });
  });

  test("fall back field by field, not all at once", () => {
    // A theme this build has never heard of costs somebody their theme. It
    // must not also cost them their currency.
    expect(readSettings('{"theme":"sepia","currency":"USD"}')).toEqual({
      theme: "light",
      currency: "USD",
      start: "home",
    });
    expect(readSettings('{"theme":"dark","currency":"JPY"}')).toEqual({
      theme: "dark",
      currency: "PKR",
      start: "home",
    });
    expect(readSettings('{"theme":"dark"}')).toEqual({
      theme: "dark",
      currency: "PKR",
      start: "home",
    });
    // A start screen this build has never heard of opens on home.
    expect(readSettings('{"theme":"dark","start":"offers"}').start).toBe("home");
  });

  test("are the defaults for anything that is not a settings object", () => {
    for (const junk of ["{", "null", "7", '"dark"', "[]", '{"theme":2,"currency":{}}']) {
      expect(readSettings(junk)).toEqual(DEFAULTS);
    }
  });
});

describe("whether the screens are drawn dark", () => {
  test("follows the choice when the choice is fixed", () => {
    expect(wantsDark("light", true)).toBe(false);
    expect(wantsDark("light", false)).toBe(false);
    expect(wantsDark("dark", true)).toBe(true);
    expect(wantsDark("dark", false)).toBe(true);
  });

  test("follows the phone only when asked to", () => {
    expect(wantsDark("phone", true)).toBe(true);
    expect(wantsDark("phone", false)).toBe(false);
  });
});

describe("the screen the app opens on", () => {
  test("keeps each of the three choices", () => {
    for (const start of STARTS) {
      expect(readSettings(JSON.stringify({ start })).start).toBe(start);
    }
  });

  test("is home, or the rate screen for either board", () => {
    expect(startView("home")).toBe("home");
    expect(startView("rate-local")).toBe("rate");
    expect(startView("rate-international")).toBe("rate");
  });

  test("opens the rate screen on the board that was chosen", () => {
    expect(startBoard("rate-international")).toBe("international");
    expect(startBoard("rate-local")).toBe("local");
    // Home says nothing about boards, so the rate screen keeps the shop's own.
    expect(startBoard("home")).toBe("local");
  });
});
