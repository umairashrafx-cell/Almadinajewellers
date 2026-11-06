import { describe, expect, it } from "vitest";

import { agoPhrase, keptNote } from "./kept";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NOW = 1_800_000_000_000;

describe("agoPhrase", () => {
  it("says nothing precise about the last minute", () => {
    expect(agoPhrase(NOW, NOW)).toBe("just now");
    expect(agoPhrase(NOW - 59_000, NOW)).toBe("just now");
  });

  it("counts whole minutes up to the hour", () => {
    expect(agoPhrase(NOW - MINUTE, NOW)).toBe("1 minute ago");
    expect(agoPhrase(NOW - 12 * MINUTE, NOW)).toBe("12 minutes ago");
    expect(agoPhrase(NOW - 59 * MINUTE, NOW)).toBe("59 minutes ago");
  });

  it("counts whole hours up to the day", () => {
    expect(agoPhrase(NOW - HOUR, NOW)).toBe("1 hour ago");
    expect(agoPhrase(NOW - 23 * HOUR, NOW)).toBe("23 hours ago");
  });

  it("calls the first day yesterday and counts afterwards", () => {
    expect(agoPhrase(NOW - DAY, NOW)).toBe("yesterday");
    expect(agoPhrase(NOW - 2 * DAY, NOW)).toBe("2 days ago");
    expect(agoPhrase(NOW - 9 * DAY, NOW)).toBe("9 days ago");
  });

  it("rounds down, so it never claims figures are fresher than they are", () => {
    // A hair under two hours is "1 hour ago", not "2 hours ago".
    expect(agoPhrase(NOW - (2 * HOUR - 1), NOW)).toBe("1 hour ago");
  });

  it("treats a stamp from the future as now rather than as a negative age", () => {
    // A phone whose clock has just been corrected backwards.
    expect(agoPhrase(NOW + 5 * HOUR, NOW)).toBe("just now");
  });

  it("survives a stamp that is not a number", () => {
    expect(agoPhrase(Number.NaN, NOW)).toBe("just now");
  });
});

describe("keptNote", () => {
  it("carries the age when there is one", () => {
    expect(keptNote(NOW - 2 * DAY, NOW)).toBe("Kept on this phone, from 2 days ago.");
  });

  it("says the shorter true thing when the cache predates the stamp", () => {
    expect(keptNote(undefined, NOW)).toBe("Kept on this phone.");
  });
});
