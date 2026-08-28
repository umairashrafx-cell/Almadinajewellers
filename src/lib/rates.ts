import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * gold_rates.updated_at is newer than the generated Database type, which the
 * platform regenerates and which must not be hand-edited. Reading that one
 * column through an untyped handle keeps the rest of this module typed, and
 * RateRow below restores the shape the query actually returns.
 */
const untyped = supabase as unknown as SupabaseClient;

type RateRow = {
  rate_date: string;
  karat: string;
  rate_per_gram_pkr: number;
  rate_per_tola_pkr: number;
  created_at: string;
  /** Absent on rows written before the column was added. */
  updated_at?: string | null;
};

/** 1 tola = 11.6638 g. Older buyers still price in tola. */
export const TOLA_IN_GRAMS = 11.6638;

/**
 * Rates are quoted to the hundred rupee, rounded down.
 *
 * A derived rate lands on figures like 472,015 and 439,083, which is not how a
 * rate is spoken or written on a board. Down rather than to the nearest,
 * because the rounding should never quote a customer more than the arithmetic
 * gives — 439,083 becomes 439,000, not 439,100.
 */
export function roundRateToHundred(perTola: number): number {
  return Math.floor(perTola / 100) * 100;
}

/**
 * The gold the shop trades, in the order the board shows it.
 *
 * 21K and 18K are gone. They were never rates the shop quoted — they were
 * derived from 24K to fill a table — and the board a customer reads should be
 * the one behind the counter.
 */
export const GOLD_KARATS = ["24K", "23.65K", "22K"] as const;

/**
 * The rate board, as the shop names it.
 *
 * Customers here ask for a piece, for pathor, for jewellery — not for a karat.
 * The purity is what settles an argument, so it is printed small beside the
 * name rather than instead of it.
 */
/**
 * What the shop pays when it buys jewellery back.
 *
 * Deliberately not on the board: that board is what the shop sells at, and a
 * buying rate sitting in the same table would read as a fifth thing on offer.
 * It belongs on the page about selling to us, which is where it is shown.
 */
export const BUY_KARAT = "20K";

export const RATE_BOARD = [
  { karat: "24K", name: "Piece", mark: "24k" },
  { karat: "23.65K", name: "Pathor", mark: "23.65k" },
  { karat: "22K", name: "Jewellery", mark: "22k" },
  { karat: "999", name: "Silver", mark: "999.0" },
] as const;

export type MetalRate = {
  /** "22K" for gold, "925" for sterling silver. */
  karat: string;
  perGram: number;
  perTola: number;
};

export type RateSnapshot = {
  /** ISO date the rates were set, e.g. "2026-08-18". */
  date: string;
  /**
   * When the day's rates were actually published, from the newest row's
   * created_at. rate_date is only a date, so on a day the rate is revised it
   * cannot show that anything changed — this is what makes "updated at 2:15pm"
   * meaningful to someone checking whether they are looking at the morning
   * figure or an updated one. Absent when the rates came from the fallback.
   */
  publishedAt?: string;
  rates: MetalRate[];
};

/**
 * Last-resort figures used only if the gold_rates query fails, so the homepage
 * rate band never renders empty. These are NOT the live rates — update the
 * gold_rates table, never this list.
 */
export const FALLBACK_SNAPSHOT: RateSnapshot = {
  date: "",
  // The board's three gold rows. 21K and 18K are gone from here too: a
  // fallback that quotes rates the shop no longer publishes would put figures
  // on the page that nobody stands behind.
  rates: [
    { karat: "24K", perGram: 38581, perTola: 450000 },
    { karat: "23.65K", perGram: 38018, perTola: 443437 },
    { karat: "22K", perGram: 35366, perTola: 412500 },
  ],
};

/**
 * Loads the most recent day's rates. The table holds one row per karat per day,
 * so this pulls the latest handful and keeps the rows sharing the newest date —
 * cheaper than a max(rate_date) subquery for a table this small.
 */
const RATE_COLUMNS = "rate_date, karat, rate_per_gram_pkr, rate_per_tola_pkr, created_at";

/**
 * Reads the rate rows, preferring updated_at but tolerating its absence.
 *
 * Postgrest rejects the whole select when one column is unknown, so asking for
 * updated_at before its migration has run would take down the rate band, the
 * rate page and every live price at once. Retrying without it decouples this
 * deploy from that migration entirely — the stamp is simply less precise until
 * the column exists.
 */
async function selectRateRows(): Promise<RateRow[]> {
  const withUpdated = await untyped
    .from("gold_rates")
    .select(`${RATE_COLUMNS}, updated_at`)
    .order("rate_date", { ascending: false })
    .limit(24);

  if (!withUpdated.error) return (withUpdated.data ?? []) as RateRow[];

  const { data, error } = await untyped
    .from("gold_rates")
    .select(RATE_COLUMNS)
    .order("rate_date", { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);
  return (data ?? []) as RateRow[];
}

export async function fetchRateSnapshot(): Promise<RateSnapshot> {
  const rows = await selectRateRows();
  if (rows.length === 0) throw new Error("No gold rates have been published yet.");

  const latest = rows[0]!.rate_date;
  const today = rows.filter((r) => r.rate_date === latest);

  /*
   * Timed from the gold rows only.
   *
   * Silver is stored in this same table but is never shown on the rate table or
   * the homepage band, and it is often saved separately from the gold figures.
   * Taking the newest row across all karats therefore stamped a gold table with
   * the moment silver happened to be touched — on 21 August that read "3:16 pm"
   * for rates the shop actually set at 12:12.
   *
   * Within the gold rows the newest wins: publishing again during the day
   * upserts each karat, so the latest created_at is when the shop last revised
   * the figures a visitor is looking at.
   */
  const goldKarats: readonly string[] = GOLD_KARATS;
  const publishedAt = today
    .filter((r) => goldKarats.includes(r.karat))
    // updated_at moves every time a rate is republished; created_at only ever
    // records the day's first save, so a corrected rate would keep claiming the
    // morning's time. Falls back for rows written before that column existed.
    .map((r) => r.updated_at ?? r.created_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    date: latest,
    ...(publishedAt ? { publishedAt } : {}),
    rates: today.map((r) => ({
      karat: r.karat,
      perGram: r.rate_per_gram_pkr,
      perTola: r.rate_per_tola_pkr,
    })),
  };
}

/**
 * Recent published days, newest first, for the rate history table.
 * Returns one snapshot per date. Only the gold karats are carried through.
 */
export async function fetchRateHistory(days = 10): Promise<RateSnapshot[]> {
  const { data, error } = await supabase
    .from("gold_rates")
    .select("rate_date, karat, rate_per_gram_pkr, rate_per_tola_pkr")
    .order("rate_date", { ascending: false })
    // Five metal rows per day at most, so this covers the requested window.
    .limit(days * 5);

  if (error) throw new Error(error.message);

  const byDate = new Map<string, MetalRate[]>();
  for (const row of data ?? []) {
    if (!byDate.has(row.rate_date)) byDate.set(row.rate_date, []);
    byDate.get(row.rate_date)!.push({
      karat: row.karat,
      perGram: row.rate_per_gram_pkr,
      perTola: row.rate_per_tola_pkr,
    });
  }

  return [...byDate.entries()].slice(0, days).map(([date, rates]) => ({ date, rates }));
}

/** Gold rows only, in 24K → 18K order, for the public rate table. */
export function goldOnly(snapshot: RateSnapshot): MetalRate[] {
  return GOLD_KARATS.map((k) => snapshot.rates.find((r) => r.karat === k)).filter(
    (r): r is MetalRate => Boolean(r),
  );
}

/**
 * The board's rows, each with whatever rate has been published for it.
 *
 * A row with no rate yet keeps its place and reports undefined, so silver
 * shows an em dash on the board rather than vanishing from it — an absent row
 * reads as "we do not deal in this", which is the wrong message.
 */
export function rateBoard(
  snapshot: RateSnapshot | undefined,
): { name: string; mark: string; karat: string; rate: MetalRate | undefined }[] {
  return RATE_BOARD.map((row) => ({
    name: row.name,
    mark: row.mark,
    karat: row.karat,
    rate: snapshot?.rates.find((r) => r.karat === row.karat),
  }));
}

export function rateFor(snapshot: RateSnapshot | undefined, karat: string): MetalRate | undefined {
  return snapshot?.rates.find((r) => r.karat === karat);
}

/**
 * The shop's own clock. Pinned rather than left to the runtime for two reasons:
 * the server renders in UTC and the browser in the visitor's zone, and an
 * unpinned format would differ between them and trip a hydration mismatch; and
 * a rate published at 10am in Mandi Bahauddin should read as 10am to a customer
 * in London, because it describes when the shop set the price.
 */
const SHOP_TIME_ZONE = "Asia/Karachi";

/** "21 August 2026 at 2:15 pm" — the moment the day's rates were published. */
export function formatRateTimestamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  const date = at.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: SHOP_TIME_ZONE,
  });

  const time = at.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: SHOP_TIME_ZONE,
  });

  // Labelled, because a bare time on a page read from Dubai, London or Toronto
  // invites the reader to assume it is their own.
  return `${date} at ${time} PKT`;
}

/**
 * Whichever is more precise: the publish timestamp when we have it, the plain
 * date when we do not.
 */
export function formatRateStamp(snapshot: RateSnapshot): string {
  if (snapshot.publishedAt) {
    const stamp = formatRateTimestamp(snapshot.publishedAt);
    if (stamp) return stamp;
  }
  return formatRateDate(snapshot.date);
}

/** "18 August 2026" from an ISO date string. */
export function formatRateDate(iso: string): string {
  if (!iso) return "";
  // Parsed as UTC noon so a timezone shift can't roll the date back a day.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
