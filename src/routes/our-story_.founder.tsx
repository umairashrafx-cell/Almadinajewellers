import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import founderPortrait from "@/assets/founder.webp";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { SITE } from "@/lib/site";

const FOUNDED = 1985;

export const Route = createFileRoute("/our-story_/founder")({
  head: () => {
    const title = `${SITE.founder} — Founder · ${SITE.name}`;
    const description = `${SITE.founder} opened Al-Madina Jewellers in Sarafa Market, Mandi Bahauddin in ${FOUNDED}, after years of struggle. The rule he set then still runs the shop: weigh it in front of the customer.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `${SITE.origin}/our-story/founder` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/our-story/founder` }],
    };
  },
  component: FounderPage,
});

/** The principles the shop still runs on, each traced back to him. */
const PRINCIPLES = [
  {
    title: "Weigh it in front of the customer",
    body: "He set the scale on the counter where the buyer could see it, not behind it. Every piece sold in this shop is still weighed in front of the person buying it, and the weight on the bill is the weight in the hand.",
  },
  {
    title: "Hallmark everything",
    body: "Purity is not a promise to be taken on trust when it can be stamped. He would not sell a piece he could not vouch for, which meant knowing exactly what was in it.",
  },
  {
    title: "Stand behind it for life",
    body: "A piece bought here can be brought back here. The lifetime buy-back is not a marketing line the shop added later — it is the same undertaking he gave across the counter in 1985.",
  },
];

/**
 * A profile of the founder, linked from Our Story.
 *
 * Deliberately restrained on biography. What is written here is what the shop
 * already tells customers — the year, the struggle behind the opening, and the
 * three rules that still run the counter. Inventing anecdotes about a real
 * person to fill a layout would be the one unforgivable thing on a page like
 * this, so the design carries the weight instead of the copy.
 */
function FounderPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Portrait and name, on the deep green the cutout was made for. */}
        <section className="relative overflow-hidden bg-primary">
          <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-12 lg:px-8">
            <div className="band-y flex flex-col justify-center lg:py-28">
              <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                  <li>
                    <Link to="/" className="transition-colors hover:text-gold">
                      Home
                    </Link>
                  </li>
                  <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  <li>
                    <Link to="/our-story" className="transition-colors hover:text-gold">
                      Our Story
                    </Link>
                  </li>
                  <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  <li aria-current="page" className="text-gold">
                    Founder
                  </li>
                </ol>
              </nav>

              <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                The Founder
              </p>
              <h1 className="mt-4 font-display text-4xl font-light leading-tight tracking-wide text-ivory sm:text-5xl lg:text-6xl">
                {SITE.founder}
              </h1>

              <div className="hairline mt-8 max-w-24" />

              <p className="mt-8 max-w-xl text-base leading-relaxed text-champagne/85">
                He opened Al-Madina Jewellers in {FOUNDED}, on a single counter in Sarafa Market,
                Mandi Bahauddin — after years of struggle that did not look, at the time, like they
                were leading anywhere.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/70">
                Four decades later the shop is run by the third generation of his family, from the
                same market. What he built was not a shopfront. It was a way of dealing with people
                that his sons and grandsons have not found a reason to change.
              </p>
            </div>

            {/*
              The portrait is a cut-out with a transparent background, so it
              stands directly on the green rather than sitting in a photographic
              box. Aligned to the bottom so he rises out of the band.
            */}
            <div className="relative flex items-end justify-center lg:justify-end">
              <img
                src={founderPortrait}
                alt={`${SITE.founder}, founder of ${SITE.name}`}
                width={858}
                height={1200}
                className="relative z-10 w-64 max-w-full drop-shadow-2xl sm:w-80 lg:w-[26rem]"
              />
              {/* A soft gold pool behind him, so the cut-out edge never reads as a sticker. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-1/2 h-3/4 w-[34rem] max-w-none -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
              />
            </div>
          </div>
        </section>

        {/* The year, set as a single editorial statement. */}
        <section className="section-y bg-champagne/25">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                Established
              </p>
              <p className="nums mt-4 font-display text-6xl font-light tracking-wide text-primary sm:text-7xl">
                {FOUNDED}
              </p>
              <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-ink">
                “The weight on the bill is the weight in your hand.”
              </p>
              <p className="mt-4 text-xs uppercase tracking-widest text-warmgrey">
                The rule he repeated to every customer
              </p>
            </Reveal>
          </div>
        </section>

        {/* What survived him, stated as the shop's working rules. */}
        <section className="section-y">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="What he left"
              title="Three rules, still running the counter"
              description="Nothing here is a policy the shop adopted later. Each one is his, and each one is still checkable by anyone who walks in."
            />

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {PRINCIPLES.map((principle, i) => (
                <Reveal key={principle.title} delay={(i % 3) * 80}>
                  <article>
                    <p className="nums font-display text-4xl font-light text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 font-display text-2xl font-light tracking-wide text-primary">
                      {principle.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-warmgrey">{principle.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="section-y bg-primary">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              tone="light"
              eyebrow="Continue"
              title="Three generations of the same standard"
              description="How a single counter in Sarafa Market became a workshop, and what has stayed exactly as he set it."
            />
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ActionLink href="/our-story">Read our story</ActionLink>
              <ActionLink variant="ghostLight" href="/stores">
                Visit the shop
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
