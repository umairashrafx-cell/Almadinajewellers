import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  Gem,
  MessageCircle,
  Ruler,
  Scale,
  ShieldCheck,
  Truck,
  Video,
  Wallet,
} from "lucide-react";

import { CtaBand } from "@/components/page/CtaBand";
import { FaqSection } from "@/components/page/Faq";
import { PageHero } from "@/components/page/PageHero";
import { PageShell } from "@/components/page/PageShell";
import { PointGrid, type PointItem } from "@/components/page/PointGrid";
import { StepList, type StepItem } from "@/components/page/StepList";
import { ActionLink } from "@/components/ui/ActionButton";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { faqTopic } from "@/lib/faq";
import { SITE, whatsappLink } from "@/lib/site";

const PATH = "/delivery-payment";

export const Route = createFileRoute("/delivery-payment")({
  head: () => {
    const title = `Delivery & Payment — ${SITE.name}`;
    const description =
      "Free insured delivery anywhere in Pakistan. See photographs and a video of the actual piece, agree the weight and price at the day's gold rate, then pay in store or on confirmed delivery. No online checkout.";
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
  component: DeliveryPaymentPage,
});

/**
 * Delivery and payment.
 *
 * Restates the policies page and the contact FAQ as a customer meets them:
 * what is promised, then the order of events, then the details. Nothing is
 * committed here that the shop has not already said — no delivery days, and no
 * delivery outside Pakistan, because neither has been stated.
 */

const PROMISES: PointItem[] = [
  {
    title: "Free insured delivery",
    body: "Insured and free of charge anywhere in Pakistan, on every order, regardless of value.",
    icon: Truck,
  },
  {
    title: "Seen before it is sent",
    body: "We send photographs and a video of the actual piece, and show it weighed on video before anything is dispatched.",
    icon: Video,
  },
  {
    title: "No online checkout",
    body: "No card details are ever entered on this website. Payment is settled in store, or on confirmed delivery.",
    icon: Wallet,
  },
];

const STEPS: StepItem[] = [
  {
    title: "Choose a piece",
    body: "Browse the collections and send an order request from your bag, or message us about any piece on WhatsApp.",
    icon: Gem,
  },
  {
    title: "See it on WhatsApp",
    body: "We send photographs and a video of the actual piece, and confirm its weight.",
    icon: MessageCircle,
  },
  {
    title: "Agree the price",
    body: "The piece is priced against that day's gold rate, with gold value, making charges and stones shown separately.",
    icon: Scale,
  },
  {
    title: "Delivered, then paid",
    body: "Insured delivery at no charge anywhere in Pakistan, or come to the shop. Pay in store or on confirmed delivery.",
    icon: ShieldCheck,
  },
];

const DETAILS: PointItem[] = [
  {
    title: "Dispatch timing",
    body: "Confirmed with you when you order. Pieces in stock go quickly; bridal sets are made to order and ready within ten days.",
    icon: Clock,
  },
  {
    title: "The price you pay",
    body: "The price at the counter on the day you buy, confirmed against that day's rate. Gold is priced on a rate that moves daily, which is why nothing is paid before the price is agreed.",
    icon: Scale,
  },
  {
    title: "Sizing",
    body: "Ring sizing is adjusted in store at no charge. For a ring bought as a gift, bring the person it was for and we will fit it properly.",
    icon: Ruler,
  },
];

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I would like to order a piece for delivery. Please send photographs and the price.";

function DeliveryPaymentPage() {
  return (
    <PageShell>
      <PageHero
        title="Delivery & payment"
        intro="Free insured delivery anywhere in Pakistan. Nothing is sent, and nothing is paid, until you have seen the piece and agreed the price."
        trail={[{ name: "Delivery & Payment", path: PATH }]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ActionLink
            href={whatsappLink(WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Order on WhatsApp
          </ActionLink>
          <ActionLink variant="ghostLight" href="/collections">
            Browse the collections
          </ActionLink>
        </div>
      </PageHero>

      <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What we promise"
          title="Buying from home, with confidence"
          strong
        />
        <div className="mt-14">
          <PointGrid points={PROMISES} />
        </div>
      </section>

      <section className="section-y bg-champagne/25">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Ordering from home"
            title="How it works"
            description="The same care as buying at the counter, over WhatsApp."
            strong
          />
          <div className="mt-14">
            <StepList steps={STEPS} />
          </div>
        </div>
      </section>

      <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The details" title="Timing, price and fit" strong />
        <div className="mt-14">
          <PointGrid points={DETAILS} />
        </div>
      </section>

      <FaqSection topics={[faqTopic("delivery"), faqTopic("ordering")]} name="delivery-faq" />

      <CtaBand
        eyebrow="Ready to order"
        title="Tell us which piece"
        description="Send the piece's name or a screenshot on WhatsApp, and we will reply with photographs, the weight and today's price."
        whatsappMessage={WHATSAPP_MESSAGE}
      />
    </PageShell>
  );
}
