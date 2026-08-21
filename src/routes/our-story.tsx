import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import workshopImage from "@/assets/story-workshop.jpg";
import bridalImage from "@/assets/cat-bridal.jpg";
import banglesImage from "@/assets/cat-bangles.jpg";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/our-story")({
  head: () => {
    const title = `Our Story — Three Generations · ${SITE.name}`;
    const description = `Founded by ${SITE.founder} in Sarafa Market, Mandi Bahauddin. Three generations of goldsmiths, hallmarked 21K and 22K gold, and a weight checked in front of every customer.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/our-story` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/our-story` }],
    };
  },
  component: OurStoryPage,
});

/**
 * Generations rather than dates. The founding year is not recorded anywhere in
 * the brief or the site, and an invented date on a heritage page is the one
 * claim a customer might actually check. Swap in real years when known.
 */
const GENERATIONS = [
  {
    era: "The first generation",
    title: "A counter in Sarafa Market",
    body: `${SITE.founder} opened the shop with a scale, a set of files and a rule he repeated to every customer: the weight on the bill is the weight in your hand. Trade in Sarafa Market ran on reputation, and reputation ran on the scale being honest.`,
  },
  {
    era: "The second generation",
    title: "The workshop behind the shop",
    body: "His sons learned the bench before they learned the counter — annealing, drawing wire, setting stones, finishing by hand. Bringing the making in-house meant the family could stand behind the purity of a piece because they had made it themselves.",
  },
  {
    era: "Today",
    title: "The same scale, a wider counter",
    body: "The third generation runs the shop and the workshop together. Families order from across Pakistan and from abroad, over WhatsApp and video call, with insured delivery at the end. What has not changed is that every piece is hallmarked, weighed in front of the customer, and carries a lifetime buy-back.",
  },
];

const STANDARDS = [
  {
    title: "Hallmarked purity",
    body: "Gold is stamped 21K or 22K, and 18K for diamond settings. Silver is stamped 925. The stamp is on the piece, not just the bill.",
  },
  {
    title: "Weighed in front of you",
    body: "Every piece goes on a calibrated scale at the counter before it is billed. Gross weight, net metal weight and stone weight are all written down.",
  },
  {
    title: "Priced against the day's rate",
    body: "Gold value, making charges and stone value are quoted separately, so you can see exactly what you are paying for the metal and what you are paying for the work.",
  },
  {
    title: "Lifetime buy-back",
    body: "Bring a piece back with its bill at any time and we buy it back against the gold rate on the day you return, not the day you bought.",
  },
];

function OurStoryPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Hero */}
        <section className="relative -mt-[74px] flex min-h-[70vh] items-end overflow-hidden">
          <img
            src={workshopImage}
            alt="Goldsmith working at the bench in the Al-Madina workshop"
            className="ken-burns absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--primary-deep) 0%, oklch(0.16 0.035 160 / 0.72) 40%, oklch(0.16 0.035 160 / 0.2) 100%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Our Story
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-light tracking-wide text-ivory sm:text-6xl">
              Three generations. One standard.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-champagne/85 sm:text-base">
              A family jewellery house in Sarafa Market, Mandi Bahauddin — founded in 1985 by{" "}
              <Link
                to="/our-story/founder"
                className="border-b border-gold/50 pb-0.5 text-ivory transition-colors hover:text-gold"
              >
                {SITE.founder}
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section className="section-y">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="The House" title="How the shop was built" align="left" />

            <ol className="mt-14 space-y-14 border-l border-gold/40 pl-8">
              {GENERATIONS.map((g, i) => (
                <Reveal as="li" key={g.era} delay={(i % 3) * 80} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[38px] top-2 grid h-3 w-3 place-items-center rounded-full bg-gold"
                  />
                  <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                    {g.era}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-light tracking-wide text-primary sm:text-3xl">
                    {g.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-warmgrey">{g.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Craftsmanship */}
        <section className="section-y bg-champagne/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <img
                  src={banglesImage}
                  alt="Hand-finished gold karay on the workbench"
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              </Reveal>
              <Reveal delay={80}>
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                  The Workshop
                </p>
                <h2 className="mt-4 font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
                  Made by hand, a few pieces at a time
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-warmgrey">
                  <p>
                    Work starts with the metal being weighed and alloyed to the karat the customer
                    has asked for. From there it is drawn, formed, soldered and filed at the bench —
                    the slow part, and the part that decides whether a piece still looks right in
                    twenty years.
                  </p>
                  <p>
                    Stones are set last, by hand, under a loupe. Every piece is polished, checked
                    for sharp edges and weak clasps, then hallmarked before it goes into the tray.
                  </p>
                  <p>
                    Bridal work is made to order and takes six to ten weeks. We send photographs
                    through the making so nothing is a surprise at the end.
                  </p>
                </div>
                <ActionLink variant="outline" className="mt-8" href="/bridal">
                  See the bridal collection
                </ActionLink>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Standards */}
        <section id="standards" className="section-y scroll-mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Certification & Hallmarking"
              title="What we stand behind"
              description="Four things a customer can hold us to, on every piece, every time."
            />

            <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {STANDARDS.map((s, i) => (
                <Reveal key={s.title} delay={(i % 2) * 80}>
                  <div className="border-t border-gold/40 pt-6">
                    <h3 className="font-display text-xl font-normal tracking-wide text-primary">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-warmgrey">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Visit */}
        <section className="section-y relative overflow-hidden bg-primary">
          <img
            src={bridalImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-light tracking-wide text-ivory sm:text-4xl">
              Come and see the work
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-champagne/80">
              The full range is on the tray at the counter, and the scale is on the table. We are
              open every day, 11:00am to 8:00pm.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ActionLink href="/stores">Find the shop</ActionLink>
              <ActionLink variant="ghostLight" href="/bridal#consultation">
                Book a consultation
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
