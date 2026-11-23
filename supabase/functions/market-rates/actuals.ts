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
 * Retail sales come from the Census Bureau and GDP and PCE inflation from the
 * Bureau of Economic Analysis, each of which publishes the per cent change
 * itself. Their APIs need a registered key, held as a Supabase secret
 * (CENSUS_API_KEY, BEA_API_KEY) and never in this public repository; without
 * one, those releases simply go without an actual.
 *
 * The Philadelphia Fed's manufacturing survey comes from the Philadelphia Fed
 * itself, which publishes its seasonally adjusted indexes as a keyless CSV.
 *
 * Jobless claims and the other surveys (ISM, the New York Fed, Michigan) have
 * no free official API wired in here and are left without an actual rather
 * than filled from somewhere less direct.
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
    if (!actualSource(event) || known[releaseKey(event)]) return false;
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

/* ------------------------------------------------------- Census and BEA */

/** Retail sales, from the Census Bureau's monthly retail trade survey. The
 *  category codes are the survey's: 44X72 is retail and food services in
 *  total, 44Y72 the same excluding motor vehicles and parts ("core"). */
export const CENSUS_RULES: ReadonlyArray<{ title: RegExp; category: string }> = [
  { title: /^Retail Sales m\/m$/i, category: "44X72" },
  { title: /^Core Retail Sales m\/m$/i, category: "44Y72" },
];

/**
 * GDP and PCE inflation, from the BEA's national accounts. Table 1.1.1 line 1
 * is real GDP, per cent change at an annual rate — the figure all three
 * estimates (advance, second, third) are quoted as. Table 2.8.7 is the monthly
 * per cent change in the PCE price indexes: line 1 all items, line 25
 * excluding food and energy.
 */
export const BEA_RULES: ReadonlyArray<{
  title: RegExp;
  table: string;
  line: string;
  frequency: "Q" | "M";
}> = [
  { title: /^(Advance|Prelim|Final) GDP q\/q$/i, table: "T10101", line: "1", frequency: "Q" },
  { title: /^PCE Price Index m\/m$/i, table: "T20807", line: "1", frequency: "M" },
  { title: /^Core PCE Price Index m\/m$/i, table: "T20807", line: "25", frequency: "M" },
];

function usd(event: Release): boolean {
  return event.currency === "USD";
}

export function censusRule(event: Release) {
  return usd(event) ? (CENSUS_RULES.find((r) => r.title.test(event.title.trim())) ?? null) : null;
}

export function beaRule(event: Release) {
  return usd(event) ? (BEA_RULES.find((r) => r.title.test(event.title.trim())) ?? null) : null;
}

/**
 * The Philadelphia Fed's Manufacturing Business Outlook Survey, as the bank
 * publishes it: its seasonally adjusted diffusion indexes, one row a month.
 * GAC is current general activity — the headline the calendar calls the
 * "Philly Fed Manufacturing Index".
 */
export const PHILLY_FED_CSV =
  "https://www.philadelphiafed.org/-/media/FRBP/Assets/Surveys-And-Data/MBOS/Historical-Data/Diffusion-Indexes/bos_dif.csv";

export const PHILLY_RULES: ReadonlyArray<{ title: RegExp; column: string }> = [
  { title: /^Philly Fed Manufacturing Index$/i, column: "GAC" },
];

export function phillyRule(event: Release) {
  return usd(event) ? (PHILLY_RULES.find((r) => r.title.test(event.title.trim())) ?? null) : null;
}

/**
 * The New York Fed's Empire State Manufacturing Survey, as the bank publishes
 * it: its seasonally adjusted diffusion indexes, one row a month. GACDISA is
 * current general business conditions — the headline the calendar calls the
 * "Empire State Manufacturing Index".
 */
export const EMPIRE_STATE_CSV =
  "https://www.newyorkfed.org/medialibrary/media/survey/empire/data/ESMS_SeasonallyAdjusted_Diffusion.csv";

export const EMPIRE_RULES: ReadonlyArray<{ title: RegExp; column: string }> = [
  { title: /^Empire State Manufacturing Index$/i, column: "GACDISA" },
];

export function empireRule(event: Release) {
  return usd(event) ? (EMPIRE_RULES.find((r) => r.title.test(event.title.trim())) ?? null) : null;
}

/** Which agency publishes a release's actual, if any we read. */
export function actualSource(
  event: Release,
): "bls" | "census" | "bea" | "philly" | "empire" | null {
  if (blsRule(event)) return "bls";
  if (censusRule(event)) return "census";
  if (beaRule(event)) return "bea";
  if (phillyRule(event)) return "philly";
  if (empireRule(event)) return "empire";
  return null;
}

const MONTH_ABBREVIATIONS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * The Philadelphia Fed's CSV as month → column → value. Its dates are written
 * "Nov-26"; the series begins in 1968, so a two-digit year above 60 is the
 * 1900s. Null if it is not the file it publishes.
 */
export function parsePhilly(text: unknown): Map<string, Record<string, string>> | null {
  if (typeof text !== "string") return null;
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((cell) => cell.trim());
  if (!header || header[0] !== "DATE" || !header.includes("GAC")) return null;

  const rows = new Map<string, Record<string, string>>();
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const date = /^([A-Za-z]{3})-(\d{2})$/.exec(cells[0] ?? "");
    if (!date) continue;
    const month = MONTH_ABBREVIATIONS.indexOf(date[1]!.toLowerCase()) + 1;
    if (month === 0) continue;
    const short = Number(date[2]);
    const year = short > 60 ? 1900 + short : 2000 + short;

    const row: Record<string, string> = {};
    header.forEach((name, index) => {
      if (index > 0 && cells[index] !== undefined) row[name] = cells[index]!;
    });
    rows.set(monthLabel(year, month), row);
  }
  return rows;
}

/**
 * The Philly Fed index's actual, or null until the bank has published the
 * month. Unlike the government's data, the survey reports on the month it is
 * released in: November's figure comes out on the third Thursday of November.
 */
export function phillyActual(
  event: Release,
  data: Map<string, Record<string, string>>,
): string | null {
  return surveyActual(phillyRule(event), event, data);
}

/**
 * The New York Fed's CSV as month → column → value. Its dates are the month's
 * last day, "2026-11-30". Null if it is not the file it publishes.
 */
export function parseEmpire(text: unknown): Map<string, Record<string, string>> | null {
  if (typeof text !== "string") return null;
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.split(",").map((cell) => cell.trim());
  if (!header || header[0] !== "surveyDate" || !header.includes("GACDISA")) return null;

  const rows = new Map<string, Record<string, string>>();
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const date = /^(\d{4})-(\d{2})-\d{2}$/.exec(cells[0] ?? "");
    if (!date) continue;

    const row: Record<string, string> = {};
    header.forEach((name, index) => {
      if (index > 0 && cells[index] !== undefined) row[name] = cells[index]!;
    });
    rows.set(`${date[1]}-${date[2]}`, row);
  }
  return rows;
}

/**
 * The Empire State index's actual, or null until the bank has published the
 * month. Like the Philly Fed's, the survey reports on the month it is released
 * in: November's figure comes out in the middle of November.
 */
export function empireActual(
  event: Release,
  data: Map<string, Record<string, string>>,
): string | null {
  return surveyActual(empireRule(event), event, data);
}

/** A regional Fed survey's headline for the release's own month, to one decimal. */
function surveyActual(
  rule: { column: string } | null,
  event: Release,
  data: Map<string, Record<string, string>>,
): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(event.at);
  if (!rule || !match) return null;

  const raw = data.get(`${match[1]}-${match[2]}`)?.[rule.column];
  // The bank writes "ND" where it has no figure; Number("ND") is NaN.
  const value = typeof raw === "string" && raw !== "" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? "0.0" : rounded.toFixed(1);
}

/** "0.2" → "0.2%", "-0.0" → "0.0%"; null if it is not a number. */
function asPercent(text: unknown): string | null {
  const value = typeof text === "string" ? Number(text.replace(/,/g, "")) : Number.NaN;
  if (!Number.isFinite(value) || (typeof text === "string" && text.trim() === "")) return null;
  const rounded = Math.round(value * 10) / 10;
  return `${rounded === 0 ? "0.0" : rounded.toFixed(1)}%`;
}

function monthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The Census request for a month's seasonally adjusted per cent changes. */
export function censusUrl(year: number, month: number, key: string): string {
  const params = new URLSearchParams({
    get: "cell_value,category_code,time_slot_id",
    time: monthLabel(year, month),
    data_type_code: "MPCSM",
    seasonally_adj: "yes",
    key,
  });
  return `https://api.census.gov/data/timeseries/eits/marts?${params}`;
}

/** Census's table of rows as category → month → value. Null if it is not
 *  the table it publishes. */
export function parseCensus(body: unknown): Map<string, string> | null {
  if (!Array.isArray(body) || !Array.isArray(body[0])) return null;
  const header = body[0] as unknown[];
  const value = header.indexOf("cell_value");
  const category = header.indexOf("category_code");
  const time = header.indexOf("time");
  const slot = header.indexOf("time_slot_id");
  if (value < 0 || category < 0 || time < 0) return null;

  const out = new Map<string, string>();
  for (const row of body.slice(1) as unknown[][]) {
    if (!Array.isArray(row)) continue;
    // Slot 0 is the month as a whole; others are partial periods.
    if (slot >= 0 && row[slot] !== "0") continue;
    out.set(`${row[category]}|${row[time]}`, String(row[value]));
  }
  return out;
}

/** A retail sales release's actual, or null until Census has its month. */
export function censusActual(event: Release, data: Map<string, string>): string | null {
  const rule = censusRule(event);
  const reference = referenceMonth(event.at);
  if (!rule || !reference) return null;
  return asPercent(data.get(`${rule.category}|${monthLabel(reference.year, reference.month)}`));
}

/** The BEA request for one table, this year and last. */
export function beaUrl(table: string, frequency: "Q" | "M", now: Date, key: string): string {
  const year = now.getUTCFullYear();
  const params = new URLSearchParams({
    UserID: key,
    method: "GetData",
    DataSetName: "NIPA",
    TableName: table,
    Frequency: frequency,
    Year: `${year - 1},${year}`,
    ResultFormat: "JSON",
  });
  return `https://apps.bea.gov/api/data/?${params}`;
}

export type BeaTable = {
  /** The day the table was last revised, "2026-10-29". */
  revised: string;
  /** Line number → its periods in order, latest last. */
  lines: Map<string, Array<{ period: string; value: string }>>;
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** A BEA table and the day it was last revised, or null if either is missing. */
export function parseBea(body: unknown): BeaTable | null {
  const results = (body as { BEAAPI?: { Results?: Record<string, unknown> } } | null)?.BEAAPI
    ?.Results;
  if (!results || !Array.isArray(results.Data)) return null;

  const notes = Array.isArray(results.Notes) ? (results.Notes as Array<{ NoteText?: string }>) : [];
  const stamp = notes
    .map((note) => /LastRevised:\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(note.NoteText ?? ""))
    .find(Boolean);
  if (!stamp) return null;
  const month = MONTHS.indexOf(stamp[1]!.toLowerCase()) + 1;
  if (month === 0) return null;
  const revised = `${stamp[3]}-${String(month).padStart(2, "0")}-${stamp[2]!.padStart(2, "0")}`;

  const lines = new Map<string, Array<{ period: string; value: string }>>();
  for (const row of results.Data as Array<Record<string, unknown>>) {
    if (typeof row.LineNumber !== "string" || typeof row.TimePeriod !== "string") continue;
    if (typeof row.DataValue !== "string") continue;
    const list = lines.get(row.LineNumber) ?? [];
    list.push({ period: row.TimePeriod, value: row.DataValue });
    lines.set(row.LineNumber, list);
  }
  for (const list of lines.values()) list.sort((a, b) => (a.period < b.period ? -1 : 1));

  return { revised, lines };
}

/**
 * A GDP or PCE release's actual, or null.
 *
 * BEA's tables carry their latest estimate with no vintage on each figure —
 * the second estimate of GDP replaces the advance one in place. So the figure
 * is taken only when the table itself says it was revised on the day of the
 * release: before that, the latest figure is the previous estimate, and
 * showing it would put last month's number under this month's release.
 */
export function beaActual(event: Release, table: BeaTable): string | null {
  const rule = beaRule(event);
  if (!rule) return null;
  if (table.revised !== event.at.slice(0, 10)) return null;

  const latest = table.lines.get(rule.line)?.at(-1);
  return latest ? asPercent(latest.value) : null;
}

/* ------------------------------------------------------------- the pace */

/** Right after a release, how long to keep asking every minute. */
export const FAST_WINDOW_MS = 20 * 60 * 1000;

/**
 * Seconds to wait before asking the agencies again.
 *
 * One minute while any release still missing its actual came out within the
 * last twenty minutes — the agencies publish at the stroke of the hour and
 * their APIs catch up within a few minutes, which is when the figure matters.
 * After that, a quarter of an hour. Asking stops altogether once the figure is
 * in, so a normal release costs BLS's keyless API two or three requests of its
 * daily allowance, and even a slow one no more than twenty.
 */
export function actualsWaitSeconds(pending: readonly Release[], now: Date): number {
  const fresh = pending.some((event) => {
    const at = Date.parse(event.at);
    return !Number.isNaN(at) && now.getTime() - at >= 0 && now.getTime() - at <= FAST_WINDOW_MS;
  });
  return fresh ? 60 : 900;
}

/** BLS's registered API (500 requests a day) when a key is set, else the
 *  keyless one. The key travels in the body, never the URL. */
export function blsEndpoint(key: string | undefined): string {
  return key ? "https://api.bls.gov/publicAPI/v2/timeseries/data/" : BLS_API;
}
