/**
 * The American interest rate, and what the market expects the Fed to do next.
 *
 * Three sources, each the most direct one there is for its figure:
 *
 *  - The target range and the effective rate come from the New York Fed's own
 *    public API, the body that publishes the effective rate every morning.
 *  - The meeting dates are the Federal Reserve's published FOMC calendar,
 *    written down below. They are announced a year and more ahead, and they
 *    are dates, not rates: when the list runs out the screen shows no meeting
 *    rather than a guessed one.
 *  - The odds are worked out from CBOT 30-Day Fed Funds futures, the same
 *    contracts and the same arithmetic CME's FedWatch tool uses. CME publishes
 *    the method but not a free feed, so the prices are read here and the sums
 *    are done here. A futures price is the market's bet on the average rate
 *    for a month; comparing the month before a meeting with the month of it
 *    says how large a move the market has paid for.
 *
 * Nothing here is the shop's opinion and nothing here is advice.
 */

/** As the market-rates function publishes it. */
export type FedTarget = {
  /** Lower bound of the federal funds target range, per cent. */
  from: number;
  /** Upper bound, per cent. */
  to: number;
  /** The effective federal funds rate on `day`, per cent. */
  effr?: number;
  /** The business day the effective rate is for, "2026-11-17". */
  day?: string;
};

/** One month's 30-Day Fed Funds futures contract, as last traded. */
export type FedFuture = {
  /** The contract month, "2026-12". */
  month: string;
  /** The price, which is 100 less the average rate the market expects. */
  price: number;
  /** When it last traded, ISO. */
  at: string;
};

export type FedSnapshot = {
  target?: FedTarget;
  futures: FedFuture[];
  /** When the server last collected these, ISO. */
  fetchedAt?: string;
};

/* --------------------------------------------------------------- the dates */

export type FomcMeeting = {
  /** First day, "2026-12-08". */
  start: string;
  /** Last day, when the decision is announced. */
  end: string;
  /** The statement, 2:00 PM in Washington, with Washington's offset that day. */
  statementAt: string;
  /** A meeting with the Summary of Economic Projections (the "dot plot"). */
  projections: boolean;
};

/**
 * The FOMC's scheduled meetings, from federalreserve.gov/monetarypolicy/
 * fomccalendars.htm as published on 18 November 2026.
 *
 * Unscheduled meetings and notation votes are not listed; nobody can list
 * them ahead. The offset on each statement time is US Eastern on that day —
 * -04:00 between the second Sunday of March and the first Sunday of November.
 *
 * When the Fed publishes 2028, add it here. Until then, after the last meeting
 * below the widget shows the rate and no next meeting.
 */
export const FOMC_MEETINGS: readonly FomcMeeting[] = [
  {
    start: "2026-01-27",
    end: "2026-01-28",
    statementAt: "2026-01-28T14:00:00-05:00",
    projections: false,
  },
  {
    start: "2026-03-17",
    end: "2026-03-18",
    statementAt: "2026-03-18T14:00:00-04:00",
    projections: true,
  },
  {
    start: "2026-04-28",
    end: "2026-04-29",
    statementAt: "2026-04-29T14:00:00-04:00",
    projections: false,
  },
  {
    start: "2026-06-16",
    end: "2026-06-17",
    statementAt: "2026-06-17T14:00:00-04:00",
    projections: true,
  },
  {
    start: "2026-07-28",
    end: "2026-07-29",
    statementAt: "2026-07-29T14:00:00-04:00",
    projections: false,
  },
  {
    start: "2026-09-15",
    end: "2026-09-16",
    statementAt: "2026-09-16T14:00:00-04:00",
    projections: true,
  },
  {
    start: "2026-10-27",
    end: "2026-10-28",
    statementAt: "2026-10-28T14:00:00-04:00",
    projections: false,
  },
  {
    start: "2026-12-08",
    end: "2026-12-09",
    statementAt: "2026-12-09T14:00:00-05:00",
    projections: true,
  },
  {
    start: "2027-01-26",
    end: "2027-01-27",
    statementAt: "2027-01-27T14:00:00-05:00",
    projections: false,
  },
  {
    start: "2027-03-16",
    end: "2027-03-17",
    statementAt: "2027-03-17T14:00:00-04:00",
    projections: true,
  },
  {
    start: "2027-04-27",
    end: "2027-04-28",
    statementAt: "2027-04-28T14:00:00-04:00",
    projections: false,
  },
  {
    start: "2027-06-08",
    end: "2027-06-09",
    statementAt: "2027-06-09T14:00:00-04:00",
    projections: true,
  },
  {
    start: "2027-07-27",
    end: "2027-07-28",
    statementAt: "2027-07-28T14:00:00-04:00",
    projections: false,
  },
  {
    start: "2027-09-14",
    end: "2027-09-15",
    statementAt: "2027-09-15T14:00:00-04:00",
    projections: true,
  },
  {
    start: "2027-10-26",
    end: "2027-10-27",
    statementAt: "2027-10-27T14:00:00-04:00",
    projections: false,
  },
  {
    start: "2027-11-16",
    end: "2027-11-17",
    statementAt: "2027-11-17T14:00:00-05:00",
    projections: false,
  },
];

/** The next meeting whose decision has not yet been announced, or null. */
export function nextMeeting(
  now: Date = new Date(),
  meetings: readonly FomcMeeting[] = FOMC_MEETINGS,
): FomcMeeting | null {
  return meetings.find((meeting) => Date.parse(meeting.statementAt) > now.getTime()) ?? null;
}

/* ---------------------------------------------------------- month arithmetic */

function monthKey(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-12-09" or "2026-12" as numbers; missing parts are 1. */
function parts(text: string): { year: number; month: number; day: number } {
  const [year = 1970, month = 1, day = 1] = text.split("-").map(Number);
  return { year, month, day };
}

function shiftMonth(key: string, by: number): string {
  const { year, month } = parts(key);
  return monthKey(year, month + by);
}

function daysIn(key: string): number {
  const { year, month } = parts(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The month whose average rate a meeting changes, and how many of its days
 * are still at the old rate.
 *
 * A new rate takes effect the day after the decision. A meeting ending on the
 * last day of a month therefore changes nothing in that month and everything
 * in the next one.
 */
function affected(meeting: FomcMeeting): { month: string; before: number } {
  const { year, month, day } = parts(meeting.end);
  const key = monthKey(year, month);
  if (day >= daysIn(key)) return { month: shiftMonth(key, 1), before: 0 };
  return { month: key, before: day };
}

/* ---------------------------------------------------------------- the odds */

/** A futures price older than this is not today's market. Four days covers a
 *  weekend and a holiday. */
const STALE_MS = 4 * 24 * 60 * 60 * 1000;

/** A move larger than this either way at one meeting is a bad price, not a
 *  market view, and nothing is drawn from it. */
const MAX_MOVE = 1.0;

export type FedOutcome = {
  /** The move, in basis points: -25 is a quarter-point cut. */
  bp: number;
  /** The target range it would leave, per cent. */
  from: number;
  to: number;
  /** 0 to 1. */
  probability: number;
};

export type FedOdds = {
  cut: number;
  hold: number;
  hike: number;
  /** Each possible target range with its probability, most likely first. */
  outcomes: FedOutcome[];
  /** The average rate the market expects after the meeting, per cent. */
  expectedAfter: number;
};

/**
 * The market's odds of a cut, a hold or a hike at a meeting, from 30-Day Fed
 * Funds futures, or null when the prices to hand cannot honestly give them.
 *
 * The method is CME's. The month a meeting falls in averages the old rate for
 * the days before the decision and the new rate for the days after it. Knowing
 * the average (from that month's contract) and either end (from a neighbouring
 * month with no meeting in it), the other end follows. Where both neighbours
 * would do, the one that divides by more days is used, since dividing by three
 * days multiplies a half-tick of noise into a percentage point of odds.
 *
 * The move is then split between the two quarter-point steps either side of
 * it: a move of 0.30 points is read as a quarter-point move, with a fifth of a
 * chance of half a point.
 */
export function meetingOdds(
  meeting: FomcMeeting,
  fed: FedSnapshot,
  now: Date = new Date(),
  meetings: readonly FomcMeeting[] = FOMC_MEETINGS,
): FedOdds | null {
  const target = fed.target;
  if (!target || !Number.isFinite(target.from) || !Number.isFinite(target.to)) return null;

  const rate = (month: string): number | null => {
    const future = fed.futures.find((entry) => entry.month === month);
    if (!future || !Number.isFinite(future.price) || future.price <= 80 || future.price > 100) {
      return null;
    }
    const at = Date.parse(future.at);
    if (Number.isNaN(at) || now.getTime() - at > STALE_MS) return null;
    return 100 - future.price;
  };

  const others = meetings.filter((other) => other !== meeting).map(affected);
  const quiet = (month: string) => !others.some((other) => other.month === month);

  const { month, before } = affected(meeting);
  const days = daysIn(month);
  const after = days - before;
  const average = rate(month);
  if (average === null) return null;

  const options: Array<{ start: number; end: number; weight: number }> = [];

  // Forward: the start from the month before, if nothing else moved it.
  const previous = shiftMonth(month, -1);
  const startFromPrevious = quiet(previous) ? rate(previous) : null;
  // Or, for a meeting in the month already under way, the rate in force today.
  const thisMonth = monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const startNow =
    startFromPrevious === null && month <= thisMonth && Number.isFinite(target.effr)
      ? (target.effr as number)
      : null;
  const start = startFromPrevious ?? startNow;
  if (start !== null && after > 0) {
    options.push({ start, end: (average * days - start * before) / after, weight: after });
  }

  // Backward: the end from the month after, if nothing else moves it.
  const next = shiftMonth(month, 1);
  const end = quiet(next) ? rate(next) : null;
  if (end !== null && before > 0) {
    options.push({ start: (average * days - end * after) / before, end, weight: before });
  }

  const chosen = options.sort((a, b) => b.weight - a.weight)[0];
  if (!chosen) return null;

  const move = chosen.end - chosen.start;
  if (!Number.isFinite(move) || Math.abs(move) > MAX_MOVE) return null;

  const steps = move / 0.25;
  const lower = Math.floor(steps);
  const share = steps - lower;

  const outcomes: FedOutcome[] = [
    { step: lower, probability: 1 - share },
    { step: lower + 1, probability: share },
  ]
    .filter((outcome) => outcome.probability > 0.0005)
    .map((outcome) => ({
      bp: outcome.step * 25,
      from: round2(target.from + outcome.step * 0.25),
      to: round2(target.to + outcome.step * 0.25),
      probability: outcome.probability,
    }))
    .sort((a, b) => b.probability - a.probability);

  const sum = (test: (bp: number) => boolean) =>
    outcomes.filter((outcome) => test(outcome.bp)).reduce((total, o) => total + o.probability, 0);

  return {
    cut: sum((bp) => bp < 0),
    hold: sum((bp) => bp === 0),
    hike: sum((bp) => bp > 0),
    outcomes,
    expectedAfter: chosen.end,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Probabilities as whole per cents that add up to exactly 100.
 *
 * Rounded by largest remainder, so 33.4 / 33.3 / 33.3 does not print as 99%.
 */
export function wholePercents(values: readonly number[]): number[] {
  const scaled = values.map((value) => Math.max(0, value) * 100);
  const total = scaled.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);

  const exact = scaled.map((value) => (value / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const { index } of order) {
    if (left <= 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    left -= 1;
  }

  return floors;
}

/** "3.75–4.00%". */
export function formatRange(from: number, to: number): string {
  return `${from.toFixed(2)}–${to.toFixed(2)}%`;
}
