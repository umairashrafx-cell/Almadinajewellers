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
    { karat: "24K", perGram: 27850, perTola: 324840 },
    { karat: "22K", perGram: 25530, perTola: 297770 },
    { karat: "21K", perGram: 24370, perTola: 284240 },
    { karat: "18K", perGram: 20890, perTola: 243630 },
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
    .select("rate_date, karat, rate_per_gram_pkr, rate_per_tola_pkr")
    .order("rate_date", { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("No gold rates have been published yet.");

  const latest = data[0]!.rate_date;

  return {
    date: latest,
    rates: data
      .filter((r) => r.rate_date === latest)
      .map((r) => ({
        karat: r.karat,
        perGram: r.rate_per_gram_pkr,
        perTola: r.rate_per_tola_pkr,
      })),
  };
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
