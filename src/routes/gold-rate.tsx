import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

import {
  FALLBACK_SNAPSHOT,
  GOLD_KARATS,
  rateBoard,
  TOLA_IN_GRAMS,
  fetchRateHistory,
  fetchRateSnapshot,
  formatRateDate,
  formatRateStamp,
  goldOnly,
  rateFor,
  type RateSnapshot,
} from "@/lib/rates";
import { SITE, formatPKR, whatsappLink } from "@/lib/site";
import { rateShareMessage, shareOnWhatsApp } from "@/lib/share";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gold-rate")({
  // Loaded server-side: this page is the recurring-traffic magnet in this
  // market, so the rates have to be in the HTML, not fetched after paint.
  loader: () => fetchRateSnapshot(),
  head: ({ loaderData }) => {
    const gold = loaderData ? goldOnly(loaderData) : [];
    const k22 = gold.find((r) => r.karat === "22K");
    const stamp = loaderData?.date ? formatRateDate(loaderData.date) : "today";

    const title = `Gold Rate in Mandi Bahauddin — Piece, Pathor, Jewellery & Silver · ${SITE.name}`;
    const description = k22
      ? `Gold rate in Mandi Bahauddin ${stamp}: jewellery gold (22k) Rs. ${k22.perTola.toLocaleString("en-US")} per tola, Rs. ${k22.perGram.toLocaleString("en-US")} per gram. Piece, pathor, jewellery and silver rates, with a gram-to-rupee calculator.`
      : "Today's piece, pathor, jewellery and silver rates in Mandi Bahauddin, per tola and per gram in PKR, with a gold value calculator.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/gold-rate` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/gold-rate` }],
    };
  },
  component: GoldRatePage,
  errorComponent: RateError,
});

function GoldRatePage() {
  const snapshot = Route.useLoaderData();
  const gold = goldOnly(snapshot);
  const board = rateBoard(snapshot);

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Banner */}
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Gold Rate
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Today's Gold Rate in Mandi Bahauddin
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              Piece, pathor, jewellery and silver, in Pakistani rupees per gram and per tola. We
              price every piece against the rate on the day you buy.
            </p>

            {/* Large last-updated stamp */}
            <p className="nums mt-8 font-display text-2xl font-light text-gold">
              {snapshot.date ? `Updated ${formatRateStamp(snapshot)}` : "Indicative rates"}
            </p>
          </div>
        </section>

        {/* Rate table */}
        <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <caption className="sr-only">
                Gold rates per gram and per tola in Pakistani rupees
              </caption>
              <thead>
                <tr className="border-b border-gold text-[11px] uppercase tracking-[0.2em] text-warmgrey">
                  <th scope="col" className="py-4 font-medium">
                    Rate
                  </th>
                  <th scope="col" className="py-4 text-right font-medium">
                    Per Gram
                  </th>
                  <th scope="col" className="py-4 text-right font-medium">
                    Per Tola
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.map((row) => (
                  <tr key={row.karat} className="border-b border-gold/20">
                    <th scope="row" className="py-5 text-left">
                      <span className="font-display text-2xl font-light tracking-wide text-primary">
                        {row.name}
                      </span>{" "}
                      {/* The purity, small: it settles the question without
                          being the thing anyone reads first. */}
                      <span className="nums ml-1 align-middle text-[11px] font-medium lowercase tracking-widest text-warmgrey">
                        {row.mark}
                      </span>
                    </th>
                    <td className="nums py-5 text-right text-base text-ink">
                      {row.rate ? `Rs. ${row.rate.perGram.toLocaleString("en-US")}` : "—"}
                    </td>
                    <td className="nums py-5 text-right text-base font-semibold text-ink">
                      {row.rate ? `Rs. ${row.rate.perTola.toLocaleString("en-US")}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-8 max-w-2xl text-xs leading-relaxed text-warmgrey">
              One tola equals {TOLA_IN_GRAMS} grams. Rates are indicative and move through the day.
              Your final price is confirmed against the rate at the time of purchase, and every
              piece is weighed in front of you before it is billed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {/* Share first: this is the page the shop forwards every morning. */}
              <ActionLink
                href={shareOnWhatsApp(rateShareMessage(snapshot))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Share today's rate
              </ActionLink>
              <ActionLink
                variant="outline"
                href={whatsappLink("Assalam-o-Alaikum, please confirm today's gold rate.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Confirm on WhatsApp
              </ActionLink>
            </div>
          </Reveal>
        </section>

        <Calculator snapshot={snapshot} />
        <RateHistory />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

/** Grams or tola in, estimated metal value out. */
function Calculator({ snapshot }: { snapshot: RateSnapshot }) {
  const [amount, setAmount] = useState("10");
  const [unit, setUnit] = useState<"g" | "tola">("g");
  const [karat, setKarat] = useState<string>("22K");

  const rate = rateFor(snapshot, karat) ?? rateFor(FALLBACK_SNAPSHOT, karat);

  const result = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !rate) return null;

    const grams = unit === "g" ? parsed : parsed * TOLA_IN_GRAMS;
    return {
      grams,
      tolas: grams / TOLA_IN_GRAMS,
      // Priced off the rate for the unit the customer typed in. Going via
      // per-gram for a tola input would land a rupee or two off the published
      // per-tola figure, and that is exactly the arithmetic buyers check.
      value: Math.round(unit === "tola" ? parsed * rate.perTola : grams * rate.perGram),
    };
  }, [amount, unit, rate]);

  return (
    <section className="section-y bg-champagne/25">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Calculator"
          title="What is my gold worth?"
          description="Enter a weight and choose a purity. This gives the metal value only — making charges and any stones are additional."
        />

        <div className="mt-12 border border-gold/40 bg-ivory p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <label className="sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                Weight
              </span>
              <input
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="nums mt-2 w-full border border-gold/50 bg-transparent px-3 py-2.5 text-base text-ink focus-visible:border-gold focus-visible:outline-none"
              />
            </label>

            <div className="sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                Unit
              </span>
              <div className="mt-2 flex" role="group" aria-label="Weight unit">
                {(["g", "tola"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    aria-pressed={unit === u}
                    className={cn(
                      "flex-1 border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-colors",
                      unit === u
                        ? "border-gold bg-gold text-primary"
                        : "border-gold/50 text-ink hover:bg-champagne/40",
                    )}
                  >
                    {u === "g" ? "Grams" : "Tola"}
                  </button>
                ))}
              </div>
            </div>

            <label className="sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                Purity
              </span>
              <select
                value={karat}
                onChange={(e) => setKarat(e.target.value)}
                className="mt-2 w-full border border-gold/50 bg-transparent px-3 py-2.5 text-base text-ink focus-visible:border-gold focus-visible:outline-none"
              >
                {GOLD_KARATS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8 border-t border-gold/30 pt-6">
            {result && rate ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                  Estimated gold value
                </p>
                <p className="nums mt-3 font-display text-4xl font-light tracking-wide text-primary">
                  {formatPKR(result.value)}
                </p>
                <p className="nums mt-3 text-xs text-warmgrey">
                  {result.grams.toFixed(3)} g · {result.tolas.toFixed(3)} tola · at Rs.{" "}
                  {rate.perGram.toLocaleString("en-US")} per gram for {karat}
                </p>
              </>
            ) : (
              <p className="text-sm text-warmgrey">Enter a weight above to see an estimate.</p>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-warmgrey">
          This figure is the metal value at today's indicative rate. A finished piece also carries
          making charges for the workshop's labour, plus the value of any stones. For an exact quote
          on a specific piece, send us the design on WhatsApp.
        </p>
      </div>
    </section>
  );
}

/** Recent published days. Renders nothing until a second day exists. */
function RateHistory() {
  const { data } = useQuery({
    queryKey: ["gold-rate-history"],
    queryFn: () => fetchRateHistory(10),
    staleTime: 5 * 60 * 1000,
  });

  const history = (data ?? []).filter((s) => s.rates.length > 0);
  if (history.length < 2) return null;

  return (
    <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="History"
        title="Recent Rates"
        description="Per tola, in Pakistani rupees."
        align="left"
      />

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-gold text-[11px] uppercase tracking-[0.2em] text-warmgrey">
              <th scope="col" className="py-4 font-medium">
                Date
              </th>
              {GOLD_KARATS.map((k) => (
                <th key={k} scope="col" className="py-4 text-right font-medium">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((day) => (
              <tr key={day.date} className="border-b border-gold/20">
                <th scope="row" className="py-4 text-sm font-medium text-ink">
                  {formatRateDate(day.date)}
                </th>
                {GOLD_KARATS.map((k) => {
                  const rate = rateFor(day, k);
                  return (
                    <td key={k} className="nums py-4 text-right text-sm text-ink">
                      {rate ? rate.perTola.toLocaleString("en-US") : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RateError() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />
      <div className="section-y mx-auto max-w-2xl px-4 text-center">
        <h1 className="font-display text-4xl font-light tracking-wide text-primary">
          Today's rate isn't loading
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-warmgrey">
          Ask us on WhatsApp and we will send you the current rate straight away.
        </p>
        <ActionLink
          className="mt-10"
          href={whatsappLink("Assalam-o-Alaikum, please confirm today's gold rate.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ask on WhatsApp
        </ActionLink>
      </div>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
