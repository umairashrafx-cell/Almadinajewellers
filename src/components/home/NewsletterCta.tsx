import { useState, type FormEvent } from "react";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { whatsappLink } from "@/lib/site";

/** Newsletter sign-up plus WhatsApp community CTA. */
export function NewsletterCta() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setDone(true);
    setEmail("");
  }

  return (
    <section className="bg-ivory py-24 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:gap-24 lg:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
            New arrivals, first
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-warmgrey">
            One quiet email a month. New sets, gold rate notes, nothing else.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gold/50 bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-warmgrey/70 focus:border-gold"
            />
            <ActionButton type="submit" className="shrink-0">
              Subscribe
            </ActionButton>
          </form>
          {done && (
            <p className="mt-3 text-xs text-primary" role="status">
              Thank you — you're on the list.
            </p>
          )}
        </Reveal>

        <Reveal delay={80} className="border border-gold/40 p-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold">WhatsApp Community</p>
          <h2 className="mt-4 font-display text-3xl font-light tracking-wide text-primary">
            Daily rates and new pieces
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-warmgrey">
            Join our broadcast list for the morning gold rate and photos of freshly finished work.
          </p>
          <ActionLink
            variant="outline"
            className="mt-8"
            href={whatsappLink(
              "Assalam-o-Alaikum, please add me to the Al-Madina Jewellers WhatsApp updates.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join on WhatsApp
          </ActionLink>
        </Reveal>
      </div>
    </section>
  );
}
