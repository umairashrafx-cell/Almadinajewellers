import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { SITE, whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/policies")({
  head: () => {
    const title = `Delivery, Exchange & Buy-Back — ${SITE.name}`;
    const description =
      "How Al-Madina Jewellers delivers, how payment works, and how exchange and lifetime buy-back are handled. Free insured delivery across Pakistan; pieces bought back at the 20k rate on the day you return.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/policies` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/policies` }],
    };
  },
  component: PoliciesPage,
});

/**
 * Delivery, payment, exchange and buy-back in one place.
 *
 * Every statement here restates something the shop already tells customers on
 * the contact FAQ or at the counter — nothing has been invented to fill a
 * heading. Where a figure would vary by piece or by day, it says so and points
 * at WhatsApp rather than committing the shop to a number it did not give.
 *
 * One page with anchors rather than three thin ones: the footer links land on
 * the exact section, and there is a single place to edit when terms change.
 */

type Policy = {
  id: string;
  title: string;
  summary: string;
  points: string[];
};

const POLICIES: Policy[] = [
  {
    id: "delivery",
    title: "Delivery",
    summary:
      "Free insured delivery anywhere in Pakistan. Nothing leaves the counter until you have seen it and agreed the price.",
    points: [
      "Delivery is insured and free of charge across Pakistan, on every order, regardless of value.",
      "Order by WhatsApp. We send photographs and a video of the actual piece, confirm its weight, and price it against that day's gold rate before anything is dispatched.",
      "Dispatch timing is confirmed with you when you order. Pieces in stock go quickly; bridal work is made to order and takes six to ten weeks.",
      "Every piece is hallmarked and weighed in front of you in store, or shown weighed on video before dispatch.",
    ],
  },
  {
    id: "payment",
    title: "Payment",
    summary: "There is no online checkout on this website, and that is deliberate.",
    points: [
      "Gold is priced against a rate that moves daily. You enquire, we agree the weight and the price, and payment is settled directly — either in store or on confirmed delivery.",
      "No card details are ever entered on this website. There is nothing here to take them.",
      "The price you are quoted is the price at the counter on the day you buy, confirmed against that day's rate.",
    ],
  },
  {
    id: "exchange",
    title: "Exchange & buy-back",
    summary:
      "We buy back what we sell, for as long as we are trading. Bring the piece and its bill.",
    points: [
      "Pieces are bought back at the 20k rate on the day you return them — not the day you bought them. If the rate has risen, that gain is yours. Today's figure is published on the Sell Your Gold page.",
      "That rate sits below what the same gold sells at, and the gap is the making charge, which cannot come back with the metal. We quote it as one rate rather than a higher one with a subtraction after it.",
      "Exchange works the same way: the piece is valued at the day's rate and set against whatever you are moving to.",
      "Keep the bill. It is how we confirm the weight, the karat and the making charge the piece was sold at.",
    ],
  },
  {
    id: "sizing",
    title: "Sizing & repairs",
    summary: "Fit is part of the sale, not an extra.",
    points: [
      "Ring sizing is adjusted in store at no charge.",
      "If a ring was bought as a gift, bring the person it was for and we will fit it properly.",
      "For any piece that needs attention later, bring it in and we will tell you honestly whether it is a repair or a remake.",
    ],
  },
];

function PoliciesPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
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
                  Policies
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Delivery, exchange &amp; buy-back
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              The terms we work to, written plainly. If anything here is unclear, ask us on WhatsApp
              before you buy rather than after.
            </p>
          </div>
        </section>

        <section className="section-y mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="On this page" className="border-b border-gold/30 pb-6">
            <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] uppercase tracking-widest text-warmgrey">
              {POLICIES.map((policy) => (
                <li key={policy.id}>
                  <a href={`#${policy.id}`} className="transition-colors hover:text-primary">
                    {policy.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-16 space-y-16">
            {POLICIES.map((policy) => (
              <Reveal key={policy.id} as="article">
                <h2
                  id={policy.id}
                  className="scroll-mt-28 font-display text-3xl font-light tracking-wide text-primary"
                >
                  {policy.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-ink">{policy.summary}</p>
                <ul className="mt-6 space-y-4">
                  {policy.points.map((point) => (
                    <li
                      key={point}
                      className="border-l border-gold/40 pl-5 text-sm leading-relaxed text-warmgrey"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-y bg-champagne/25">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Still unsure"
              title="Ask before you buy"
              description="A question answered now is worth more to both of us than a piece returned later. We answer on WhatsApp through shop hours."
            />
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ActionLink
                href={whatsappLink(
                  "Assalam-o-Alaikum, I have a question about your delivery and buy-back terms.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask on WhatsApp
              </ActionLink>
              <ActionLink variant="outline" href="/contact">
                Send a message
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
