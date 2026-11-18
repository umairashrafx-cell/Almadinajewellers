import type { MarketCalendar, MarketEvent } from "@/lib/markets";
import { pktDay, pktDayLabel } from "@/lib/pkt";

/**
 * The week's American releases, read the way a gold dealer reads them.
 *
 * Gold and silver are priced in dollars, and it is American data that moves
 * them within the minute: a jobs figure, an inflation print, a Fed decision.
 * This module groups that week by day in Pakistan, and — once a release is out
 * and the source has published what it came in at — says which way that
 * figure usually pushes gold.
 *
 * It never says it before. A forecast is the market's guess, and a label on a
 * guess would be a prediction; the label exists only beside an actual figure.
 */

/* ------------------------------------------------------------- the figures */

const MULTIPLIERS: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/**
 * A figure as the calendar writes it — "0.3%", "-0.5%", "119K", "7.15M",
 * "1,234.5", "4.00%" — as a number, or null if it is not one.
 *
 * Only what the feed actually prints is understood. Anything else, a range or
 * a word, is null rather than half-read, because a figure misread here would
 * flip a label from good to bad.
 */
export function parseFigure(text: string | undefined): number | null {
  if (typeof text !== "string") return null;
  const match = /^\s*([+-]?)\s*(\d[\d,]*(?:\.\d+)?|\.\d+)\s*([KMBT])?\s*(%)?\s*$/i.exec(text);
  if (!match) return null;

  const [, sign, digits = "", suffix] = match;
  const value = Number(digits.replace(/,/g, ""));
  if (!digits || !Number.isFinite(value)) return null;

  const scaled = value * (suffix ? (MULTIPLIERS[suffix.toUpperCase()] ?? 1) : 1);
  return sign === "-" ? -scaled : scaled;
}

/* --------------------------------------------------------- the stated rule */

/**
 * Which way a release is read: whether a higher figure means a stronger
 * American economy (or a hawkish Fed), or a weaker one.
 *
 * An allow-list, on purpose. The rule below is the textbook first reaction and
 * it is well established for these releases — jobs, wages, inflation, growth,
 * spending, business surveys, housing, and the Fed's own rate. For anything
 * not on it (a trade balance, a bond auction, an oil inventory, a speech) the
 * direction is arguable, and the honest label is none.
 *
 * Order matters: the first pattern that matches decides.
 */
const DIRECTIONS: ReadonlyArray<{ pattern: RegExp; higher: "stronger" | "weaker" }> = [
  // More people out of work is a weaker economy.
  { pattern: /unemployment rate/i, higher: "weaker" },
  { pattern: /unemployment claims|jobless claims|continuing claims/i, higher: "weaker" },

  // Jobs and wages.
  { pattern: /non-?farm|employment change|payrolls/i, higher: "stronger" },
  {
    pattern: /average hourly earnings|employment cost index|jolts|job openings/i,
    higher: "stronger",
  },

  // Inflation. Hotter than forecast means rates stay higher for longer.
  { pattern: /\bcpi\b|\bppi\b|\bpce\b|price index|inflation|import prices/i, higher: "stronger" },

  // Growth and spending.
  {
    pattern: /\bgdp\b|retail sales|durable goods|industrial production|factory orders/i,
    higher: "stronger",
  },
  { pattern: /personal spending|personal income/i, higher: "stronger" },

  // Business and consumer surveys.
  { pattern: /\bpmi\b|\bism\b|philly fed|empire state|richmond|chicago/i, higher: "stronger" },
  { pattern: /consumer sentiment|consumer confidence/i, higher: "stronger" },

  // Housing.
  { pattern: /housing starts|building permits|home sales/i, higher: "stronger" },

  // The Fed's own rate: a higher rate than expected is the hawkish surprise.
  { pattern: /federal funds rate/i, higher: "stronger" },
];

/** How a release is read, or null when no rule is claimed for it. */
export function releaseDirection(event: Pick<MarketEvent, "title" | "currency">) {
  if (event.currency !== "USD") return null;
  return DIRECTIONS.find((rule) => rule.pattern.test(event.title))?.higher ?? null;
}

/**
 * Good, bad, or as expected for gold — the label beside a released figure.
 *
 * The rule, stated once and tested:
 *
 *   American data that comes in STRONGER than forecast is usually BAD for gold.
 *   A stronger economy or hotter inflation means the Fed keeps rates higher for
 *   longer; that lifts the dollar and the yield on bonds, and gold, which pays
 *   no interest, loses some of its appeal.
 *
 *   American data that comes in WEAKER than forecast is usually GOOD for gold,
 *   for the same reasons run backwards.
 *
 * "Stronger" means a higher figure, except for unemployment and jobless claims,
 * where a higher figure is the weaker economy. Equal to the forecast is "as
 * expected". It is the usual first reaction, not a promise: on a given day a
 * second release, a speech or a war can outweigh it.
 *
 * Null — no label at all — unless the release is American, is on the list
 * above, and has both an actual figure and a forecast that can be read.
 */
export type GoldVerdict = "good" | "bad" | "inline";

export function goldVerdict(event: MarketEvent): GoldVerdict | null {
  const higher = releaseDirection(event);
  if (!higher) return null;

  const actual = parseFigure(event.actual);
  const forecast = parseFigure(event.forecast);
  if (actual === null || forecast === null) return null;

  // Compared at the precision the figures are printed in, so 0.30% and 0.3%
  // are the same reading and floating point cannot invent a surprise.
  const gap = actual - forecast;
  if (Math.abs(gap) < 1e-9 * Math.max(1, Math.abs(forecast))) return "inline";

  const stronger = higher === "stronger" ? gap > 0 : gap < 0;
  return stronger ? "bad" : "good";
}

/* ----------------------------------------------------------- the week view */

/** The currencies whose releases move gold and silver. */
const METALS_CURRENCIES = ["USD"];

export type CalendarDay = {
  /** "2026-11-18", in Pakistan. */
  day: string;
  /** "Today", "Tomorrow", "Thu 20 Nov". */
  label: string;
  events: MarketEvent[];
};

export type MetalsWeek = {
  /** Days before today in Pakistan that had releases. */
  earlier: CalendarDay[];
  /** Today and the days after it, as far as the feed covers. Today is always
   *  first when it falls inside the week, even with nothing on it. */
  coming: CalendarDay[];
};

/**
 * The week's gold-moving releases, grouped by day in Pakistan.
 *
 * Null when there is nothing honest to show: no calendar, or a calendar with
 * no stated week (a failed first fetch). A week that is stated but has
 * nothing on it comes back with an empty today, which the screen can say.
 */
export function metalsWeek(
  calendar: MarketCalendar | undefined,
  now: Date = new Date(),
): MetalsWeek | null {
  if (!calendar?.from || !calendar.to) return null;

  const byDay = new Map<string, MarketEvent[]>();
  const sorted = calendar.events
    .filter((event) => METALS_CURRENCIES.includes(event.currency))
    .filter((event) => !Number.isNaN(Date.parse(event.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  for (const event of sorted) {
    const day = pktDay(event.at);
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }

  const today = pktDay(now);
  // The feed's week is US Eastern, Sunday to Saturday. In Pakistan the same
  // week runs from Sunday morning to Sunday morning, so a release late on the
  // feed's Saturday can land on the Sunday after `to` here — and that day is
  // covered all the same.
  const coversToday = today >= calendar.from && today <= nextDay(calendar.to);
  if (coversToday && !byDay.has(today)) byDay.set(today, []);

  const days = [...byDay.keys()].sort();
  const toDay = (day: string): CalendarDay => ({
    day,
    label: pktDayLabel(day, now),
    events: byDay.get(day) ?? [],
  });

  return {
    earlier: days.filter((day) => day < today).map(toDay),
    coming: days.filter((day) => day >= today).map(toDay),
  };
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Whether a release's time has come. */
export function isReleased(event: MarketEvent, now: Date = new Date()): boolean {
  const at = Date.parse(event.at);
  return !Number.isNaN(at) && at <= now.getTime();
}

/** The first release still to come, if any — the one worth a countdown. */
export function nextRelease(week: MetalsWeek, now: Date = new Date()): MarketEvent | null {
  for (const day of week.coming) {
    for (const event of day.events) if (!isReleased(event, now)) return event;
  }
  return null;
}
