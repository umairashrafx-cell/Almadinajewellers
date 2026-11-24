import { describe, expect, test } from "vitest";

import { AYAT, ayatForDay, ayatToday, reference, URDU_TRANSLATOR } from "./ayat";

describe("which verse belongs to a day", () => {
  test("gives the same verse however often it is asked", () => {
    // The reason the date is the input and not a stored pick. A home screen
    // re-renders whenever the rate snapshot or the catalogue arrives, and the
    // verse must not change underneath somebody who is reading it.
    const once = ayatForDay("2026-11-24");
    const again = ayatForDay("2026-11-24");
    const third = ayatForDay("2026-11-24");
    expect(once).toBe(again);
    expect(again).toBe(third);
  });

  test("moves on by one the next day", () => {
    const first = AYAT.indexOf(ayatForDay("2026-03-02")!);
    const second = AYAT.indexOf(ayatForDay("2026-03-03")!);
    expect(second).toBe(first + 1);
  });

  test("starts at the top of the set on the epoch", () => {
    expect(ayatForDay("2026-01-01")).toBe(AYAT[0]);
    expect(ayatForDay("2026-01-02")).toBe(AYAT[1]);
  });

  test("goes back to the beginning when the set runs out", () => {
    // 26 verses from 1 January, so 27 January is the first verse again. The
    // shop was told the set repeats; this is where that is true or not.
    expect(ayatForDay("2026-01-27")).toBe(AYAT[0]);
    expect(ayatForDay("2026-01-28")).toBe(AYAT[1]);
  });

  test("keeps cycling a year out", () => {
    // 2026 has 365 days, and 365 = 14 * 26 + 1, so 1 January 2027 is the
    // second verse rather than the first. Nothing special is meant to happen
    // at a year boundary — the count just keeps going.
    expect(ayatForDay("2027-01-01")).toBe(AYAT[1]);
  });

  test("still gives a verse for a day before the epoch", () => {
    // A phone whose clock is wrong, or set back deliberately. A truncating
    // remainder would index off the front of the array and show nothing.
    for (const day of ["2025-12-31", "2025-01-01", "2019-06-15"]) {
      expect(AYAT).toContain(ayatForDay(day));
    }
  });

  test("never indexes outside the set, over four years of days", () => {
    const start = Date.parse("2026-01-01T00:00:00Z");
    for (let i = 0; i < 1461; i += 1) {
      const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      expect(AYAT).toContain(ayatForDay(day));
    }
  });

  test("gives nothing for something that is not a day", () => {
    // pktDay returns "" for anything it cannot read, and daysBetween turns
    // that into NaN. Rather than letting NaN land on verse zero, the card
    // renders nothing at all.
    for (const nonsense of ["", "today", "2026-13-45x", "24/11/2026"]) {
      expect(ayatForDay(nonsense)).toBeNull();
    }
  });
});

describe("today, by the clock in Pakistan", () => {
  test("turns the verse over at midnight in Mandi Bahauddin, not in London", () => {
    // Pakistan is UTC+5. At 19:30 UTC it is already half past midnight there,
    // so these two instants are different days to the shop even though they
    // are the same UTC day.
    const beforePkMidnight = new Date("2026-11-24T18:30:00Z");
    const afterPkMidnight = new Date("2026-11-24T19:30:00Z");

    expect(ayatToday(beforePkMidnight)).toBe(ayatForDay("2026-11-24"));
    expect(ayatToday(afterPkMidnight)).toBe(ayatForDay("2026-11-25"));
  });

  test("does not turn over at midnight UTC", () => {
    // 23:30 and 00:30 UTC straddle the UTC day but are both the afternoon and
    // the small hours of the same Pakistani day... specifically 04:30 and
    // 05:30 PKT on the 25th.
    const before = new Date("2026-11-24T23:30:00Z");
    const after = new Date("2026-11-25T00:30:00Z");
    expect(ayatToday(before)).toBe(ayatToday(after));
    expect(ayatToday(before)).toBe(ayatForDay("2026-11-25"));
  });
});

describe("the set itself", () => {
  test("holds the 26 verses that were reviewed", () => {
    // A guard on the count rather than on the contents. Adding a verse is a
    // verification job (bun run check:ayat), and this failing is the reminder
    // that docs/daily-ayat.md and the owner's approval have to catch up.
    expect(AYAT).toHaveLength(26);
  });

  test("names no verse twice", () => {
    const seen = AYAT.map((a) => `${a.surah}:${a.ayah}`);
    expect(new Set(seen).size).toBe(seen.length);
  });

  test("carries a real reference on every verse", () => {
    for (const ayat of AYAT) {
      expect(ayat.surah).toBeGreaterThanOrEqual(1);
      expect(ayat.surah).toBeLessThanOrEqual(114);
      expect(ayat.ayah).toBeGreaterThanOrEqual(1);
      expect(ayat.surahName).not.toBe("");
      expect(ayat.surahArabic).not.toBe("");
    }
  });

  test("carries Arabic in Arabic and Urdu in Urdu", () => {
    // Cheap, but it is the check that would have caught the two columns being
    // swapped, or a cell left empty by a bad paste. Urdu uses letters Arabic
    // does not — ہ (U+06C1), ی (U+06CC), ے (U+06D2), ک (U+06A9) — and every
    // one of these translations contains at least one of them.
    const urduOnly = /[ہیےکھۓ]/;
    for (const ayat of AYAT) {
      expect(ayat.arabic.length).toBeGreaterThan(10);
      expect(ayat.urdu.length).toBeGreaterThan(10);
      expect(ayat.arabic).toMatch(/[؀-ۿ]/);
      expect(ayat.urdu).toMatch(urduOnly);
      // The Arabic column must not be Urdu prose that slid one field across.
      expect(urduOnly.test(ayat.arabic)).toBe(false);
    }
  });

  test("keeps every verse short enough for the card", () => {
    // The card sits between the shopfront photograph and today's rate, and the
    // rate must not be pushed off a small screen by a long verse. 200 Urdu
    // characters was the cap the set was chosen against; verses longer than
    // that were left out rather than truncated, because a truncated ayat is
    // not an ayat.
    for (const ayat of AYAT) {
      expect(ayat.urdu.length).toBeLessThanOrEqual(200);
      expect(ayat.arabic.length).toBeLessThanOrEqual(220);
    }
  });

  test("carries no stray markup or whitespace from the source files", () => {
    for (const ayat of AYAT) {
      for (const text of [ayat.arabic, ayat.urdu]) {
        expect(text).toBe(text.trim());
        expect(text).not.toMatch(/\s\s/);
        expect(text).not.toMatch(/[<>|]/);
      }
    }
  });
});

describe("the citation line", () => {
  test("reads the way somebody would look it up", () => {
    expect(reference({ ...AYAT[0]!, surahName: "Ar-Rahman", surah: 55, ayah: 9 })).toBe(
      "Surah Ar-Rahman 55:9",
    );
  });

  test("names the translation", () => {
    // The whole point of printing it: a reader can hold this against the copy
    // in his own house. An empty or changed name is a silent loss.
    expect(URDU_TRANSLATOR).toBe("Fateh Muhammad Jalandhri");
  });
});
