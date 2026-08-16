import { Link } from "@tanstack/react-router";
import { goldRates } from "@/data/products";
import { Reveal } from "@/components/ui/Reveal";

const today = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Dark green band with today's per-gram and per-tola rates. */
export function GoldRateStrip() {
  return (
    <section className="bg-primary py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Today's Rates</p>
            <h2 className="mt-3 font-display text-3xl font-light tracking-wide text-ivory sm:text-4xl">
              Live Gold Rate
            </h2>
          </div>
          <p className="text-xs text-champagne/70 nums">Updated {today} · Indicative, PKR</p>
        </Reveal>

        <Reveal delay={80} className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-gold/40 text-[11px] uppercase tracking-[0.2em] text-champagne/70">
                <th scope="col" className="py-3 font-medium">Purity</th>
                <th scope="col" className="py-3 text-right font-medium">Per Gram</th>
                <th scope="col" className="py-3 text-right font-medium">Per Tola</th>
              </tr>
            </thead>
            <tbody>
              {goldRates.map((rate) => (
                <tr key={rate.karat} className="border-b border-gold/15">
                  <th scope="row" className="py-4 font-display text-xl font-normal text-ivory">
                    {rate.karat}
                  </th>
                  <td className="py-4 text-right text-sm text-champagne nums">
                    {rate.perGram.toLocaleString("en-US")}
                  </td>
                  <td className="py-4 text-right text-sm text-champagne nums">
                    {rate.perTola.toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        <Link
          to="/"
          className="mt-8 inline-block border-b border-gold pb-1 text-[12px] font-semibold uppercase tracking-widest text-gold transition-colors hover:text-champagne"
        >
          View full rate history
        </Link>
      </div>
    </section>
  );
}
