import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Search, X } from "lucide-react";

import { CtaBand } from "@/components/page/CtaBand";
import { FaqList, FaqSchema, type FaqItem } from "@/components/page/Faq";
import { PageHero } from "@/components/page/PageHero";
import { PageShell } from "@/components/page/PageShell";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

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

type Topic = { id: string; title: string; items: FaqItem[] };

const store = STORES[0]!;

/**
 * Every answer here restates something the shop already tells customers
 * elsewhere on the site — the contact and Sell Your Gold FAQs, the policies,
 * Our Story and the product pages. Nothing has been invented to fill a topic;
 * a question the site has no answer to is left out rather than guessed at.
 * When a policy changes, change it at its source page and here.
 */
const TOPICS: Topic[] = [
  {
    id: "ordering",
    title: "Buying & ordering",
    items: [
      {
        q: "Can I buy on the website?",
        a: "You can save pieces to your wishlist, add them to your bag and send an order request, or ask about any piece on WhatsApp. There is no online checkout: we confirm the weight and the price with you first, and payment is then settled in store or on confirmed delivery.",
        more: { label: "Browse the collections", to: "/collections" },
      },
      {
        q: "How do I order if I am not in Mandi Bahauddin?",
        a: "Message us on WhatsApp with the piece you want. We send photographs and a video, confirm the weight and the price against the day's gold rate, and deliver insured anywhere in Pakistan at no charge.",
      },
      {
        q: "Can rings be resized?",
        a: "Yes, and sizing is adjusted in store at no charge. For a ring bought as a gift, come in with the person it was for and we will fit it properly.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & the gold rate",
    items: [
      {
        q: "How is the price of a piece calculated?",
        a: "Gold value plus making charges plus the value of any stones. The gold is charged at the day's rate for its karat, on the metal weight plus polish. Every product page shows the parts separately, and the final price is confirmed at the counter on the day you buy.",
      },
      {
        q: "Where can I see today's gold rate?",
        a: "The shop publishes its rates every day for 24K (Piece), 23.65K (Pathor) and 22K (Jewellery) gold and for silver, per tola and per gram, with the time they were last updated.",
        more: { label: "Today's gold rate", to: "/gold-rate-in-mandi-bahauddin-today" },
      },
      {
        q: "Why does the price of the same piece change from day to day?",
        a: "Only the gold moves. It is priced against the rate for that day, while making charges and stone values stay fixed in rupees — the work does not cost more because gold rose that morning.",
      },
      {
        q: "How many grams are in a tola?",
        a: "One tola is 11.6638 grams. Rates are quoted per tola because that is how gold is priced in the market, and per gram alongside it.",
      },
    ],
  },
  {
    id: "purity",
    title: "Purity & hallmarking",
    items: [
      {
        q: "What karat is your jewellery?",
        a: "Gold jewellery is stamped 22K, and 18K for diamond settings. Silver is stamped 925. The stamp is on the piece itself, not just the bill.",
      },
      {
        q: "Is my piece weighed in front of me?",
        a: "Yes. Every piece goes on a calibrated scale at the counter before it is billed, and the gross weight, net metal weight and stone weight are all written down. For delivery orders, the piece is shown weighed on video before it is dispatched.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling gold & buy-back",
    items: [
      {
        q: "Do you buy back what you sell?",
        a: "Yes, for as long as we are trading. Bring the piece and its bill and we buy it back against the gold rate on the day you return it, not the day you bought it. Making charges are not returned, which is standard across the trade.",
      },
      {
        q: "How much will you pay for my gold?",
        a: "We buy jewellery at the 20K rate, which is published on the Sell Your Gold page and moves with the market each day. You are paid that rate against the weight of your piece, weighed in front of you.",
        more: { label: "See today's buying rate", to: "/sell-your-gold" },
      },
      {
        q: "Can I sell jewellery bought from another shop?",
        a: "Yes. Gold bought from another jeweller, inherited jewellery and old or broken pieces are all assessed the same way: tested for purity and weighed in front of you, then quoted against the day's buying rate.",
      },
      {
        q: "What do I need to bring?",
        a: "Your CNIC — we cannot buy gold without it, whatever the piece is. The original bill is not required to sell, but it saves time because it already carries the weight and the karat.",
      },
      {
        q: "Can I refuse the offer?",
        a: "Yes. There is no obligation to sell. If the figure is not for you, your gold goes home with you.",
      },
      {
        q: "How am I paid when I sell?",
        a: "Cash at the counter, a bank transfer to your account, or an exchange against a new piece. You choose once the figure is agreed.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery & payment",
    items: [
      {
        q: "Do you charge for delivery?",
        a: "No. Delivery is insured and free of charge anywhere in Pakistan, on every order, regardless of value.",
      },
      {
        q: "How soon will my order be dispatched?",
        a: "Dispatch timing is confirmed with you when you order. Pieces in stock go quickly; bridal work is made to order and takes six to ten weeks.",
      },
      {
        q: "How do I pay for a piece?",
        a: "Payment is arranged in store, or on confirmed delivery. No card details are ever entered on this website — there is nothing here to take them.",
        more: { label: "Delivery, exchange & buy-back terms", to: "/policies" },
      },
    ],
  },
  {
    id: "custom",
    title: "Custom orders & bridal",
    items: [
      {
        q: "Can you make a piece to my design?",
        a: "Yes. Send a photograph, a description or a voice note of what you have in mind. Nothing is charged and nothing is committed: we call to talk it through, and quote against the gold rate on the day the work is agreed.",
        more: { label: "Start a custom order", to: "/custom-order" },
      },
      {
        q: "How long does a bridal set take?",
        a: "Six to ten weeks, because bridal work is made to order. We send photographs through the making so nothing is a surprise at the end. If your wedding is sooner, tell us the date and we will be honest about what is possible.",
      },
      {
        q: "Can I book a bridal consultation?",
        a: "Yes. It is an hour at the counter with the full range out on the tray, the day's rate in front of you, and no obligation. Tell us when suits and we will keep the time free.",
        more: { label: "Book a consultation", to: "/bridal" },
      },
    ],
  },
  {
    id: "visiting",
    title: "Visiting the shop",
    items: [
      {
        q: "Where is the shop and when is it open?",
        a: `We are at ${store.address}. Open ${store.hours}; ${store.closed.toLowerCase()}.`,
        more: { label: "Map & directions", to: "/stores" },
      },
    ],
  },
];

const ALL_ITEMS = TOPICS.flatMap((topic) => topic.items);

const WHATSAPP_MESSAGE =
  "Assalam-o-Alaikum, I read your FAQ page and have a question that is not answered there.";

function FaqPage() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  // While searching, each topic keeps only its matching questions; topics with
  // none are dropped. With no search the page is exactly the full list.
  const shown = needle
    ? TOPICS.map((topic) => ({
        ...topic,
        items: topic.items.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(needle)),
      })).filter((topic) => topic.items.length > 0)
    : TOPICS;
  const matches = shown.reduce((sum, topic) => sum + topic.items.length, 0);

  return (
    <PageShell>
      <PageHero
        title="Frequently asked questions"
        intro="Straight answers on buying, pricing, purity, selling your gold, delivery and custom work. If yours is not here, ask us on WhatsApp."
        trail={[{ name: "FAQ", path: "/faq" }]}
      />
      <FaqSchema items={ALL_ITEMS} />

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
                  {TOPICS.map((topic) => (
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-rate-gold-deep">
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
                    <span className="block text-ink/60">{store.closed}</span>
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
