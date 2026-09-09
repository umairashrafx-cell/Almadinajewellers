import { BadgeCheck, CalendarDays, Gem, Globe, MapPin, RefreshCcw, TrendingUp } from "lucide-react";

import { RateCard } from "@/components/rate/RateCard";
import { TrustFeature } from "@/components/rate/TrustFeature";
import { formatRateStamp, rateCards, type RateSnapshot } from "@/lib/rates";
import { SITE } from "@/lib/site";

/**
 * The day's board, as a section of the site.
 *
 * The same design as the picture the shop forwards on WhatsApp, built as
 * markup rather than drawn on a canvas — so the figures are selectable,
 * copyable, readable by a screen reader and indexable by Google, and so the
 * whole thing reflows on a phone instead of being scaled down until the small
 * print disappears.
 *
 * Nothing here knows where a rate comes from. It is handed a published
 * snapshot; which metals appear and what they are called is decided by
 * RATE_BOARD, and the figures by whatever the shop last published through
 * /admin/rates. Adding a metal to the board adds a card, with no component to
 * edit and no second place for the numbers to live.
 */
export function GoldRateBoard({
  snapshot,
  /**
   * Whether the board introduces itself.
   *
   * True where it stands alone and has to say whose board it is. False on a
   * page whose own heading already said so — repeating the wordmark two inches
   * under the site's own is how a page starts to look like a brochure that got
   * pasted into itself.
   */
  showBrand = true,
  showFooter = true,
}: {
  snapshot: RateSnapshot;
  showBrand?: boolean | undefined;
  showFooter?: boolean | undefined;
}) {
  const cards = rateCards(snapshot);

  return (
    <section
      aria-labelledby="gold-rate-board-heading"
      className="overflow-hidden rounded-2xl border border-rate-gold/40 bg-rate-ivory shadow-[0_18px_50px_rgb(22_61_52/0.10)]"
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        {showBrand ? (
          <header className="text-center">
            <p className="font-display text-3xl font-normal leading-none tracking-[0.08em] text-rate-emerald sm:text-4xl">
              AL-MADINA
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.42em] text-rate-gold-deep sm:text-xs">
              Jewellers
            </p>

            <div
              className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-rate-gold to-transparent sm:w-56"
              aria-hidden="true"
            />

            {/*
              Wrapped rather than laid out in one line: on a narrow screen
              "TIMELESS BEAUTY" would otherwise push the row into a scroll.
              The separators are drawn by CSS so they cannot be read aloud.
            */}
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-rate-ink/80 sm:text-[11px]">
              {["Trust", "Purity", "Timeless Beauty"].map((word) => (
                <li
                  key={word}
                  className="before:mr-3 before:text-rate-gold-deep before:content-['◆'] first:before:hidden"
                >
                  {word}
                </li>
              ))}
            </ul>
          </header>
        ) : null}

        {/* The banner */}
        <div
          className={`relative overflow-hidden rounded-xl border border-rate-gold/60 bg-gradient-to-br from-rate-emerald to-rate-forest px-5 py-6 text-center shadow-[0_10px_28px_rgb(6_63_50/0.28)] sm:px-8 ${
            showBrand ? "mt-8" : ""
          }`}
        >
          <TrendingUp
            className="absolute left-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 text-rate-gold/90 sm:block"
            strokeWidth={1.6}
            aria-hidden="true"
          />

          <h2
            id="gold-rate-board-heading"
            className="font-display text-3xl font-light leading-tight text-rate-ivory sm:text-4xl"
          >
            Today&rsquo;s <span className="font-semibold text-rate-gold-light">Gold</span> Rate
          </h2>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-rate-ivory/85 sm:text-sm">
            Mandi Bahauddin
          </p>
        </div>

        {/*
          The stamp, in the shop's own clock.

          <time> rather than a plain string, so a machine reading the page can
          tell when this was published rather than guessing from the words.

          It straddles the foot of the banner, which needs saying out loud: the
          negative margin alone put it behind, because the banner is painted
          later and carries a shadow. Positioned and lifted, it sits on top
          where it was meant to.
        */}
        <p className="relative z-10 -mt-5 flex justify-center">
          <time
            dateTime={snapshot.publishedAt ?? snapshot.date}
            className="nums inline-flex items-center gap-2 rounded-full border border-rate-gold/50 bg-gradient-to-b from-rate-gold-light to-rate-gold px-4 py-2 text-xs font-medium text-rate-ink shadow-[0_4px_12px_rgb(22_61_52/0.14)] sm:text-sm"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {formatRateStamp(snapshot)}
          </time>
        </p>

        <ul className="mt-7 grid gap-3 sm:gap-4">
          {cards.map((rate) => (
            <RateCard key={rate.karat} rate={rate} />
          ))}
        </ul>

        <div className="mt-8 text-center">
          <div
            className="mx-auto h-px w-full max-w-md bg-gradient-to-r from-transparent via-rate-gold/60 to-transparent"
            aria-hidden="true"
          />

          <p className="mt-5 text-xs text-rate-ink/80 sm:text-sm">
            Rates are indicative · Per tola, in Pakistani rupees
          </p>

          <p className="mt-3 font-display text-xl italic text-rate-gold-deep sm:text-2xl">
            {SITE.tagline}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 border-t border-rate-gold/25 pt-6 sm:grid-cols-3 sm:gap-6">
          <TrustFeature icon={BadgeCheck}>Hallmarked gold</TrustFeature>
          <TrustFeature icon={Gem}>Since {SITE.founded}</TrustFeature>
          <TrustFeature icon={RefreshCcw}>Lifetime buy-back</TrustFeature>
        </ul>
      </div>

      {showFooter ? (
        <footer className="flex flex-col items-center gap-3 border-t-2 border-rate-gold/70 bg-gradient-to-br from-rate-emerald to-rate-forest px-5 py-5 text-center text-rate-ivory sm:flex-row sm:justify-center sm:gap-8 sm:text-left">
          <a
            href={SITE.origin}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-rate-gold-light"
          >
            <Globe
              className="h-4 w-4 shrink-0 text-rate-gold-light"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            {SITE.origin.replace(/^https?:\/\//, "")}
          </a>

          <span className="hidden h-5 w-px bg-rate-ivory/25 sm:block" aria-hidden="true" />

          <p className="inline-flex items-center gap-2 text-sm text-rate-ivory/90">
            <MapPin
              className="h-4 w-4 shrink-0 text-rate-gold-light"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            Sarafa Market, Mandi Bahauddin
          </p>
        </footer>
      ) : null}
    </section>
  );
}
