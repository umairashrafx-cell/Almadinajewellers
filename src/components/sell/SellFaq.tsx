import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type Faq = { q: string; a: ReactNode };

/**
 * Questions and answers as native disclosure widgets.
 *
 * <details> rather than a scripted accordion, for three reasons. The answers
 * are in the HTML whether or not they are open, so a search engine reads them
 * and a page that fails to hydrate still works. Keyboard and screen reader
 * behaviour comes from the browser — focusable, toggled with Enter or Space,
 * announced as expanded or collapsed — rather than from code that has to get
 * it right. And the shared name makes them exclusive, so opening one closes
 * the last and a phone never becomes a wall of open answers. A browser too old
 * for the name attribute simply lets several stay open, which is harmless.
 */
export function SellFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="mt-12 divide-y divide-gold/30 border-y border-gold/30">
      {faqs.map((faq) => (
        <details key={faq.q} name="sell-your-gold-faq" className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-display text-xl leading-snug text-primary transition-colors hover:text-rate-gold-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:text-[22px] [&::-webkit-details-marker]:hidden">
            {faq.q}
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 text-primary transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={1.6} />
            </span>
          </summary>
          <div className="value-in pb-6 pr-4 text-[15px] leading-relaxed text-ink/80 sm:pr-16">
            {faq.a}
          </div>
        </details>
      ))}
    </div>
  );
}
