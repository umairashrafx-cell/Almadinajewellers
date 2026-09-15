import { ActionLink } from "@/components/ui/ActionButton";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { SITE, STORES, whatsappLink } from "@/lib/site";

/**
 * The closing call to action on an inner page.
 *
 * One primary action — WhatsApp, which is how most customers reach the shop —
 * and a phone call beside it, on the champagne band the existing pages close
 * with. The shop's hours sit underneath so nobody makes a Friday trip.
 */
export function CtaBand({
  eyebrow,
  title,
  description,
  whatsappMessage,
}: {
  eyebrow: string;
  title: string;
  description: string;
  /** Prefilled WhatsApp text, so the shop knows where the customer came from. */
  whatsappMessage: string;
}) {
  const store = STORES[0];
  const phone = SITE.phones[0];

  return (
    <section className="section-y bg-champagne/25">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} strong />
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionLink
            href={whatsappLink(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ask on WhatsApp
          </ActionLink>
          {phone ? (
            <ActionLink variant="outline" href={`tel:${phone.replace(/\s/g, "")}`}>
              Call <span className="nums">{phone}</span>
            </ActionLink>
          ) : null}
        </div>
        {store ? (
          <p className="mt-8 text-center text-xs leading-relaxed text-ink/70">
            {store.name}, {store.city} · {store.hours} · {store.closed}
          </p>
        ) : null}
      </div>
    </section>
  );
}
