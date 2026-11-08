import { Check, ChevronDown, Loader2, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  CONTACT_SUBJECTS,
  contactEnquirySchema,
  submitContactEnquiry,
  type ContactEnquiry,
} from "@/lib/enquiries";
import { CONTACT_FAQS } from "@/lib/page-copy";
import { SITE, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

import { AppButton, AppLink } from "../components/AppButton";

/**
 * Reaching the shop, in the app.
 *
 * WhatsApp first and the form second, which is the order the website puts
 * them in and the order the shop actually works in: a message is answered in
 * minutes, a form is a callback. Both are here because they answer different
 * questions — "is this in stock" wants a reply now, "please call me about a
 * bridal set" wants somebody to ring at a sensible hour.
 *
 * The form is the website's own: the same `contactEnquirySchema`, the same
 * `submitContactEnquiry`, the same `enquiries` table and the same subjects.
 * Nothing new is written and no new column is needed — an enquiry sent from
 * the app arrives in the shop's list indistinguishable from one sent from the
 * website, which is the point.
 *
 * Deliberately not here: the address, the hours and the map. Those are the
 * Our Store screen, one tap away in the same drawer, and a second copy of a
 * shop's opening hours is a second thing to get wrong at Eid.
 */
export function ContactScreen({ showStore }: { showStore: () => void }) {
  return (
    <div className="px-4 pt-5 pb-10">
      <header>
        <p className="text-[10px] font-semibold tracking-[0.3em] text-gold-deep uppercase">
          Contact
        </p>
        <h1 className="font-display mt-2.5 text-2xl leading-tight text-primary">
          Talk to the shop
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-warmgrey">
          WhatsApp is the fastest way to reach us. Or send the form below and we will call you back.
        </p>
      </header>

      <Channels />
      <Form />
      <Questions />

      <button
        type="button"
        onClick={showStore}
        className="mt-6 w-full text-center text-xs font-semibold tracking-wide text-gold-deep uppercase"
      >
        Address, hours and directions
      </button>
    </div>
  );
}

/** The two that reach a person now. */
function Channels() {
  return (
    <section className="mt-6 space-y-2.5">
      <AppLink
        href={whatsappLink("Assalam-o-Alaikum, I have a question about your jewellery.")}
        className="bg-[#25D366] text-white"
        variant="quiet"
      >
        <WhatsAppIcon className="h-4 w-4" aria-hidden />
        WhatsApp {SITE.whatsappDisplay}
      </AppLink>

      {/*
        Both numbers, because the shop publishes both and a customer whose
        first call rings out should not have to go looking for the second.
      */}
      {SITE.phones.map((number) => (
        <AppLink key={number} href={`tel:${number.replace(/\s+/g, "")}`} variant="quiet">
          <Phone className="h-4 w-4 text-gold-deep" aria-hidden />
          <span className="nums">{number}</span>
        </AppLink>
      ))}
    </section>
  );
}

const field =
  "mt-2 w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-gold";

function Field({
  label,
  htmlFor,
  problem,
  note,
  children,
}: {
  label: string;
  htmlFor: string;
  problem?: string | undefined;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold tracking-[0.18em] text-warmgrey uppercase"
      >
        {label}
      </label>
      {children}
      {problem ? (
        <p className="mt-1.5 text-xs font-medium text-destructive">{problem}</p>
      ) : note ? (
        <p className="mt-1.5 text-[11px] text-warmgrey">{note}</p>
      ) : null}
    </div>
  );
}

type Fields = { name: string; phone: string; email: string; subject: string; message: string };

const EMPTY: Fields = { name: "", phone: "", email: "", subject: "", message: "" };

/**
 * The callback form.
 *
 * Validated by the website's own schema rather than by rules written here, so
 * a number the website would reject cannot be accepted by the app and land in
 * the shop's list as a lead nobody can ring. Errors are shown against the
 * field they belong to and cleared as soon as that field is touched.
 */
function Form() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [problems, setProblems] = useState<Partial<Record<keyof Fields, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setProblems((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;

    setFailure(null);
    const parsed = contactEnquirySchema.safeParse(fields);

    if (!parsed.success) {
      const found: Partial<Record<keyof Fields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Fields | undefined;
        if (key && !found[key]) found[key] = issue.message;
      }
      setProblems(found);
      return;
    }

    setSending(true);
    try {
      await submitContactEnquiry(parsed.data satisfies ContactEnquiry);
      setSent(true);
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "That did not send. Please try again, or message us on WhatsApp.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-white p-5 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-champagne/60">
          <Check className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <h2 className="font-display mt-3 text-lg text-primary">We have it</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-warmgrey">
          Somebody from the shop will call you back. If it is urgent, WhatsApp is faster.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-ivory p-5">
        <h2 className="font-display mb-4 text-lg text-primary">Ask us to call you</h2>

        <Field label="Your name" htmlFor="contact-name" problem={problems.name}>
          <input
            id="contact-name"
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            autoComplete="name"
            className={field}
          />
        </Field>

        <Field label="Phone" htmlFor="contact-phone" problem={problems.phone}>
          <input
            id="contact-phone"
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn(field, "nums")}
          />
        </Field>

        <Field
          label="Email (optional)"
          htmlFor="contact-email"
          problem={problems.email}
          note="Only if you would rather be written to than called."
        >
          <input
            id="contact-email"
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            className={field}
          />
        </Field>

        <Field label="What about?" htmlFor="contact-subject" problem={problems.subject}>
          <select
            id="contact-subject"
            value={fields.subject}
            onChange={(e) => set("subject", e.target.value)}
            className={field}
          >
            <option value="">Not sure</option>
            {CONTACT_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Message" htmlFor="contact-message" problem={problems.message}>
          <textarea
            id="contact-message"
            value={fields.message}
            onChange={(e) => set("message", e.target.value)}
            rows={4}
            className={cn(field, "resize-none")}
          />
        </Field>
      </section>

      {failure ? (
        <p role="alert" className="mt-5 text-sm font-medium text-destructive">
          {failure}
        </p>
      ) : null}

      <AppButton type="submit" disabled={sending} className="mt-6">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {sending ? "Sending…" : "Send it to the shop"}
      </AppButton>

      <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">
        Nothing is charged and nothing is committed. We will call to talk it through.
      </p>
    </form>
  );
}

/** One open at a time, as on the sell screen. */
function Questions() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mt-9">
      <h2 className="font-display text-lg text-primary">Asked often</h2>

      <ul className="mt-4 divide-y divide-gold/15 overflow-hidden rounded-xl border border-gold/15 bg-white">
        {CONTACT_FAQS.map((faq) => {
          const isOpen = open === faq.q;
          const panelId = `contact-faq-${faq.q.replace(/\W+/g, "-").toLowerCase()}`;

          return (
            <li key={faq.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((current) => (current === faq.q ? null : faq.q))}
                className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left active:bg-champagne/30"
              >
                <span className="text-[13px] leading-snug font-medium text-ink">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-warmgrey transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <p id={panelId} className="px-4 pb-4 text-[13px] leading-relaxed text-warmgrey">
                  {faq.a}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
