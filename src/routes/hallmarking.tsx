import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Receipt, RefreshCcw, Scale } from "lucide-react";

import { GoldRateStrip } from "@/components/home/GoldRateStrip";
import { CtaBand } from "@/components/page/CtaBand";
import { FaqSection } from "@/components/page/Faq";
import { RomanUrduAnswers } from "@/components/page/RomanUrduAnswers";
import { PURITY_ANSWERS } from "@/lib/roman-urdu";
import { PageHero } from "@/components/page/PageHero";
import { PageShell } from "@/components/page/PageShell";
import { StepList, type StepItem } from "@/components/page/StepList";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { faqTopic } from "@/lib/faq";
import { SITE, whatsappLink } from "@/lib/site";

const PATH = "/hallmarking";

export const Route = createFileRoute("/hallmarking")({
  head: () => {
    const title = `Hallmarking & Gold Purity — ${SITE.name}`;
    const description =
      "What 22K, 18K and 925 mean on your jewellery, how every piece is stamped and weighed in front of you, and how purity and the day's gold rate set the price at Al-Madina Jewellers, Mandi Bahauddin.";
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
  component: HallmarkingPage,
});

/**
 * Hallmarking and purity.
 *
 * Every claim restates what the site already says — Our Story's standards, the
 * policies and the product pages. The one thing added is arithmetic anyone can
 * check: a karat is a twenty-fourth part, so 22K is 22 parts gold in 24.
 */

const STEPS: StepItem[] = [
  {
    title: "Stamped",
    body: "Gold jewellery is stamped 22K, and 18K for diamond settings. Silver is stamped 925. The stamp is on the piece itself, not just the bill.",
    icon: BadgeCheck,
  },
  {
    title: "Weighed",
    body: "Every piece goes on a calibrated scale at the counter. Gross weight, net metal weight and stone weight are all written down.",
    icon: Scale,
  },
  {
    title: "Priced",
    body: "Gold value, making charges and stone value are quoted separately, with the gold charged at the day's rate for its karat.",
    icon: Receipt,
  },
  {
    title: "Backed",
    body: "Bring a piece back with its bill at any time and we buy it back against the gold rate on the day you return it.",
    icon: RefreshCcw,
  },
];

type Mark = {
  stamp: string;
  name: string;
  used: string;
  /** Share of the metal that is gold or silver, as a percentage. */
  purity: number;
  parts: string;
};

const MARKS: Mark[] = [
  {
    stamp: "22K",
    name: "Gold jewellery",
    used: "Our gold jewellery, from everyday pieces to bridal sets.",
    purity: (22 / 24) * 100,
    parts: "22 parts gold in 24",
  },
  {
    stamp: "18K",
    name: "Diamond settings",
    used: "Our diamond-set pieces.",
    purity: (18 / 24) * 100,
    parts: "18 parts gold in 24",
  },
  {
    stamp: "925",
    name: "Sterling silver",
    used: "Our silver pieces.",
    purity: 92.5,
    parts: "925 parts silver in 1,000",
  },
];

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I have a question about the purity and hallmarking of your jewellery.";

function HallmarkingPage() {
  return (
    <PageShell>
      <PageHero
        title="Hallmarking & purity"
        intro="What the stamp on your jewellery means, how every piece is weighed in front of you, and how purity and the day's gold rate set the price."
        trail={[{ name: "Hallmarking & Purity", path: PATH }]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ActionLink href="/gold-rate-in-mandi-bahauddin-today">
            Today&rsquo;s gold rate
          </ActionLink>
          <ActionLink
            variant="ghostLight"
            href={whatsappLink(WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ask about a piece
          </ActionLink>
        </div>
      </PageHero>

      <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What we stand behind"
          title="From the tray to your bill"
          description="Four things a customer can hold us to, on every piece, every time."
          strong
        />
        <div className="mt-14">
          <StepList steps={STEPS} />
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-ink/75">
          Ordering for delivery? The piece is shown weighed on video before it is dispatched.
        </p>
      </section>

      <section className="section-y bg-champagne/25">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Reading the stamp"
            title="What the numbers mean"
            description="A karat is one twenty-fourth part. Pure gold is 24 karat, so the karat says how many of every 24 parts are gold. Silver is marked in parts per thousand."
            strong
          />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {MARKS.map((mark, i) => (
              <Reveal key={mark.stamp} delay={i * 80}>
                <article className="h-full border border-gold/30 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="nums font-display text-6xl font-light leading-none text-primary">
                      {mark.stamp}
                    </p>
                    <p className="nums text-sm font-semibold text-ink">{mark.purity.toFixed(1)}%</p>
                  </div>
                  <div
                    className="mt-6 h-1.5 overflow-hidden rounded-full bg-champagne/60"
                    role="img"
                    aria-label={`${mark.purity.toFixed(1)} percent pure`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold to-rate-gold-deep"
                      style={{ width: `${mark.purity}%` }}
                    />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-light text-primary">
                    {mark.name}
                  </h3>
                  <p className="nums mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
                    {mark.parts}
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{mark.used}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <GoldRateStrip />

      <FaqSection topics={[faqTopic("purity"), faqTopic("pricing")]} name="hallmarking-faq" />

      <RomanUrduAnswers answers={PURITY_ANSWERS} />

      <CtaBand
        eyebrow="See it for yourself"
        title="The scale is on the counter"
        description="Come to the counter and see any of our pieces stamped and weighed in front of you. Or ask on WhatsApp and we will send photographs and the weight."
        whatsappMessage={WHATSAPP_MESSAGE}
      />
    </PageShell>
  );
}
