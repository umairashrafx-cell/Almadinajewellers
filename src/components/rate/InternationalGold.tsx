import { useQuery } from "@tanstack/react-query";

import { formatRateTimestamp } from "@/lib/rates";
import type { InternationalGold as Quote } from "@/routes/api/international-gold";

/**
 * What gold is doing in the world, beside what it costs here.
 *
 * The shop's board is set locally and carries import duty and the local
 * premium, so it never equals the international figure. Showing both is the
 * point rather than a problem: a customer can see the shop's rate move with
 * the world market instead of being asked to take it on trust.
 *
 * The panel removes itself when the feed is unavailable. A gold price nobody
 * can vouch for is worse than no gold price, and the page below it — the
 * shop's own board — is the part that actually matters.
 */
async function fetchQuote(): Promise<Quote> {
  const res = await fetch("/api/international-gold");
  if (!res.ok) throw new Error("International gold is unavailable.");
  return (await res.json()) as Quote;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function InternationalGold() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["international-gold"],
    queryFn: fetchQuote,
    // The upstream moves through the trading day; asking more often than the
    // server caches would only be asking the same cache again.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError) return null;

  return (
    <section className="border-y border-gold/20 bg-primary-deep">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
              International gold
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-champagne/70">
              The world market price, for comparison. Our board is set locally and includes duty and
              the local premium, so the two are close but never identical.
            </p>
          </div>

          {isPending ? (
            <div className="flex gap-10">
              <div className="h-16 w-40 animate-pulse rounded bg-ivory/10" />
              <div className="h-16 w-40 animate-pulse rounded bg-ivory/10" />
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
              <Figure
                label="Per troy ounce"
                value={usd.format(data.usdPerOunce)}
                hint={`${usd.format(data.usdPerGram)} per gram`}
              />
              <Figure
                label="Per tola, in rupees"
                value={`Rs. ${Math.round(data.pkrPerTola).toLocaleString("en-US")}`}
                hint={`at ${data.usdPkr.toFixed(2)} PKR to the dollar`}
              />
            </div>
          )}
        </div>

        {data ? (
          <p className="nums mt-8 text-[11px] uppercase tracking-widest text-champagne/45">
            Tether Gold (XAUT) · {formatRateTimestamp(data.quotedAt)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-champagne/60">{label}</p>
      <p className="nums mt-2 font-display text-4xl font-light text-gold sm:text-5xl">{value}</p>
      <p className="nums mt-1 text-xs text-champagne/55">{hint}</p>
    </div>
  );
}
