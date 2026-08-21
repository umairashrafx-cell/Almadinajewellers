import { supabase } from "@/integrations/supabase/client";

/** 1 tola = 11.6638 g. Older buyers still price in tola. */
export const TOLA_IN_GRAMS = 11.6638;

/** Karats shown on the public rate table, in display order. */
export const GOLD_KARATS = ["24K", "22K", "21K", "18K"] as const;

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
  rates: [
    { karat: "24K", perGram: 38581, perTola: 450000 },
    { karat: "22K", perGram: 35366, perTola: 412500 },
    { karat: "21K", perGram: 33758, perTola: 393750 },
    { karat: "18K", perGram: 28936, perTola: 337500 },
  ],
};

/**
 * Loads the most recent day's rates. The table holds one row per karat per day,
 * so this pulls the latest handful and keeps the rows sharing the newest date —
 * cheaper than a max(rate_date) subquery for a table this small.
 */
export async function fetchRateSnapshot(): Promise<RateSnapshot> {
  const { data, error } = await supabase
    .from("gold_rates")
    .select("rate_date, karat, rate_per_gram_pkr, rate_per_tola_pkr, created_at")
    .order("rate_date", { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("No gold rates have been published yet.");

  const latest = data[0]!.rate_date;
  const today = data.filter((r) => r.rate_date === latest);

  // The newest row wins: publishing again during the day upserts each karat, so
  // the latest created_at is when the shop last touched the figures.
  const publishedAt = today
    .map((r) => r.created_at)
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

  return `${date} at ${time}`;
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
