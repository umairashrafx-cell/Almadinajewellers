import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE, whatsappLink } from "@/lib/site";
import {
  FALLBACK_SNAPSHOT,
  GOLD_KARATS,
  fetchRateSnapshot,
  formatRateDate,
  goldOnly,
  type MetalRate,
} from "@/lib/rates";

/**
 * Dark green band with today's per-gram and per-tola rates.
 *
 * Rates come from the gold_rates table — nothing here is hardcoded. If the
 * query fails the band still renders, on fallback figures and without a date,
 * because an empty band on the homepage looks worse than a dated one.
 *
 * While the query is still in flight the figures are skeletons rather than
 * those fallbacks. Showing a plausible number that silently changes a moment
 * later is the one failure this band cannot afford: the whole argument of the
 * page is that our prices are checkable. The karat labels are fixed, so they
 * stay, and only the numbers load in.
 */
export function GoldRateStrip() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["gold-rates"],
    queryFn: fetchRateSnapshot,
    // Rates change once a day; no need to refetch on every mount.
    staleTime: 5 * 60 * 1000,
  });

  const snapshot = data ?? FALLBACK_SNAPSHOT;
  const rates: MetalRate[] = goldOnly(snapshot);
  const stamp = snapshot.date ? `Updated ${formatRateDate(snapshot.date)}` : "Indicative rates";

  return (
    <section className="section-y bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Today's Rates</p>
            <h2 className="mt-3 font-display text-3xl font-light tracking-wide text-ivory sm:text-4xl">
              Live Gold Rate
            </h2>
          </div>
          <p className="nums text-xs text-champagne/70">
            {isPending ? "Loading rates…" : `${stamp} · PKR`}
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-gold/40 text-[11px] uppercase tracking-[0.2em] text-champagne/70">
                <th scope="col" className="py-3 font-medium">
                  Purity
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  Per Gram
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  Per Tola
                </th>
              </tr>
            </thead>
            <tbody>
              {isPending
                ? GOLD_KARATS.map((karat) => (
                    <tr key={karat} className="border-b border-gold/15">
                      <th scope="row" className="py-4 font-display text-xl font-normal text-ivory">
                        {karat}
                      </th>
                      <td className="py-4">
                        <Skeleton className="ml-auto h-4 w-20 bg-champagne/20" />
                      </td>
                      <td className="py-4">
                        <Skeleton className="ml-auto h-4 w-24 bg-champagne/20" />
                      </td>
                    </tr>
                  ))
                : rates.map((rate) => (
                    <tr key={rate.karat} className="border-b border-gold/15">
                      <th scope="row" className="py-4 font-display text-xl font-normal text-ivory">
                        {rate.karat}
                      </th>
                      <td className="nums py-4 text-right text-sm text-champagne">
                        {rate.perGram.toLocaleString("en-US")}
                      </td>
                      <td className="nums py-4 text-right text-sm text-champagne">
                        {rate.perTola.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </Reveal>

        <p className="mt-8 max-w-xl text-xs leading-relaxed text-champagne/60">
          Rates are indicative. Your final price is confirmed against the day's rate at the time of
          purchase, and every piece is weighed in front of you.
          {isError && " Today's published rate could not be loaded — please confirm on WhatsApp."}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link
            to="/gold-rate"
            className="border-b border-gold pb-1 text-[12px] font-semibold uppercase tracking-widest text-gold transition-colors hover:text-champagne"
          >
            Full rate table &amp; calculator
          </Link>
          <a
            href={whatsappLink("Assalam-o-Alaikum, please confirm today's gold rate.")}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-gold/40 pb-1 text-[12px] font-semibold uppercase tracking-widest text-champagne/80 transition-colors hover:text-gold"
          >
            Confirm on WhatsApp
          </a>
        </div>
        <span className="sr-only">{SITE.whatsappDisplay}</span>
      </div>
    </section>
  );
}
