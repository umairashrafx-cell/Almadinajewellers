import { createFileRoute, createLink, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  FlaskConical,
  Hand,
  IdCard,
  Landmark,
  MapPin,
  Phone,
  ReceiptText,
  Repeat,
  Scale,
  Store,
  Users,
} from "lucide-react";

import founderPortrait from "@/assets/founder.webp";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { BuyingRateCard } from "@/components/sell/BuyingRateCard";
import { GoldValueCalculator } from "@/components/sell/GoldValueCalculator";
import {
  BangleIcon,
  BrokenGoldIcon,
  ChainIcon,
  EarringIcon,
  NecklaceIcon,
  RingIcon,
} from "@/components/sell/JewelleryIcons";
import { ProcessTimeline, type Step } from "@/components/sell/ProcessTimeline";
import { RateComparison } from "@/components/sell/RateComparison";
import { SellFaq, type Faq } from "@/components/sell/SellFaq";
import { StickySellBar } from "@/components/sell/StickySellBar";

import {
  BUY_KARAT,
  FALLBACK_SNAPSHOT,
  fetchRateSnapshot,
  rateFor,
  type RateSnapshot,
} from "@/lib/rates";
import { SITE, STORES, directionsUrl, placeUrl, reviewUrl, whatsappLink } from "@/lib/site";
import { STORE_SCHEMA_ID, storeSchemaNode } from "@/lib/store-schema";

/**
 * Selling gold to the shop.
 *
 * People in this market walk in to sell as often as to buy, and what they want
 * to know before making the trip is short: what will I get, how do you work it
 * out, can I trust the weighing, what do I bring, and can I say no. The page
 * answers those in that order, with the figure first.
 *
 * It publishes the buying rate, which most pages of this kind will not, and it
 * says why that rate sits below the selling one rather than leaving it to be
 * noticed: it is the melting and the making, and a customer who understands
 * why is not a customer who feels caught out.
 *
 * Every figure on it comes from the one published snapshot the rest of the
 * site reads, loaded with the page. None is typed here.
 */

const PATH = "/sell-your-gold";
const PAGE_URL = `${SITE.origin}${PATH}`;
const TITLE = `Sell Gold in Mandi Bahauddin | ${SITE.name}`;
const DESCRIPTION =
  "Sell old, broken or unwanted gold jewellery in Mandi Bahauddin. Al-Madina Jewellers tests purity, weighs gold in front of you and quotes against today's published buying rate.";

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I would like to sell some gold jewellery. Could you tell me what it is worth?";
const SILVER_MESSAGE =
  "Assalam-o-Alaikum, I have silver or stone-set jewellery I would like to sell. Could you tell me how it is assessed?";

/** The closing section. The phone's sticky bar steps aside when it arrives. */
const CLOSING_ID = "visit";

/** The house button, routed — an internal link should not reload the page. */
const ActionRouteLink = createLink(ActionLink);

export const Route = createFileRoute("/sell-your-gold")({
  // Server-loaded: the day's rate is the reason to open this page, so it
  // belongs in the HTML rather than arriving after paint and shifting the hero.
  loader: () => fetchRateSnapshot(),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: SellYourGoldPage,
  // Still worth reading if the rates fail to load: the process, the terms and
  // the way to reach the shop do not depend on them. The rate card and the
  // calculator say plainly that the figure is unavailable rather than guess.
  errorComponent: () => <SellYourGoldPage snapshot={FALLBACK_SNAPSHOT} />,
});

const HERO_POINTS = [
  "Purity tested",
  "Weight shown in front of you",
  "Today's published rate",
  "No obligation to sell",
];

const TRUST = [
  { title: "Tested", body: "Purity checked before valuation", icon: FlaskConical },
  { title: "Weighed", body: "Weight shown on the counter scale", icon: Scale },
  { title: "Published rate", body: "Check today's rate before visiting", icon: CalendarCheck },
  { title: "No obligation", body: "You decide whether to sell", icon: Hand },
];

const GOLD_WE_BUY = [
  { title: "Gold Rings", body: "Old, unwanted or unused rings.", icon: RingIcon },
  { title: "Gold Chains", body: "Chains of different weights and designs.", icon: ChainIcon },
  { title: "Gold Bangles", body: "Old and unused bangles.", icon: BangleIcon },
  { title: "Gold Necklaces", body: "Complete sets or individual pieces.", icon: NecklaceIcon },
  {
    title: "Broken Gold",
    body: "Broken chains, damaged jewellery and incomplete pieces.",
    icon: BrokenGoldIcon,
  },
  { title: "Single Earrings", body: "Individual or unmatched gold earrings.", icon: EarringIcon },
];

const STEPS: Step[] = [
  {
    title: "Bring Your Gold",
    body: "Bring your gold jewellery and your CNIC. No appointment is needed.",
    icon: IdCard,
  },
  {
    title: "Purity Testing",
    body: "We check the purity of your gold and establish its karat.",
    icon: FlaskConical,
  },
  {
    title: "Open Weighing",
    body: "Your gold is weighed on the counter scale in front of you.",
    icon: Scale,
  },
  {
    title: "Transparent Quote",
    body: "We calculate the value from the current 20K buying rate and the weight and purity established at the counter.",
    icon: ReceiptText,
  },
  {
    title: "You Decide",
    body: "Accept the offer or take your gold back. There is no obligation to sell.",
    icon: Hand,
  },
];

const PAYMENT = [
  { title: "Cash", body: "Paid at the counter after the valuation is agreed.", icon: Banknote },
  {
    title: "Bank Transfer",
    body: "Transferred to your account, if you would rather not carry cash.",
    icon: Landmark,
  },
  { title: "Exchange", body: "Put the value towards a new jewellery piece.", icon: Repeat },
];

const HERITAGE = [
  { label: `Since ${SITE.founded}`, icon: Store },
  { label: "Weighed in front of you", icon: Scale },
  { label: "Published daily rate", icon: CalendarCheck },
  { label: "Family-owned business", icon: Users },
];

/**
 * Photographs of the counter at work, for "See How We Work".
 *
 * Empty until the shop supplies its own. A stock photograph of someone else's
 * scale has no place on a page whose whole argument is that you can watch
 * ours — so there is no placeholder either. Give an entry a src and the
 * section appears with it.
 */
const PROCESS_PHOTOS: { caption: string; alt: string; src?: string }[] = [
  {
    caption: "Purity checked before valuation",
    alt: "Gold being tested for purity at the Al-Madina counter",
  },
  {
    caption: "Weighing happens in front of you",
    alt: "Gold on the counter scale at Al-Madina Jewellers",
  },
  {
    caption: "Sarafa Market, Mandi Bahauddin",
    alt: "The Al-Madina Jewellers shop in Sarafa Market",
  },
];

const FAQS: Faq[] = [
  {
    q: "Do I need my original bill to sell gold?",
    a: "Not to sell it — but you do need your CNIC, whatever the piece is. The bill only saves time: it already carries the weight and the karat, so there is nothing to establish. The rate is the same 20K rate either way, whether the piece came from us or from anywhere else.",
  },
  {
    q: "Do I need my CNIC?",
    a: "Yes. We need your CNIC to buy gold from you, whether the piece came from us or from anywhere else. Please bring it with you — without it we cannot complete the purchase, whatever the piece is worth.",
  },
  {
    q: "Can I sell jewellery bought from another shop?",
    a: "Yes. Gold bought from another jeweller, inherited jewellery and old pieces are all assessed the same way. We test the purity and weigh the piece in front of you, then quote against the day's buying rate. You are under no obligation to accept.",
  },
  {
    q: "How much will you pay for my gold?",
    a: "We buy jewellery at the 20K rate, which is published on this page and moves with the market each day. What you are paid is that rate against the weight of your piece, weighed in front of you. The rate is below what we sell at, and the difference is the melting and the making that has to be done again before the gold can be sold as jewellery.",
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
    q: "How long does the valuation take?",
    a: "Usually a few minutes. Testing and weighing happen at the counter while you wait, and payment follows straight away.",
  },
  {
    q: "Can I refuse the offer?",
    a: "Yes. There is no obligation to sell. If the figure is not for you, your gold goes home with you — nothing is kept back.",
  },
  {
    q: "How is the gold value calculated?",
    a: "The weight of your piece, established on the counter scale in front of you, multiplied by today's buying rate for the purity it tests at. Jewellery sold as 22K is bought at the 20K rate, which is published at the top of this page and updated by the shop itself. The calculator on this page does the same arithmetic as an estimate; the final figure is confirmed at the counter.",
  },
  {
    q: "What payment methods are available?",
    a: "Cash at the counter, a bank transfer to your account, or an exchange against a new piece. You choose once the figure is agreed — walking in commits you to none of them.",
  },
];

function SellYourGoldPage({ snapshot: override }: { snapshot?: RateSnapshot }) {
  // The error path renders this component directly with a fallback snapshot,
  // where there is no loader data to read.
  const loaded = Route.useLoaderData({ select: (d) => d as RateSnapshot | undefined });
  const snapshot = override ?? loaded ?? FALLBACK_SNAPSHOT;

  // What the shop pays, and what it sells jewellery at. Either can be missing
  // on a day the shop has not published it, and every use below allows for
  // that rather than falling back to a figure nobody set.
  const buyRate = rateFor(snapshot, BUY_KARAT);
  const jewelleryRate = rateFor(snapshot, "22K");

  const store = STORES[0]!;
  const phone = SITE.phones[0];
  const whatsapp = whatsappLink(WHATSAPP_MESSAGE);
  // "Sarafa Market" on one line, "Mandi Bahauddin, Punjab, Pakistan" beneath.
  const [street, ...region] = store.address.split(", ");
  const [days, hours] = store.hours.split(", ");
  const photos = PROCESS_PHOTOS.filter((p): p is typeof p & { src: string } => Boolean(p.src));

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <BreadcrumbSchema trail={[{ name: "Sell Your Gold", path: PATH }]} />
      <PageSchema />

      <main>
        {/* Hero: what we do on the left, today's figure on the right. */}
        <section className="relative overflow-hidden bg-primary px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
          <div
            className="pointer-events-none absolute -right-48 -top-48 h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,oklch(0.72_0.1_85/0.18),transparent)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/80">
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

            <div className="mt-8 grid items-center gap-12 lg:mt-12 lg:grid-cols-[1.12fr_1fr] lg:gap-16">
              <div className="rise-in">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">
                  Sell your gold in Mandi Bahauddin
                </p>
                <h1 className="mt-5 font-display text-[42px] font-light leading-[1.05] text-ivory sm:text-6xl lg:text-[64px] xl:text-[72px]">
                  Sell Your Gold at Today&rsquo;s Buying Rate
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-champagne/90 sm:text-lg">
                  Bring your old, broken or unwanted gold jewellery to {SITE.name} in Sarafa Market.
                  We test the purity, weigh it in front of you and explain the valuation before you
                  decide.
                </p>

                <ul className="mt-8 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  {HERO_POINTS.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-3 text-[15px] text-ivory sm:text-base"
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-primary"
                        aria-hidden="true"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                {/*
                  High on the page on purpose. Someone can read this far, decide
                  to come in, and never reach the questions below — and arriving
                  without a CNIC means the trip was wasted.
                */}
                <p className="mt-8 inline-flex items-start gap-3 border border-gold/50 bg-primary-deep/40 px-4 py-3.5 text-[15px] text-champagne">
                  <IdCard
                    className="mt-0.5 h-5 w-5 shrink-0 text-gold"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-semibold text-ivory">Please bring your CNIC.</span> We
                    cannot buy gold without it. No appointment needed.
                  </span>
                </p>
              </div>

              <div className="rise-in" style={{ animationDelay: "140ms" }}>
                <BuyingRateCard snapshot={snapshot} whatsappHref={whatsapp} />
              </div>
            </div>
          </div>
        </section>

        {/*
          The four promises, straight under the fold. Not scroll-revealed: on a
          laptop this is on screen at load, and fading in something already
          visible only makes it look late.
        */}
        <section
          aria-labelledby="confidence-heading"
          className="border-b border-gold/30 bg-ivory px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <h2
              id="confidence-heading"
              className="text-center font-display text-3xl font-light text-primary sm:text-4xl"
            >
              Sell Your Gold with Confidence
            </h2>
            <ol className="mt-10 grid grid-cols-2 border-l border-t border-gold/30 lg:grid-cols-4">
              {TRUST.map((item, i) => (
                <li key={item.title} className="border-b border-r border-gold/30 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-3xl font-light tabular-nums lining-nums text-rate-gold-deep">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <item.icon
                      className="h-6 w-6 text-primary"
                      strokeWidth={1.3}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-snug text-ink/80">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Calculator */}
        <section
          id="calculator"
          className="section-y scroll-mt-24 bg-champagne/15 px-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              strong
              eyebrow="Gold value calculator"
              title="Calculate Your Gold Value"
              description="Get an approximate metal value before visiting the shop."
            />

            <GoldValueCalculator snapshot={snapshot} />

            <p className="mx-auto mt-6 max-w-3xl text-center text-[13px] leading-relaxed text-ink/80">
              This is an estimate based on the selected purity and today&rsquo;s published buying
              rate. Final value is confirmed after testing and weighing your jewellery at the shop.
              Stones, non-gold components and other deductions may affect the final valuation.
            </p>
          </div>
        </section>

        {/* What we buy */}
        <section className="section-y px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              strong
              eyebrow="What we buy"
              title="We Buy All Types of Gold Jewellery"
              description={`${SITE.name} has been a gold buyer in Mandi Bahauddin since ${SITE.founded}. Sell old gold, broken gold jewellery or pieces you no longer wear — gold is valued on its purity and weight, so a piece does not need to be complete, wearable or bought from us.`}
            />

            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {GOLD_WE_BUY.map((item, i) => (
                <Reveal as="li" key={item.title} delay={(i % 3) * 80}>
                  {/*
                    The hover lives on the inner card: Reveal's stagger is a
                    transition delay, and on the same element it would hold
                    back the hover as well.
                  */}
                  <div className="group flex h-full gap-5 border border-gold/35 bg-card p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-gold hover:shadow-[var(--shadow-soft)] motion-reduce:hover:translate-y-0 sm:p-7">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/50 bg-ivory text-primary transition-colors duration-300 group-hover:border-gold group-hover:bg-champagne/40">
                      <item.icon className="h-7 w-7" />
                    </span>
                    <div>
                      <h3 className="font-display text-2xl font-light leading-tight text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink/80">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal className="mt-10 border-l-2 border-gold bg-champagne/15 px-5 py-4">
              <p className="text-[15px] leading-relaxed text-ink/85">
                <span className="font-semibold text-ink">
                  Silver and stone-set jewellery are assessed differently.
                </span>{" "}
                <a
                  href={whatsappLink(SILVER_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-rate-gold-deep"
                >
                  Ask us on WhatsApp
                </a>{" "}
                before visiting.
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
              title="How Selling Your Gold Works"
              description="Simple, transparent and completed at the counter."
            />
            <ProcessTimeline steps={STEPS} />
          </div>
        </section>

        {/* Why the two rates differ */}
        <section className="section-y px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              strong
              eyebrow="Two rates, one reason"
              title="Why Is the Buying Rate Different From the Jewellery Rate?"
              description="When jewellery is sold back, the gold has to be tested, melted and prepared again before it can become jewellery. Making and workshop costs cannot be recovered as gold."
            />

            {jewelleryRate && buyRate ? (
              <Reveal>
                <RateComparison jewellery={jewelleryRate} buying={buyRate} />
              </Reveal>
            ) : null}

            <Reveal className="mx-auto mt-10 max-w-2xl text-center">
              <p className="font-display text-2xl font-light italic leading-snug text-primary">
                The difference reflects the work required to turn old jewellery back into usable
                metal and remake it.
              </p>
              <Link
                to="/gold-rate-in-mandi-bahauddin-today"
                className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-rate-gold-deep hover:underline"
              >
                Today&rsquo;s gold rate in Mandi Bahauddin
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Ours, or anyone's */}
        <section className="section-y bg-champagne/15 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              strong
              eyebrow="Ours, or anyone's"
              title="Two Types of Gold We Buy"
              description="The rate is the same either way. What differs is how much has to be established at the counter — a piece with our bill arrives already weighed."
            />

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <Reveal className="flex flex-col border border-gold bg-ivory p-7 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rate-gold-deep">
                  Bought from Al-Madina
                </p>
                <h3 className="mt-3 font-display text-3xl font-light text-primary">
                  Lifetime Buy-Back
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-ink/85">
                  Every piece we sell carries a lifetime buy-back, at the 20K rate on the day you
                  return it rather than the day you bought it. Bring the piece and the bill to{" "}
                  {SITE.name} — the weight is already on the bill, so there is nothing to establish
                  and nothing to argue about.
                </p>
                <div className="mt-auto pt-8">
                  <ActionRouteLink to="/policies" hash="exchange" variant="outline">
                    View Buy-Back Terms
                  </ActionRouteLink>
                </div>
              </Reveal>

              <Reveal
                delay={80}
                className="flex flex-col border border-gold/40 bg-card p-7 sm:p-10"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rate-gold-deep">
                  Bought somewhere else
                </p>
                <h3 className="mt-3 font-display text-3xl font-light text-primary">
                  Tested, Weighed &amp; Quoted
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-ink/85">
                  Gold purchased from another jeweller, inherited jewellery and old jewellery can
                  all be assessed. We check the purity, weigh it on the counter scale where you can
                  see it, and quote against the day&rsquo;s rate.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "No original Al-Madina bill is required.",
                    "Your CNIC is required.",
                    "You can decline the quote and take your gold back.",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-3 text-[15px] text-ink/85">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="section-y px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              strong
              eyebrow="However suits you"
              title="Choose How You Receive Your Value"
              description="Decide once the figure is agreed. You are not committed to any of these by walking in."
            />

            <ul className="mt-14 grid gap-4 md:grid-cols-3 lg:gap-6">
              {PAYMENT.map((option, i) => (
                <Reveal as="li" key={option.title} delay={i * 80}>
                  <div className="h-full border border-gold/40 bg-card p-7 text-center transition-[border-color,box-shadow] duration-300 hover:border-gold hover:shadow-[var(--shadow-soft)] sm:p-8">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-champagne/40 text-primary">
                      <option.icon className="h-6 w-6" strokeWidth={1.3} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                      {option.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{option.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/*
          Heritage. The portrait is the founder's own, supplied by the family —
          the one authentic photograph of the business in the project, and the
          right one for a section about whose name is above the door.
        */}
        <section className="relative overflow-hidden bg-primary-deep px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <Reveal>
              <figure className="mx-auto w-full max-w-sm lg:max-w-md">
                {/*
                  The offset frame belongs to the photograph alone. Drawn around
                  the whole figure, its edge ran through the caption.
                */}
                <div className="relative">
                  <div
                    className="absolute inset-0 translate-x-3 translate-y-3 border border-gold/40 sm:translate-x-4 sm:translate-y-4"
                    aria-hidden="true"
                  />
                  <img
                    src={founderPortrait}
                    alt={`${SITE.founder}, who founded ${SITE.name} in ${SITE.founded}`}
                    width={1160}
                    height={1356}
                    loading="lazy"
                    decoding="async"
                    className="relative aspect-[1160/1356] w-full object-cover"
                  />
                </div>
                <figcaption className="mt-8 text-sm leading-relaxed text-champagne/85">
                  {SITE.founder}, who opened the shop in Sarafa Market in {SITE.founded}.{" "}
                  <Link
                    to="/our-story/founder"
                    className="text-gold underline-offset-4 transition-colors hover:text-rate-gold-light hover:underline"
                  >
                    Read his story
                  </Link>
                </figcaption>
              </figure>
            </Reveal>

            <div>
              <SectionHeading
                tone="light"
                align="left"
                eyebrow={`Since ${SITE.founded}`}
                title="The Scale Is On Your Side of the Counter"
              />
              <Reveal>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-champagne/90 sm:text-lg">
                  {SITE.name} has bought and sold gold in Sarafa Market since {SITE.founded}. The
                  same principle has stayed with us: weigh it openly, explain the rate and let the
                  customer decide.
                </p>

                <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
                  {HERITAGE.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-3 border border-gold/25 bg-primary/40 p-4"
                    >
                      <item.icon
                        className="h-5 w-5 shrink-0 text-gold"
                        strokeWidth={1.4}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium leading-snug text-ivory">
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/our-story"
                  className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:text-rate-gold-light"
                >
                  Our story
                  <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {photos.length > 0 ? (
          <section className="section-y px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <SectionHeading strong eyebrow="At the counter" title="See How We Work" />
              <ul className="mt-14 grid gap-6 md:grid-cols-3">
                {photos.map((photo, i) => (
                  <Reveal as="li" key={photo.caption} delay={i * 80}>
                    <figure>
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <figcaption className="mt-4 text-center text-sm text-ink/80">
                        {photo.caption}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/*
          Reviews, without quoting any. The site holds no reviews it can show
          came from a real customer, so this points to the ones customers have
          posted themselves rather than putting words in anyone's mouth.
        */}
        <section className="section-y bg-champagne/15 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading
              strong
              eyebrow="In our customers' words"
              title="Trusted By Our Customers"
              description="We only show reviews that customers have posted publicly themselves. Read what they say about us on Google — and if you have bought or sold gold with us, we would be grateful for yours."
            />
            <Reveal className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ActionLink
                variant="outline"
                href={placeUrl(store.placeId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Our Google Reviews
              </ActionLink>
              <ActionLink
                variant="outline"
                href={reviewUrl(store.placeId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Leave a Review
              </ActionLink>
            </Reveal>
          </div>
        </section>

        {/* Questions */}
        <section className="section-y px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              strong
              eyebrow="Before you come in"
              title="Frequently Asked Questions"
            />
            <SellFaq faqs={FAQS} />
            <p className="mt-8 text-center text-[15px] text-ink/80">
              Something not covered here?{" "}
              <Link
                to="/contact"
                className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-rate-gold-deep"
              >
                Contact us
              </Link>{" "}
              or ask on WhatsApp.
            </p>
          </div>
        </section>

        {/* Closing: the three ways to act, and everything needed to arrive. */}
        <section id={CLOSING_ID} className="band-y scroll-mt-24 bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="font-display text-4xl font-light text-ivory sm:text-5xl">
                Know What Your Gold Is Worth?
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-champagne/90 sm:text-lg">
                Bring your gold to {SITE.name} in Sarafa Market, Mandi Bahauddin. We will test it,
                weigh it in front of you and explain the valuation.
              </p>

              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <ActionLink href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp Us
                </ActionLink>
                {phone ? (
                  <ActionLink variant="ghostLight" href={`tel:${phone.replace(/\s/g, "")}`}>
                    <Phone className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                    Call Now
                  </ActionLink>
                ) : null}
                <ActionLink
                  variant="ghostLight"
                  href={directionsUrl(store.mapQuery, store.placeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  Get Directions
                </ActionLink>
              </div>
            </div>

            <dl className="mt-14 grid gap-px overflow-hidden border border-gold/25 bg-gold/25 sm:grid-cols-3">
              <div className="bg-primary p-6 sm:p-7">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  <MapPin className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  Visit
                </dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-ivory">
                  {street}
                  <br />
                  {region.join(", ")}
                </dd>
              </div>
              <div className="bg-primary p-6 sm:p-7">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  <Clock className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  Open
                </dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-ivory">
                  {days}
                  <br />
                  {hours}
                </dd>
              </div>
              <div className="bg-primary p-6 sm:p-7">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  <IdCard className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  Before you come
                </dt>
                <dd className="mt-3">
                  <ul className="space-y-1 text-[15px] leading-relaxed text-ivory">
                    <li>CNIC required.</li>
                    <li>No appointment needed.</li>
                    <li>No obligation to sell.</li>
                  </ul>
                </dd>
              </div>
            </dl>

            <p className="mt-8 text-center text-sm text-champagne/85">
              <Link
                to="/contact"
                className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 transition-colors hover:text-gold hover:underline"
              >
                More ways to reach us
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />

      {/*
        Below md the sticky bar carries WhatsApp, and two gold WhatsApp buttons
        in one corner of a phone is one too many. A hidden parent hides a fixed
        child, so the shared button is left exactly as every other page has it.
      */}
      <div className="hidden md:block">
        <FloatingWhatsApp />
      </div>
      <StickySellBar whatsappHref={whatsapp} watchId={CLOSING_ID} />
    </div>
  );
}

/**
 * What this page is, for a search engine.
 *
 * A WebPage about the shop, with the shop described in the same node the
 * Stores page uses, under the same @id — so it reads as one business wherever
 * it is mentioned. No FAQPage: Google has shown FAQ results only for
 * well-known government and health sites since August 2023, so the markup
 * would earn nothing here, and the questions are plain HTML on the page for
 * any crawler to read. No rating either — the site holds none of its own.
 */
function PageSchema() {
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en-PK",
      isPartOf: { "@id": `${SITE.origin}/#website` },
      about: { "@id": STORE_SCHEMA_ID },
    },
    storeSchemaNode(),
  ];

  return (
    <script
      type="application/ld+json"
      // Our own configuration, serialised. No user input reaches it.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
