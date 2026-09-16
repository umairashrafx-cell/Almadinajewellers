import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { SectionHeading } from "@/components/ui/SectionHeading";

export type FaqItem = {
  q: string;
  /** Plain text, so the same words can go into the FAQPage structured data. */
  a: string;
  /** An internal page that says more, shown under the answer. */
  more?: { label: string; to: string };
};

/**
 * Questions and answers as native disclosure widgets.
 *
 * The same approach as the Sell Your Gold FAQ, in the site's own palette
 * rather than the rate board's: `<details>`, so every answer is in the HTML for
 * search engines and for a page that never hydrates, keyboard and screen
 * reader behaviour come from the browser, and a shared `name` means opening one
 * closes the last — a phone never becomes a wall of open answers.
 */
export function FaqList({ items, name }: { items: FaqItem[]; name: string }) {
  return (
    <div className="divide-y divide-gold/30 border-y border-gold/30">
      {items.map((item) => (
        <details key={item.q} name={name} className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-display text-xl leading-snug text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:text-[22px] [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 text-primary transition-[transform,background-color] duration-300 group-open:rotate-180 group-hover:bg-gold/15 motion-reduce:transition-none"
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={1.6} />
            </span>
          </summary>
          <div className="value-in pb-6 pr-4 text-[15px] leading-relaxed text-ink/80 sm:pr-16">
            <p>{item.a}</p>
            {item.more ? (
              <Link
                to={item.more.to}
                className="mt-4 inline-block border-b border-gold pb-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-primary"
              >
                {item.more.label}
              </Link>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

/**
 * A page's closing questions: a heading, then each topic's answers, with a link
 * to the full FAQ.
 *
 * Deliberately no FAQPage structured data here. The same questions are marked
 * up once, on /faq, rather than repeated across every page that shows them.
 */
export function FaqSection({
  topics,
  name,
  title = "Questions we are asked",
}: {
  topics: { id: string; title: string; items: FaqItem[] }[];
  name: string;
  title?: string;
}) {
  return (
    <section className="section-y">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Questions" title={title} strong />
        <div className="mt-12 space-y-12">
          {topics.map((topic) => (
            <div key={topic.id}>
              {topics.length > 1 ? (
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-deep">
                  {topic.title}
                </h3>
              ) : null}
              <FaqList items={topic.items} name={name} />
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-ink/75">
          More answers on the{" "}
          <Link to="/faq" className="text-primary underline underline-offset-4 hover:text-gold">
            full FAQ page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/** FAQPage structured data, so answers can appear directly in search results. */
export function FaqSchema({ items }: { items: FaqItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
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
