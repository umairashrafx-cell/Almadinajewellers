import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Search, X } from "lucide-react";

import { CtaBand } from "@/components/page/CtaBand";
import { FaqList, FaqSchema } from "@/components/page/Faq";
import { PageHero } from "@/components/page/PageHero";
import { PageShell } from "@/components/page/PageShell";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

import { ALL_FAQ_ITEMS, FAQ_TOPICS } from "@/lib/faq";
import { SITE, STORES, whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  head: () => {
    const title = `Frequently Asked Questions — ${SITE.name}`;
    const description =
      "Answers on ordering, pricing and the daily gold rate, hallmarked purity, selling gold and buy-back, delivery and payment, custom orders and bridal sets at Al-Madina Jewellers, Mandi Bahauddin.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/faq` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/faq` }],
    };
  },
  component: FaqPage,
});

const store = STORES[0]!;

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I read your FAQ page and have a question that is not answered there.";

function FaqPage() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  // While searching, each topic keeps only its matching questions; topics with
  // none are dropped. With no search the page is exactly the full list.
  const shown = needle
    ? FAQ_TOPICS.map((topic) => ({
        ...topic,
        items: topic.items.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(needle)),
      })).filter((topic) => topic.items.length > 0)
    : FAQ_TOPICS;
  const matches = shown.reduce((sum, topic) => sum + topic.items.length, 0);

  return (
    <PageShell>
      <PageHero
        title="Frequently asked questions"
        intro="Straight answers on buying, pricing, purity, selling your gold, delivery and custom work. If yours is not here, ask us on WhatsApp."
        trail={[{ name: "FAQ", path: "/faq" }]}
      />
      <FaqSchema items={ALL_FAQ_ITEMS} />

      <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 max-w-3xl">
            {/* Search */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-warmgrey"
                aria-hidden="true"
              />
              <label htmlFor="faq-search" className="sr-only">
                Search the questions
              </label>
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the questions — e.g. CNIC, delivery, 22K"
                autoComplete="off"
                className="h-12 w-full rounded-[2px] border border-gold/40 bg-card pl-11 pr-11 text-sm text-ink outline-none transition-colors placeholder:text-warmgrey/80 focus:border-gold [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-warmgrey transition-colors hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Topics, or the result count while searching */}
            {needle ? (
              <p role="status" className="mt-6 text-sm text-ink/70">
                {matches === 0
                  ? `No questions match “${query.trim()}”.`
                  : `${matches} ${matches === 1 ? "question matches" : "questions match"} “${query.trim()}”.`}
              </p>
            ) : (
              <nav aria-label="Topics" className="mt-6">
                <ul className="flex flex-wrap gap-2">
                  {FAQ_TOPICS.map((topic) => (
                    <li key={topic.id}>
                      <a
                        href={`#${topic.id}`}
                        className="inline-flex min-h-10 items-center rounded-[2px] border border-gold/40 px-3.5 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:border-gold hover:bg-champagne/40"
                      >
                        {topic.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {needle && matches === 0 ? (
              <div className="mt-10 border border-gold/30 bg-card p-6 sm:p-8">
                <p className="font-display text-2xl font-light text-primary">Ask us instead</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">
                  Someone at the counter will answer on WhatsApp through shop hours.
                </p>
                <ActionLink
                  className="mt-6"
                  href={whatsappLink(`Assalam-o-Alaikum, I have a question: ${query.trim()}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ask on WhatsApp
                </ActionLink>
              </div>
            ) : null}

            <div className="mt-14 space-y-16">
              {shown.map((topic) => (
                <Reveal key={topic.id} as="section">
                  <h2
                    id={topic.id}
                    className="scroll-mt-28 font-display text-3xl font-light tracking-wide text-primary"
                  >
                    {topic.title}
                  </h2>
                  <div className="mt-6">
                    <FaqList items={topic.items} name="faq" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Direct contact, kept in view beside the answers on wide screens */}
          <aside className="hidden lg:block" aria-label="Contact the shop">
            <div className="sticky top-[calc(var(--header-h)+2rem)] border border-gold/30 bg-card p-6 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-deep">
                Still unsure?
              </p>
              <p className="mt-3 font-display text-2xl font-light leading-snug text-primary">
                Ask the shop directly
              </p>
              <ActionLink
                className="mt-6 w-full"
                href={whatsappLink(WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask on WhatsApp
              </ActionLink>

              <ul className="mt-6 space-y-4 border-t border-gold/20 pt-6 text-sm text-ink/80">
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span className="space-y-1">
                    {store.phones.map((phone) => (
                      <a
                        key={phone}
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="nums block transition-colors hover:text-primary"
                      >
                        {phone}
                      </a>
                    ))}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>
                    {store.hours}
                    <span className="block text-ink/70">{store.closed}</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <Link to="/stores" className="transition-colors hover:text-primary">
                    {store.name}, {store.city}
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <CtaBand
        eyebrow="Still have a question"
        title="Ask before you buy"
        description="A question answered now is worth more to both of us than a surprise later. We answer on WhatsApp through shop hours."
        whatsappMessage={WHATSAPP_MESSAGE}
      />
    </PageShell>
  );
}
