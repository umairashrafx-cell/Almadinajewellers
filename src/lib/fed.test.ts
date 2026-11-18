import { describe, expect, test } from "vitest";

import {
  FOMC_MEETINGS,
  formatRange,
  meetingOdds,
  nextMeeting,
  wholePercents,
  type FedSnapshot,
  type FomcMeeting,
} from "@/lib/fed";

const NOW = new Date("2026-11-18T12:00:00Z");
const TRADED = "2026-11-18T11:00:00Z";

const DECEMBER = FOMC_MEETINGS.find((meeting) => meeting.end === "2026-12-09") as FomcMeeting;

function snapshot(prices: Record<string, number>, extra: Partial<FedSnapshot> = {}): FedSnapshot {
  return {
    target: { from: 3.75, to: 4.0, effr: 3.88, day: "2026-11-17" },
    futures: Object.entries(prices).map(([month, price]) => ({ month, price, at: TRADED })),
    ...extra,
  };
}

describe("the FOMC calendar", () => {
  test("is in order and every statement is at 2 PM on the last day", () => {
    FOMC_MEETINGS.forEach((meeting, i) => {
      expect(meeting.statementAt.slice(0, 10)).toBe(meeting.end);
      expect(meeting.statementAt.slice(11, 16)).toBe("14:00");
      expect(meeting.start < meeting.end).toBe(true);
      const before = FOMC_MEETINGS[i - 1];
      if (before) expect(before.end < meeting.start).toBe(true);
    });
  });

  test("uses Washington's offset on the day", () => {
    // Daylight time runs from the second Sunday of March to the first of November.
    const offset = (end: string) => FOMC_MEETINGS.find((m) => m.end === end)?.statementAt.slice(19);
    expect(offset("2026-01-28")).toBe("-05:00");
    expect(offset("2026-03-18")).toBe("-04:00");
    expect(offset("2026-10-28")).toBe("-04:00");
    expect(offset("2026-12-09")).toBe("-05:00");
    expect(offset("2027-11-17")).toBe("-05:00");
  });

  test("finds the next meeting, and keeps it until the statement is out", () => {
    expect(nextMeeting(NOW)?.end).toBe("2026-12-09");
    expect(nextMeeting(new Date("2026-12-09T18:59:00Z"))?.end).toBe("2026-12-09");
    expect(nextMeeting(new Date("2026-12-09T19:00:00Z"))?.end).toBe("2027-01-27");
  });

  test("shows no meeting once the published list runs out", () => {
    expect(nextMeeting(new Date("2028-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("meetingOdds", () => {
  test("works forward from a quiet month before the meeting, the way CME does", () => {
    // November has no meeting and averages 3.88. December averages 4.07; its
    // first nine days are at the old rate, so the last twenty-two average
    // (4.07 × 31 − 3.88 × 9) / 22 = 4.1477 — a move of 0.268, a quarter-point
    // hike for certain and a 7% chance of half a point.
    const odds = meetingOdds(DECEMBER, snapshot({ "2026-11": 96.12, "2026-12": 95.93 }), NOW);

    expect(odds).not.toBeNull();
    expect(odds?.hike).toBeCloseTo(1, 6);
    expect(odds?.hold).toBe(0);
    expect(odds?.cut).toBe(0);
    expect(odds?.outcomes.map((o) => [o.bp, o.from, o.to])).toEqual([
      [25, 4.0, 4.25],
      [50, 4.25, 4.5],
    ]);
    expect(odds?.outcomes[1]?.probability).toBeCloseTo(0.0709, 3);
    expect(odds?.expectedAfter).toBeCloseTo(4.1477, 3);
  });

  test("splits a partly priced cut between hold and cut", () => {
    // December pricing 3.80: the end is (3.80 × 31 − 3.88 × 9) / 22 = 3.7673,
    // a move of −0.1127, which is 45% of a quarter-point cut.
    const odds = meetingOdds(DECEMBER, snapshot({ "2026-11": 96.12, "2026-12": 96.2 }), NOW);
    expect(odds?.cut).toBeCloseTo(0.4509, 3);
    expect(odds?.hold).toBeCloseTo(0.5491, 3);
    expect(odds?.hike).toBe(0);
    expect(odds?.outcomes[0]).toMatchObject({ bp: 0, from: 3.75, to: 4.0 });
    expect(odds?.outcomes[1]).toMatchObject({ bp: -25, from: 3.5, to: 3.75 });
  });

  test("works backward from a quiet month after, when the month before had a meeting", () => {
    // July 2026's meeting ends on the 29th. June had a meeting, August does
    // not, so the end comes from August and the start is solved for.
    const july = FOMC_MEETINGS.find((m) => m.end === "2026-07-29") as FomcMeeting;
    const now = new Date("2026-07-01T12:00:00Z");
    const fed: FedSnapshot = {
      target: { from: 4.0, to: 4.25 },
      futures: [
        { month: "2026-06", price: 95.87, at: "2026-07-01T11:00:00Z" },
        { month: "2026-07", price: 95.87, at: "2026-07-01T11:00:00Z" },
        { month: "2026-08", price: 95.87, at: "2026-07-01T11:00:00Z" },
      ],
    };
    const odds = meetingOdds(july, fed, now);
    expect(odds?.hold).toBeCloseTo(1, 6);
  });

  test("uses today's effective rate for a meeting later this month", () => {
    // 2 December: November's contract has gone, December's is trading, and
    // the rate in force today is the rate until the decision.
    const now = new Date("2026-12-02T12:00:00Z");
    const fed: FedSnapshot = {
      target: { from: 3.75, to: 4.0, effr: 3.88 },
      futures: [{ month: "2026-12", price: 96.12, at: "2026-12-02T11:00:00Z" }],
    };
    expect(meetingOdds(DECEMBER, fed, now)?.hold).toBeCloseTo(1, 6);
  });

  test("gives no odds from prices that are missing, stale or absurd", () => {
    expect(meetingOdds(DECEMBER, snapshot({ "2026-11": 96.12 }), NOW)).toBeNull();
    expect(meetingOdds(DECEMBER, snapshot({ "2026-12": 95.93 }), NOW)).toBeNull();
    expect(
      meetingOdds(
        DECEMBER,
        {
          target: { from: 3.75, to: 4.0 },
          futures: [
            { month: "2026-11", price: 96.12, at: "2026-11-10T00:00:00Z" },
            { month: "2026-12", price: 95.93, at: "2026-11-10T00:00:00Z" },
          ],
        },
        NOW,
      ),
    ).toBeNull();
    // A December price implying a two-point hike is a bad tick, not a view.
    expect(meetingOdds(DECEMBER, snapshot({ "2026-11": 96.12, "2026-12": 94.5 }), NOW)).toBeNull();
    expect(meetingOdds(DECEMBER, snapshot({ "2026-11": 0, "2026-12": 95.93 }), NOW)).toBeNull();
  });

  test("gives no odds without the target range to say what a hold is", () => {
    expect(
      meetingOdds(
        DECEMBER,
        { futures: snapshot({ "2026-11": 96.12, "2026-12": 95.93 }).futures },
        NOW,
      ),
    ).toBeNull();
  });
});

describe("wholePercents", () => {
  test("always adds up to a hundred", () => {
    expect(wholePercents([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(wholePercents([0.929, 0.071, 0])).toEqual([93, 7, 0]);
    expect(wholePercents([0, 1, 0])).toEqual([0, 100, 0]);
  });

  test("gives zeros for nothing", () => {
    expect(wholePercents([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe("formatRange", () => {
  test("states a target range to the hundredth", () => {
    expect(formatRange(3.75, 4)).toBe("3.75–4.00%");
  });
});
