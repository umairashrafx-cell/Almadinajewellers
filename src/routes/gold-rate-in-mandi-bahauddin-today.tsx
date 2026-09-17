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
import { InternationalGold } from "@/components/rate/InternationalGold";
import { GoldRateBoard } from "@/components/rate/GoldRateBoard";
import { GoldValueCalculator } from "@/components/sell/GoldValueCalculator";

import {
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
import { SITE, whatsappLink } from "@/lib/site";
import { rateShareMessage, shareOnWhatsApp } from "@/lib/share";
import { renderRateCard } from "@/lib/share-card";
import { ShareCardButton } from "@/components/ui/ShareCardButton";
import { CopyTextButton } from "@/components/ui/CopyTextButton";

export const Route = createFileRoute("/gold-rate-in-mandi-bahauddin-today")({
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
        { property: "og:url", content: `${SITE.origin}/gold-rate-in-mandi-bahauddin-today` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/gold-rate-in-mandi-bahauddin-today` }],
    };
  },
  component: GoldRatePage,
  errorComponent: RateError,
});

function GoldRatePage() {
  const snapshot = Route.useLoaderData();
  const gold = goldOnly(snapshot);
  const board = rateBoard(snapshot);
  // One message behind Copy and WhatsApp, so the two can never differ.
  const rateText = rateShareMessage(snapshot);

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

        {/*
          The world price, directly under the shop's own. Placed here rather
          than lower down because the comparison is the argument: the board
          above is not a number the shop invented.
        */}
        <InternationalGold />

        {/* Rate table */}
        <section className="section-y mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/*
            The board itself, not a table of it.

            Introduced in full, wordmark and creed included, at the shop's
            asking. It repeats the page heading above, which is the trade: the
            board reads as a complete object — the same one that goes out on
            WhatsApp — rather than as a fragment of the page around it.
          */}
          <Reveal>
            <GoldRateBoard snapshot={snapshot} />
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-8 max-w-2xl text-xs leading-relaxed text-warmgrey">
              One tola equals {TOLA_IN_GRAMS} grams. Rates are indicative and move through the day.
              Your final price is confirmed against the rate at the time of purchase, and every
              piece is weighed in front of you before it is billed.
            </p>
            {/*
              Four actions: the row wraps rather than squeezing each label onto
              two lines.
            */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:[&>*]:whitespace-nowrap">
              {/* Share first: this is the page the shop forwards every morning. */}
              <ActionLink
                href={shareOnWhatsApp(rateText)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Share today's rate
              </ActionLink>
              <CopyTextButton text={rateText} label="Copy rates" />
              {/*
                The same board as a picture, for a status or a broadcast list
                where nobody reads a table.
              */}
              {/*
                The caption is the address and nothing else. Every figure is
                already in the picture, and a message that repeats them arrives
                as a wall of text under an image that had already said it.
              */}
              <ShareCardButton
                render={() => renderRateCard(snapshot)}
                title="Today's Gold Rate"
                text={`${SITE.origin}/gold-rate-in-mandi-bahauddin-today`}
                filename={`al-madina-gold-rate-${snapshot.date}.jpg`}
                className="border border-gold bg-transparent text-ink hover:bg-champagne/50"
              />
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

/**
 * Grams or tola in, estimated metal value out.
 *
 * The sell page's calculator on the board's side of the counter: the same
 * layout and arithmetic, valued at the rates published above rather than the
 * buying rate.
 */
function Calculator({ snapshot }: { snapshot: RateSnapshot }) {
  return (
    <section
      id="calculator"
      className="section-y scroll-mt-24 bg-champagne/15 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          strong
          eyebrow="Gold value calculator"
          title="What is my gold worth?"
          description="Enter a weight and choose a purity for the metal value at today's rate."
        />

        <GoldValueCalculator snapshot={snapshot} side="buy" />

        <p className="mx-auto mt-6 max-w-3xl text-center text-[13px] leading-relaxed text-ink/80">
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
