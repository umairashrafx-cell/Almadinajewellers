import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  FlaskConical,
  Gem,
  Hand,
  ReceiptText,
  ScrollText,
  TrendingUp,
} from "lucide-react";

import { CtaBand } from "@/components/page/CtaBand";
import { FaqSection } from "@/components/page/Faq";
import { PageHero } from "@/components/page/PageHero";
import { PageShell } from "@/components/page/PageShell";
import { PointGrid, type PointItem } from "@/components/page/PointGrid";
import { StepList, type StepItem } from "@/components/page/StepList";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { faqTopic } from "@/lib/faq";
import {
  BUY_KARAT,
  FALLBACK_SNAPSHOT,
  fetchRateSnapshot,
  formatRateStamp,
  rateFor,
  type RateSnapshot,
} from "@/lib/rates";
import { SITE, whatsappLink } from "@/lib/site";

const PATH = "/buy-back-exchange";

export const Route = createFileRoute("/buy-back-exchange")({
  // Server-side, so today's buying rate is in the HTML on arrival.
  loader: () => fetchRateSnapshot(),
  head: () => {
    const title = `Gold Buy-Back & Exchange — ${SITE.name}`;
    const description =
      "Lifetime buy-back on what we sell, at the 20K rate on the day you return. Exchange old gold against a new piece, or sell gold bought elsewhere — tested and weighed in front of you in Mandi Bahauddin.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}${PATH}` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}${PATH}` }],
    };
  },
  component: BuyBackPage,
  // The page is still useful without today's figure; it says so rather than
  // failing.
  errorComponent: () => <BuyBackPage snapshot={FALLBACK_SNAPSHOT} />,
});

/**
 * Buy-back and exchange.
 *
 * Every statement restates the policies, the Sell Your Gold page and Our Story.
 * The rate shown is the shop's own published 20K figure, never a number of this
 * page's; when it has not been published the card says so.
 */

const OPTIONS: { title: string; body: string; icon: typeof Banknote }[] = [
  {
    title: "Buy-back",
    body: "Sell a piece back to us. It is valued at the day's 20K rate against its weight, and paid in cash at the counter or by bank transfer to your account.",
    icon: Banknote,
  },
  {
    title: "Exchange",
    body: "Move to something new. Your piece is valued at the day's rate in the same way and set against the price of whatever you are moving to.",
    icon: ArrowLeftRight,
  },
];

const STEPS: StepItem[] = [
  {
    title: "Bring the piece",
    body: "With your CNIC — we cannot buy gold without it. If the piece is ours, bring the bill too.",
    icon: Gem,
  },
  {
    title: "Tested & weighed",
    body: "Purity is tested and the piece weighed on the counter scale, in front of you. It usually takes a few minutes.",
    icon: FlaskConical,
  },
  {
    title: "Quoted at today's rate",
    body: "You are quoted the day's 20K buying rate against the weight — the rate the shop publishes on this website each day.",
    icon: TrendingUp,
  },
  {
    title: "Your choice",
    body: "Cash, a bank transfer or an exchange against a new piece. Or say no: there is no obligation, and your gold goes home with you.",
    icon: Hand,
  },
];

const GOOD_TO_KNOW: PointItem[] = [
  {
    title: "The gain is yours",
    body: "Pieces are bought back at the rate on the day you return them, not the day you bought them. If the rate has risen since, that rise is yours.",
    icon: TrendingUp,
  },
  {
    title: "Why the rate is lower",
    body: "The buying rate sits below what the same gold sells at. The difference is the making charge, which cannot come back with the metal: the gold has to be melted and made again before it can be sold as jewellery.",
    icon: ReceiptText,
  },
  {
    title: "Keep your bill",
    body: "It confirms the weight, the karat and the making charge a piece was sold at. It is not required to sell, but it saves time at the counter.",
    icon: ScrollText,
  },
];

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I would like to sell or exchange a gold piece. Please tell me today's buying rate.";

function BuyBackPage({ snapshot: override }: { snapshot?: RateSnapshot }) {
  const loaded = Route.useLoaderData({ select: (d) => d as RateSnapshot | undefined });
  const snapshot = override ?? loaded ?? FALLBACK_SNAPSHOT;
  const buyRate = rateFor(snapshot, BUY_KARAT);

  return (
    <PageShell>
      <PageHero
        title="Buy-back & exchange"
        intro="We buy back what we sell, for as long as we are trading — at the rate on the day you bring it back. Gold from other shops is welcome too."
        trail={[{ name: "Buy-Back & Exchange", path: PATH }]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ActionLink href="/sell-your-gold#calculator">
            Estimate your gold&rsquo;s value
          </ActionLink>
          <ActionLink
            variant="ghostLight"
            href={whatsappLink(WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ask on WhatsApp
          </ActionLink>
        </div>
      </PageHero>

      {/* The two ways, beside today's rate */}
      <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Two ways to use your gold"
              title="Sell it back, or trade it in"
              description="Both start the same way: the piece is tested and weighed in front of you and valued at the day's rate."
              align="left"
              strong
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {OPTIONS.map((option, i) => (
                <Reveal key={option.title} delay={i * 80}>
                  <article className="h-full border border-gold/30 bg-card p-6 shadow-[var(--shadow-soft)]">
                    <option.icon
                      className="h-6 w-6 text-gold"
                      strokeWidth={1.3}
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 font-display text-2xl font-light text-primary">
                      {option.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{option.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={120}>
            <aside
              aria-labelledby="buy-rate-title"
              className="relative border border-gold/60 bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8"
            >
              <div
                className="pointer-events-none absolute inset-2 border border-gold/20"
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-deep">
                  The 20K rate · paid for jewellery
                </p>
                <h2
                  id="buy-rate-title"
                  className="mt-3 font-display text-3xl font-light leading-tight text-primary"
                >
                  Today&rsquo;s buying rate
                </h2>

                {buyRate ? (
                  <div className="mt-6 border-y border-gold/30 py-6">
                    <p className="nums font-display text-5xl font-normal leading-none text-primary">
                      Rs. {buyRate.perTola.toLocaleString("en-US")}
                      <span className="ml-2 font-sans text-base font-normal text-ink/70">
                        <span aria-hidden="true">/</span>
                        <span className="sr-only">per</span> tola
                      </span>
                    </p>
                    <p className="nums mt-3 text-lg text-ink">
                      Rs. {buyRate.perGram.toLocaleString("en-US")}
                      <span className="ml-1.5 text-base text-ink/70">
                        <span aria-hidden="true">/</span>
                        <span className="sr-only">per</span> gram
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 border-y border-gold/30 py-6 font-display text-2xl font-light text-primary">
                    Ask us for today&rsquo;s figure — we will send it on WhatsApp.
                  </p>
                )}

                {buyRate && snapshot.date ? (
                  <p className="nums mt-4 text-sm text-ink/75">
                    Updated{" "}
                    <time dateTime={snapshot.publishedAt ?? snapshot.date}>
                      {formatRateStamp(snapshot)}
                    </time>
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-ink/75">
                  The final figure is confirmed after testing and weighing at the shop.
                </p>

                <Link
                  to="/sell-your-gold"
                  className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-gold-deep hover:underline"
                >
                  Estimate on the Sell Your Gold page
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="section-y bg-champagne/25">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="At the counter"
            title="How it works"
            description="Usually a few minutes from start to finish, and nothing is decided until you have seen the weight and the figure."
            strong
          />
          <div className="mt-14">
            <StepList steps={STEPS} />
          </div>
        </div>
      </section>

      <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Good to know" title="Before you come in" strong />
        <div className="mt-14">
          <PointGrid points={GOOD_TO_KNOW} />
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-ink/75">
          Selling silver or a stone-set piece? These are assessed differently, so ask us on WhatsApp
          before making the trip.
        </p>
      </section>

      <FaqSection topics={[faqTopic("selling")]} name="buy-back-faq" />

      <CtaBand
        eyebrow="Today's figure"
        title="Ask before you make the trip"
        description="Message us on WhatsApp and we will confirm today's buying rate before you make the trip."
        whatsappMessage={WHATSAPP_MESSAGE}
      />
    </PageShell>
  );
}
