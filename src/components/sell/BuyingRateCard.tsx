import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { BUY_KARAT, formatRateStamp, rateFor, type RateSnapshot } from "@/lib/rates";

/**
 * The figure the page exists to show: what the shop pays today.
 *
 * Read from the same published snapshot as every other rate on the site, never
 * from a number of its own. Where the day's buying rate has not been
 * published, it says so and offers to send it — a stale or borrowed figure in
 * this card would misquote the one person who came here to be quoted.
 *
 * Server-rendered with the page, so the figure is in the HTML on arrival and
 * nothing moves when it loads.
 */
export function BuyingRateCard({
  snapshot,
  whatsappHref,
}: {
  snapshot: RateSnapshot;
  whatsappHref: string;
}) {
  const rate = rateFor(snapshot, BUY_KARAT);

  return (
    <aside
      aria-labelledby="buying-rate-title"
      className="relative border border-gold/70 bg-ivory p-6 text-ink shadow-[0_30px_70px_-30px_rgb(0_0_0/0.6)] sm:p-9"
    >
      {/* An inner hairline, the way a certificate is framed. */}
      <div
        className="pointer-events-none absolute inset-2 border border-gold/25"
        aria-hidden="true"
      />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rate-gold-deep">
          The 20K rate · paid for jewellery
        </p>
        <h2
          id="buying-rate-title"
          className="mt-3 font-display text-[28px] font-light leading-tight text-primary sm:text-[32px]"
        >
          Today&rsquo;s Gold Buying Rate
        </h2>

        {rate ? (
          <div className="mt-6 border-y border-gold/30 py-6">
            <p className="nums font-display text-[44px] font-normal leading-none text-primary sm:text-[52px]">
              Rs. {rate.perGram.toLocaleString("en-US")}
              <span className="ml-2 font-sans text-base font-normal text-ink/70">
                <span aria-hidden="true">/</span>
                <span className="sr-only">per</span> gram
              </span>
            </p>
            <p className="nums mt-3 text-lg text-ink">
              Rs. {rate.perTola.toLocaleString("en-US")}
              <span className="ml-1.5 text-base text-ink/70">
                <span aria-hidden="true">/</span>
                <span className="sr-only">per</span> tola
              </span>
            </p>
          </div>
        ) : (
          <p className="mt-6 border-y border-gold/30 py-6 font-display text-2xl font-light text-primary">
            Ask us for today&rsquo;s figure — we will send it on WhatsApp.
          </p>
        )}

        {snapshot.date ? (
          <p className="nums mt-4 text-sm text-ink/75">
            Updated{" "}
            <time dateTime={snapshot.publishedAt ?? snapshot.date}>
              {formatRateStamp(snapshot)}
            </time>
          </p>
        ) : null}

        <p className="mt-2 text-sm leading-relaxed text-ink/75">
          Final value is confirmed after purity testing and weighing at the shop.
        </p>

        <div className="mt-7 grid gap-3">
          <ActionLink href="#calculator" className="w-full">
            Calculate My Gold Value
          </ActionLink>
          <ActionLink
            variant="outline"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp Us
          </ActionLink>
        </div>

        <Link
          to="/gold-rate-in-mandi-bahauddin-today"
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-rate-gold-deep hover:underline"
        >
          See today&rsquo;s full gold rate board
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
