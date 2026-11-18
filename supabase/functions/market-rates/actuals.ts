/**
 * Actual figures for the releases that move gold most, from the agency that
 * publishes them.
 *
 * The metals calendar lists a forecast and the previous reading, never what a
 * release came in at. The Bureau of Labor Statistics publishes the jobs report,
 * the CPI and the PPI itself, through a public API that needs no key, so for
 * those releases the actual figure is read from the source and worked out the
 * way BLS states it:
 *
 *  - payrolls: this month's level less last month's, in thousands — "119K";
 *  - the unemployment rate: as published, to one decimal — "4.4%";
 *  - CPI and PPI m/m and y/y: the per cent change between published indexes,
 *    which BLS prints to three decimals and rounds to one — "0.3%".
 *
 * Everything else on the calendar — retail sales, GDP, PCE, jobless claims,
 * the surveys — comes from agencies whose APIs need a registered key, and is
 * left without an actual rather than filled from somewhere less direct.
 *
 * A figure is only ever matched to the month the release is about: the month
 * before the one it is published in. Until BLS has that month, there is no
 * actual — which is also what stops last month's figure appearing under this
 * month's release.
 */

export const BLS_API = "https://api.bls.gov/publicAPI/v1/timeseries/data/";

type Kind = "change-thousands" | "level-percent" | "month-on-month" | "year-on-year";

type Rule = { title: RegExp; series: string; kind: Kind };

/** The calendar's titles, matched exactly, and where each one's figure lives. */
export const BLS_RULES: readonly Rule[] = [
  { title: /^Non-Farm Employment Change$/i, series: "CES0000000001", kind: "change-thousands" },
  { title: /^Unemployment Rate$/i, series: "LNS14000000", kind: "level-percent" },
  { title: /^CPI m\/m$/i, series: "CUSR0000SA0", kind: "month-on-month" },
  { title: /^Core CPI m\/m$/i, series: "CUSR0000SA0L1E", kind: "month-on-month" },
  { title: /^CPI y\/y$/i, series: "CUUR0000SA0", kind: "year-on-year" },
  { title: /^Core CPI y\/y$/i, series: "CUUR0000SA0L1E", kind: "year-on-year" },
  { title: /^PPI m\/m$/i, series: "WPSFD4", kind: "month-on-month" },
  { title: /^Core PPI m\/m$/i, series: "WPSFD49104", kind: "month-on-month" },
];

type Release = { title: string; currency: string; at: string };

export function blsRule(event: Release): Rule | null {
  if (event.currency !== "USD") return null;
  return BLS_RULES.find((rule) => rule.title.test(event.title.trim())) ?? null;
}

/** The key an actual is kept under between fetches of the calendar. */
export function releaseKey(event: Release): string {
  return `${event.at}|${event.title}`;
}

/**
 * The month a release reports on: the month before the one it is published
 * in, read from the feed's own date (New York time), "2026-11-13" → 2026-10.
 */
export function referenceMonth(at: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(at);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** How long after a release we keep trying to read its actual. */
const LOOK_BACK_MS = 4 * 24 * 60 * 60 * 1000;

/**
 * The releases that are out, ours to fill, and not yet filled — the only
 * reason to ask BLS anything at all.
 */
export function pendingReleases<T extends Release>(
  events: readonly T[],
  known: Record<string, string>,
  now: Date,
): T[] {
  return events.filter((event) => {
    if (!blsRule(event) || known[releaseKey(event)]) return false;
    const at = Date.parse(event.at);
    return !Number.isNaN(at) && at <= now.getTime() && now.getTime() - at <= LOOK_BACK_MS;
  });
}

export type BlsData = Record<string, Map<string, number>>;

/** BLS's answer as series → "2026-10" → value. Null if it is not a success. */
export function parseBls(body: unknown): BlsData | null {
  const answer = body as {
    status?: string;
    Results?: { series?: Array<{ seriesID?: string; data?: Array<Record<string, unknown>> }> };
  } | null;
  if (answer?.status !== "REQUEST_SUCCEEDED") return null;

  const data: BlsData = {};
  for (const series of answer.Results?.series ?? []) {
    if (typeof series.seriesID !== "string") continue;
    const values = new Map<string, number>();
    for (const row of series.data ?? []) {
      const period = typeof row.period === "string" ? /^M(0[1-9]|1[0-2])$/.exec(row.period) : null;
      const value = typeof row.value === "string" ? Number(row.value) : Number.NaN;
      if (!period || typeof row.year !== "string" || !Number.isFinite(value)) continue;
      values.set(`${row.year}-${period[1]}`, value);
    }
    data[series.seriesID] = values;
  }
  return data;
}

function monthKey(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** One decimal, half away from zero, never "-0.0". */
function oneDecimal(value: number): string {
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * 10 + 1e-9)) / 10;
  return `${rounded === 0 ? "0.0" : rounded.toFixed(1)}%`;
}

/**
 * The actual figure for a release, as the calendar would print it, or null
 * when BLS does not yet have the month the release is about.
 */
export function blsActual(event: Release, data: BlsData): string | null {
  const rule = blsRule(event);
  const reference = referenceMonth(event.at);
  if (!rule || !reference) return null;

  const values = data[rule.series];
  if (!values) return null;

  const { year, month } = reference;
  const current = values.get(monthKey(year, month));
  if (current === undefined) return null;

  switch (rule.kind) {
    case "level-percent":
      return `${current.toFixed(1)}%`;

    case "change-thousands": {
      const before = values.get(monthKey(year, month - 1));
      if (before === undefined) return null;
      return `${Math.round(current - before)}K`;
    }

    case "month-on-month":
    case "year-on-year": {
      const before = values.get(
        rule.kind === "month-on-month" ? monthKey(year, month - 1) : monthKey(year - 1, month),
      );
      if (before === undefined || before <= 0) return null;
      return oneDecimal((current / before - 1) * 100);
    }
  }
}

/** The request body for the series a set of releases needs. */
export function blsRequest(events: readonly Release[], now: Date) {
  const series = [
    ...new Set(events.map((event) => blsRule(event)?.series).filter(Boolean)),
  ] as string[];
  const year = now.getUTCFullYear();
  // Last year too, for the y/y figures and for a January release.
  return { seriesid: series, startyear: String(year - 1), endyear: String(year) };
}
