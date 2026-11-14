import { describe, expect, test } from "vitest";

import { DEFAULTS, readSettings, wantsDark } from "./settings";

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

  test("are light and in rupees by default", () => {
    // An update must not turn the app dark for people who never asked, and
    // the shop prices in rupees.
    expect(DEFAULTS).toEqual({ theme: "light", currency: "PKR" });
  });

  test("keep every one of the ten currencies", () => {
    for (const currency of ["USD", "GBP", "EUR", "AED", "SAR", "QAR", "KWD", "OMR", "CAD", "AUD"]) {
      expect(readSettings(JSON.stringify({ theme: "light", currency })).currency).toBe(currency);
    }
  });

  test("are what was stored", () => {
    expect(readSettings('{"theme":"dark","currency":"USD"}')).toEqual({
      theme: "dark",
      currency: "USD",
    });
    expect(readSettings('{"theme":"phone","currency":"PKR"}')).toEqual({
      theme: "phone",
      currency: "PKR",
    });
  });

  test("fall back field by field, not all at once", () => {
    // A theme this build has never heard of costs somebody their theme. It
    // must not also cost them their currency.
    expect(readSettings('{"theme":"sepia","currency":"USD"}')).toEqual({
      theme: "light",
      currency: "USD",
    });
    expect(readSettings('{"theme":"dark","currency":"JPY"}')).toEqual({
      theme: "dark",
      currency: "PKR",
    });
    expect(readSettings('{"theme":"dark"}')).toEqual({ theme: "dark", currency: "PKR" });
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
