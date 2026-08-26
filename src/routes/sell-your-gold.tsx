import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  ChevronRight,
  IdCard,
  Landmark,
  Repeat,
  ReceiptText,
  Scale,
  Search,
  Wallet,
} from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

import {
  fetchRateSnapshot,
  formatRateStamp,
  goldOnly,
  rateFor,
  FALLBACK_SNAPSHOT,
  type RateSnapshot,
} from "@/lib/rates";
import { SITE, STORES, directionsUrl, whatsappLink } from "@/lib/site";

/**
 * Selling gold to the shop.
 *
 * The counterpart to the catalogue: people in this market walk in to sell as
 * often as to buy, and until now the site said nothing about it beyond one line
 * on the policies page.
 *
 * Deliberately quotes **no** price for what the shop pays. Every piece is
 * tested and weighed first, and publishing a formula — "the rate minus five
 * percent" — would commit the shop at the counter to a number it has not
 * agreed to. What it does publish is the day's open gold rate, which is public
 * and already on this site, so a seller can arrive knowing what gold is worth
 * before anyone quotes them anything. That is the honest version of what this
 * kind of page usually promises.
 */

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I would like to sell some gold jewellery. Could you tell me what it is worth?";

export const Route = createFileRoute("/sell-your-gold")({
  // Server-loaded, like /gold-rate: the day's rate is the reason to read this
  // page, so it belongs in the HTML rather than arriving after paint.
  loader: () => fetchRateSnapshot(),
  head: () => {
    const title = `Sell Your Gold for Cash — ${SITE.name}, Mandi Bahauddin`;
    const description =
      "Sell gold jewellery to Al-Madina Jewellers in Sarafa Market, Mandi Bahauddin. Tested and weighed in front of you against the day's rate, then paid in cash, by bank transfer, or exchanged against a new piece.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/sell-your-gold` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/sell-your-gold` }],
    };
  },
  component: SellYourGoldPage,
  // The rate is a nicety here, not the subject — unlike /gold-rate, this page
  // is still worth reading if it fails to load.
  errorComponent: () => <SellYourGoldPage snapshot={FALLBACK_SNAPSHOT} />,
});

const STEPS = [
  {
    icon: ReceiptText,
    title: "Bring the piece in",
    body: "Come to the shop with whatever you would like to sell, and bring your CNIC — we cannot complete a purchase without it. If you bought the piece from us, bring the bill too: it entitles you to our lifetime buy-back. Nothing needs an appointment.",
  },
  {
    icon: Search,
    title: "We test and weigh it",
    body: "Purity is checked and the piece is weighed on the counter scale in front of you. You see the karat and the weight we are working from before any figure is mentioned.",
  },
  {
    icon: Wallet,
    title: "We quote, you decide",
    body: "We quote against the day's gold rate and explain how we got there. Take it or leave it — there is no obligation, and nothing is kept back if you would rather not sell.",
  },
];

const PAYMENT = [
  {
    icon: Banknote,
    title: "Cash",
    body: "Paid at the counter, there and then.",
  },
  {
    icon: Landmark,
    title: "Bank transfer",
    body: "Sent to your account if you would rather not carry it.",
  },
  {
    icon: Repeat,
    title: "Exchange",
    body: "Put the value straight towards a new piece instead of taking payment.",
  },
];

const FAQS = [
  {
    q: "Do I need the original bill to sell my gold?",
    a: "Not to sell it — but you do need your CNIC, whatever the piece is. The bill matters only for gold bought from Al-Madina, where it entitles you to our lifetime buy-back against the day's rate, less the making charges, which are not returned. Gold bought anywhere else needs no bill.",
  },
  {
    q: "Do I need to bring my CNIC?",
    a: "Yes. We need your CNIC to buy gold from you, whether the piece came from us or from anywhere else. Please bring it with you — without it we cannot complete the purchase, whatever the piece is worth.",
  },
  {
    q: "What if I bought the jewellery somewhere else?",
    a: "That is fine. We test the purity and weigh the piece in front of you, then quote against the day's gold rate. You are under no obligation to accept.",
  },
  {
    q: "How much will you pay for my gold?",
    a: "We do not publish a fixed figure, because it depends on the purity and weight of the specific piece, both of which are established in front of you first. What we can tell you in advance is the open gold rate for the day, which is published on this website and updated by the shop.",
  },
  {
    q: "Do you buy broken or old jewellery?",
    a: "Yes. Gold is valued on its purity and weight, so a broken chain or a single earring is worth what the gold in it is worth. It does not need to be wearable or a complete set.",
  },
  {
    q: "Do you buy silver or diamond jewellery?",
    a: "This service is for gold. Silver and stone-set pieces are assessed differently, so ask us at the shop or on WhatsApp before making the trip for those.",
  },
  {
    q: "How long does it take?",
    a: "Usually a few minutes. Testing and weighing happen at the counter while you wait, and payment follows straight away.",
  },
];

function SellYourGoldPage({ snapshot: override }: { snapshot?: RateSnapshot }) {
  // The error path renders this component directly with a fallback snapshot,
  // where there is no loader data to read.
  const loaded = Route.useLoaderData({ select: (d) => d as RateSnapshot | undefined });
  const snapshot = override ?? loaded ?? FALLBACK_SNAPSHOT;

  const gold = goldOnly(snapshot);
  const headline = rateFor(snapshot, "22K") ?? gold[0];

  const store = STORES[0];
  const phone = SITE.phones[0];

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <BreadcrumbSchema trail={[{ name: "Sell Your Gold", path: "/sell-your-gold" }]} />
      <FaqSchema />

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
                  Sell Your Gold
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Sell your gold
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-champagne/80">
              Bring your gold to Sarafa Market and we will test it, weigh it in front of you and
              quote against the day's rate. Take it in cash, by bank transfer, or put it towards
              something new. No appointment, and no obligation to sell.
            </p>

            {/*
              High on the page on purpose. Someone can read the opening
              paragraph, decide to come in, and never reach the FAQ — and
              arriving without a CNIC means the trip was wasted.
            */}
            <p className="mt-6 inline-flex items-start gap-2.5 border border-gold/50 bg-primary-deep/40 px-4 py-3 text-sm text-champagne">
              <IdCard
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span>
                <span className="font-semibold text-ivory">Please bring your CNIC.</span> We cannot
                buy gold without it.
              </span>
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ActionLink
                href={whatsappLink(WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Ask on WhatsApp
              </ActionLink>
              {phone ? (
                <ActionLink variant="ghostLight" href={`tel:${phone.replace(/\s/g, "")}`}>
                  Call {phone}
                </ActionLink>
              ) : null}
            </div>
          </div>
        </section>

        {/* Today's rate — the one number this page will commit to */}
        <section className="border-b border-gold/25 bg-champagne/25 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-warmgrey">
                Today's gold rate
              </p>
              {headline ? (
                <p className="nums mt-2 font-display text-3xl font-light text-primary sm:text-4xl">
                  {headline.karat} · Rs. {headline.perTola.toLocaleString("en-US")}
                  <span className="ml-2 text-base text-warmgrey">per tola</span>
                </p>
              ) : null}
              <p className="nums mt-2 text-xs text-warmgrey">
                {snapshot.date ? `Updated ${formatRateStamp(snapshot)}` : "Indicative rate"}
              </p>
            </div>

            <div className="max-w-md">
              <p className="text-sm leading-relaxed text-ink">
                This is what gold trades at today — the same rate we sell against. What we pay for
                your piece depends on its purity and weight, which we establish with you at the
                counter before quoting.
              </p>
              <Link
                to="/gold-rate"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-primary underline-offset-4 transition-colors hover:text-gold hover:underline"
              >
                See all karats and the calculator
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Two paths */}
        <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Two ways this works"
            title="Ours, or anyone's"
            description="How we handle a piece depends on where it came from. Both are welcome; only one of them comes with a promise we made you at the time of sale."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Reveal className="border border-gold bg-champagne/30 p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-warmgrey">
                Bought from Al-Madina
              </p>
              <h3 className="mt-3 font-display text-2xl font-light tracking-wide text-primary">
                Lifetime buy-back
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ink">
                Every piece we sell carries a lifetime buy-back against the gold rate on the day you
                return it. Bring the piece and the bill to {SITE.address} — the weight is already on
                the bill, so there is little to establish.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-warmgrey">
                Making charges are not returned — that is standard across the trade, and we would
                rather say it here than at the counter. The full terms are on our{" "}
                <Link
                  to="/policies"
                  className="text-primary underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  buy-back page
                </Link>
                .
              </p>
            </Reveal>

            <Reveal className="border border-gold/40 bg-card p-8" delay={80}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-warmgrey">
                Bought elsewhere
              </p>
              <h3 className="mt-3 font-display text-2xl font-light tracking-wide text-primary">
                Tested, weighed, quoted
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ink">
                Gold from another shop, inherited pieces, or something you have had for years — all
                the same to us. We check the purity, weigh it on the counter scale where you can see
                it, and quote against the day's rate.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-warmgrey">
                No bill needed — bring your CNIC and the piece. You are free to walk away with it if
                the figure is not for you.
              </p>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              tone="light"
              eyebrow="At the counter"
              title="How it works"
              description="Three steps, usually a few minutes, and nothing happens out of your sight."
            />

            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 90}>
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/50 text-gold">
                    <step.icon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
                  </span>
                  <p className="nums mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-light tracking-wide text-ivory">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-champagne/80">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Payment */}
        <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="However suits you"
            title="Three ways to take it"
            description="Decide once the figure is agreed. You are not committed to any of these by walking in."
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {PAYMENT.map((option, i) => (
              <Reveal
                key={option.title}
                className="border border-gold/40 bg-card p-7"
                delay={i * 80}
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-champagne/40 text-primary">
                  <option.icon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl font-light tracking-wide text-primary">
                  {option.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgrey">{option.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 flex items-start gap-3 border border-gold/30 bg-champagne/20 p-6">
            <Scale
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              strokeWidth={1.4}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-ink">
              <span className="font-semibold">This service is for gold.</span> Silver and stone-set
              pieces are valued differently — ask us on WhatsApp before making the trip for those,
              and we will tell you honestly whether it is worth your while.
            </p>
          </Reveal>
        </section>

        {/* Why here */}
        <section className="band-y bg-champagne/30 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Why sell to us"
              title="The scale is on your side of the counter"
              description="Al-Madina has bought and sold gold in Sarafa Market since 1980. The people who weigh your piece are the family whose name is above the door."
            />

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {[
                {
                  title: "Weighed in front of you",
                  body: "The same rule we apply when you buy: nothing is weighed in a back room. You watch the scale and you see the karat.",
                },
                {
                  title: "The day's published rate",
                  body: "We quote against the rate published on this website, which the shop updates itself. You can check it before you arrive.",
                },
                {
                  title: "Since 1980",
                  body: `${SITE.founder} opened this shop after years of hard struggle, and it has stayed in the family and in the same market ever since.`,
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 90}>
                  <h3 className="font-display text-xl font-light tracking-wide text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink">{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-y mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Before you come in" title="Common questions" />

          <dl className="mt-14 divide-y divide-gold/25 border-y border-gold/25">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} className="py-7" delay={i * 60}>
                <dt className="font-display text-xl font-light tracking-wide text-primary">
                  {faq.q}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-warmgrey">{faq.a}</dd>
              </Reveal>
            ))}
          </dl>
        </section>

        {/* Visit */}
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-light tracking-wide text-ivory sm:text-4xl">
              Come and see what it is worth
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-champagne/80">
              {store?.address ?? SITE.address}
              <br />
              {store?.hours}
            </p>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ActionLink
                href={whatsappLink(WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Ask on WhatsApp
              </ActionLink>
              <ActionLink
                variant="ghostLight"
                href={directionsUrl(store?.mapQuery ?? SITE.address, store?.placeId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </ActionLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

/** FAQPage schema — these answers can surface directly in search results. */
function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Our own copy, serialised. No user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
