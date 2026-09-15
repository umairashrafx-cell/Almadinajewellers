import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { newsletterEmail, subscribeNewsletter } from "@/lib/newsletter";
import { whatsappLink } from "@/lib/site";

/**
 * Newsletter sign-up plus WhatsApp community CTA.
 *
 * The address is saved before the thank-you appears. This form used to show
 * "you're on the list" without storing anything, which is a promise the shop
 * could not keep; now a failure says so and the address stays in the box.
 */
export function NewsletterCta() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);

    const parsed = newsletterEmail.safeParse(email);
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? "Please check the email address.");
      return;
    }

    setState("sending");
    try {
      await subscribeNewsletter(parsed.data);
      setState("done");
      setEmail("");
    } catch (error) {
      setState("idle");
      setProblem(error instanceof Error ? error.message : "Please try again in a moment.");
    }
  }

  return (
    <section className="section-y bg-ivory">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:gap-24 lg:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
            New arrivals, first
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-warmgrey">
            One quiet email a month. New sets, gold rate notes, nothing else.
          </p>

          {state === "done" ? (
            <p
              role="status"
              className="mt-8 flex items-center gap-3 border border-gold/40 bg-champagne/25 px-4 py-4 text-sm text-ink"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-primary">
                <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
              Thank you — you&rsquo;re on the list.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  aria-invalid={Boolean(problem)}
                  aria-describedby={problem ? "newsletter-problem" : "newsletter-note"}
                  className="w-full border border-gold/50 bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-warmgrey/70 focus:border-gold"
                />
                <ActionButton type="submit" className="shrink-0" disabled={state === "sending"}>
                  {state === "sending" ? "Adding…" : "Subscribe"}
                </ActionButton>
              </div>
              {problem ? (
                <p id="newsletter-problem" role="alert" className="mt-3 text-xs text-rose">
                  {problem}
                </p>
              ) : (
                <p id="newsletter-note" className="mt-3 text-xs leading-relaxed text-ink/60">
                  Used only for this email. Ask us any time to take you off the list —{" "}
                  <Link
                    to="/privacy-policy"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    privacy policy
                  </Link>
                  .
                </p>
              )}
            </form>
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
