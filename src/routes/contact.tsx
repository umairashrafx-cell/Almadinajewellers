import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  CONTACT_SUBJECTS,
  contactEnquirySchema,
  submitContactEnquiry,
  type ContactEnquiry,
} from "@/lib/enquiries";
import { SITE, STORES, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  head: () => {
    const title = `Contact Us — ${SITE.name}`;
    const description = `Call ${SITE.phones[0]}, message us on WhatsApp at ${SITE.whatsappDisplay}, or send an enquiry. Sarafa Market, Mandi Bahauddin. Open daily 11:00am to 8:00pm.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/contact` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/contact` }],
    };
  },
  component: ContactPage,
});

const FAQS = [
  {
    q: "How do I order if I am not in Mandi Bahauddin?",
    a: "Message us on WhatsApp with the piece you want. We send photographs and a video, confirm the weight and the price against the day's gold rate, and deliver insured anywhere in Pakistan at no charge.",
  },
  {
    q: "How long does a bridal set take?",
    a: "Six to ten weeks, because bridal work is made to order. We send photographs through the making so nothing is a surprise at the end. If your wedding is sooner than that, tell us the date and we will be honest about what is possible.",
  },
  {
    q: "How is the price calculated?",
    a: "Gold value plus making charges plus the value of any stones. The gold value is the net metal weight multiplied by the day's rate for that karat. Every product page shows the three parts separately, and the final price is confirmed at the counter on the day you buy.",
  },
  {
    q: "Can I exchange or sell a piece back?",
    a: "Yes. Bring the piece and its bill and we buy it back against the gold rate on the day you return, not the day you bought it. Making charges are not returned, which is standard across the trade.",
  },
  {
    q: "Do you take card or online payment?",
    a: "Payment is arranged in store, or on confirmed delivery. There is no online checkout on this website — you enquire, we agree the price and the weight, and then payment is settled directly.",
  },
  {
    q: "Can rings be resized?",
    a: "Yes, and sizing is adjusted in store at no charge. For a ring bought as a gift, come in with the recipient afterwards and we will fit it properly.",
  },
];

function ContactPage() {
  const store = STORES[0]!;

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="bg-primary px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Contact
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Contact Us
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              WhatsApp is the fastest way to reach us. Or send the form below and we will call you
              back.
            </p>
          </div>
        </section>

        {/* Direct channels */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <Reveal>
              <div className="border-t border-gold/40 pt-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                  WhatsApp
                </h2>
                <a
                  href={whatsappLink("Assalam-o-Alaikum, I have a question about your jewellery.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nums mt-3 block font-display text-2xl font-light text-primary transition-colors hover:text-gold"
                >
                  {SITE.whatsappDisplay}
                </a>
                <p className="mt-2 text-xs text-warmgrey">Usually answered the same day.</p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="border-t border-gold/40 pt-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                  Phone
                </h2>
                <ul className="mt-3 space-y-1">
                  {store.phones.map((phone) => (
                    <li key={phone}>
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="nums font-display text-2xl font-light text-primary transition-colors hover:text-gold"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-warmgrey">{store.hours}</p>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="border-t border-gold/40 pt-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                  Visit
                </h2>
                <address className="mt-3 not-italic leading-relaxed text-ink">
                  {store.address}
                </address>
                <Link
                  to="/stores"
                  className="mt-3 inline-block border-b border-gold pb-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-gold"
                >
                  Map &amp; directions
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <ContactForm />

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 py-24 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Questions"
              title="Frequently Asked"
              description="Ordering, pricing, delivery and buy-back."
            />

            <Accordion type="single" collapsible className="mt-12 border-t border-gold/30">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <FaqSchema />
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function ContactForm() {
  const [sent, setSent] = useState<ContactEnquiry | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactEnquiry>({
    resolver: zodResolver(contactEnquirySchema),
  });

  const onSubmit = async (values: ContactEnquiry) => {
    setFailure(null);
    try {
      await submitContactEnquiry(values);
      setSent(values);
    } catch (error) {
      setFailure((error as Error).message);
    }
  };

  if (sent) {
    return (
      <section className="bg-champagne/25 py-24 lg:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold">
            <Check className="h-6 w-6 text-primary" strokeWidth={2} />
          </span>
          <h2 className="mt-8 font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
            Message received
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-warmgrey">
            Thank you, {sent.name.trim().split(" ")[0]}. We will get back to you on{" "}
            <span className="nums">{sent.phone.trim()}</span>, usually the same day.
          </p>
          <ActionLink
            className="mt-8"
            variant="outline"
            href={whatsappLink(
              `Assalam-o-Alaikum, I have just sent an enquiry through your website.\nName: ${sent.name.trim()}${sent.subject ? `\nAbout: ${sent.subject}` : ""}`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue on WhatsApp
          </ActionLink>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-champagne/25 py-24 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Send a Message"
          title="How can we help?"
          description="Tell us what you are looking for and we will come back to you with weights, prices and photographs."
        />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-12 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Your name" error={errors.name?.message} required>
              <input
                {...register("name")}
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                className={inputClass}
              />
            </Field>

            <Field label="Phone" error={errors.phone?.message} required>
              <input
                {...register("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0321 1234567"
                aria-invalid={Boolean(errors.phone)}
                className={cn(inputClass, "nums")}
              />
            </Field>

            <Field label="Email" error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className={inputClass}
              />
            </Field>

            <Field label="Subject" error={errors.subject?.message}>
              <select {...register("subject")} className={inputClass} defaultValue="">
                <option value="">General enquiry</option>
                {CONTACT_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Message" error={errors.message?.message} required>
            <textarea
              {...register("message")}
              rows={5}
              aria-invalid={Boolean(errors.message)}
              placeholder="The piece, the weight, the occasion — whatever helps us answer properly."
              className={cn(inputClass, "resize-y")}
            />
          </Field>

          {failure && (
            <p role="alert" className="border border-rose/60 bg-rose/10 px-4 py-3 text-sm text-ink">
              {failure}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <ActionButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send Message"}
            </ActionButton>
            <a
              href={whatsappLink("Assalam-o-Alaikum, I have a question about your jewellery.")}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-gold pb-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-gold"
            >
              Or message on WhatsApp
            </a>
          </div>

          <p className="text-xs leading-relaxed text-warmgrey">
            We use your details only to answer this enquiry. Nothing is shared with anyone else.
          </p>
        </form>
      </div>
    </section>
  );
}

const inputClass =
  "mt-2 w-full border border-gold/50 bg-ivory px-3 py-2.5 text-sm text-ink placeholder:text-warmgrey/60 focus-visible:border-gold focus-visible:outline-none";

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string | undefined;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
        {label}
        {required && <span className="ml-1 text-gold">*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-2 block text-xs text-rose">
          {error}
        </span>
      )}
    </label>
  );
}

/** FAQPage schema — these answers can surface directly in search results. */
function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
