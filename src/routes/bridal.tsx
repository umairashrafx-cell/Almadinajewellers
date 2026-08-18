import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight } from "lucide-react";

import heroImage from "@/assets/cat-bridal.jpg";
import workshopImage from "@/assets/story-workshop.jpg";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ProductCard } from "@/components/product/ProductCard";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchCollection } from "@/lib/catalogue";
import {
  BUDGET_RANGES,
  PREFERRED_TIMES,
  bridalEnquirySchema,
  bridalHandoffMessage,
  submitBridalEnquiry,
  type BridalEnquiry,
} from "@/lib/enquiries";
import { SITE, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bridal")({
  head: () => {
    const title = `Bridal Jewellery & Consultations — ${SITE.name}`;
    const description =
      "Hallmarked 21K and 22K bridal sets, made to order in six to ten weeks. Book a private consultation at Al-Madina Jewellers, Sarafa Market, Mandi Bahauddin.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/bridal` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/bridal` }],
    };
  },
  component: BridalPage,
});

function BridalPage() {
  const { data, isPending } = useQuery({
    queryKey: ["collection", "bridal-sets"],
    queryFn: () => fetchCollection("bridal-sets"),
    staleTime: 5 * 60 * 1000,
  });

  const sets = data?.products ?? [];

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Cinematic hero */}
        <section className="relative -mt-[74px] flex min-h-[85vh] items-end overflow-hidden">
          <img
            src={heroImage}
            alt="22K gold bridal set with necklace, earrings and tikka"
            className="ken-burns absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--primary-deep) 0%, oklch(0.16 0.035 160 / 0.75) 35%, oklch(0.16 0.035 160 / 0.2) 100%)",
            }}
          />

          <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pb-28">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Bridal
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 max-w-3xl font-display text-5xl font-light tracking-wide text-ivory sm:text-6xl">
              The Bridal Collection
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-champagne/85 sm:text-base">
              A bridal set is worn once and kept for a lifetime. Ours are made to order in our own
              workshop, hallmarked, and weighed in front of you before they are billed.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <ActionLink href="#consultation">Book a Consultation</ActionLink>
              <ActionLink variant="ghostLight" href="#sets">
                View the Sets
              </ActionLink>
            </div>
          </div>
        </section>

        {/* Editorial intro */}
        <section className="py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <Reveal>
                <img
                  src={workshopImage}
                  alt="Goldsmith finishing a bridal piece by hand in the workshop"
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              </Reveal>
              <Reveal delay={80}>
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                  Made to Order
                </p>
                <h2 className="mt-4 font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
                  Six to ten weeks, start to finish
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-warmgrey">
                  <p>
                    Bridal work is not bought off a shelf. We start from the design you bring us — a
                    photograph, a family piece, or a sketch — and quote it against the day's gold
                    rate with the making charges written down before any work begins.
                  </p>
                  <p>
                    Every set is hallmarked for purity and weighed in front of you at the counter.
                    The weight on the bill is the weight in your hand, and it carries a lifetime
                    buy-back against the rate on the day you return.
                  </p>
                  <p>
                    Families order from across Pakistan and from abroad. Photographs and video calls
                    through the making, insured delivery at the end.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Bridal sets grid */}
        <section id="sets" className="scroll-mt-24 bg-champagne/20 py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The Collection"
              title="Bridal Sets"
              description="Complete suites in 21K and 22K gold. Weight, purity and stone detail on every piece."
            />

            <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
              {isPending
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="aspect-square w-full" />
                      <Skeleton className="mt-4 h-5 w-3/4" />
                      <Skeleton className="mt-2 h-3 w-1/2" />
                      <Skeleton className="mt-3 h-4 w-1/3" />
                    </div>
                  ))
                : sets.map((product, i) => (
                    <Reveal key={product.id} delay={(i % 4) * 80}>
                      <ProductCard product={product} />
                    </Reveal>
                  ))}
            </div>

            {!isPending && sets.length > 0 && (
              <div className="mt-16 text-center">
                <ActionLink variant="outline" href="/collections/bridal-sets">
                  See all bridal sets
                </ActionLink>
              </div>
            )}
          </div>
        </section>

        <Consultation />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

/**
 * The highest-value form on the site: a bridal set is a decision worth millions
 * of rupees and is almost never made from a website alone, so the goal is a
 * booked visit rather than a sale.
 */
function Consultation() {
  const [submitted, setSubmitted] = useState<BridalEnquiry | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BridalEnquiry>({
    resolver: zodResolver(bridalEnquirySchema),
  });

  const onSubmit = async (values: BridalEnquiry) => {
    setFailure(null);
    try {
      await submitBridalEnquiry(values);
      setSubmitted(values);
    } catch (error) {
      setFailure((error as Error).message);
    }
  };

  if (submitted) {
    return (
      <section id="consultation" className="scroll-mt-24 py-24 lg:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold">
            <Check className="h-6 w-6 text-primary" strokeWidth={2} />
          </span>
          <h2 className="mt-8 font-display text-3xl font-light tracking-wide text-primary sm:text-4xl">
            Your consultation is requested
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-warmgrey">
            Thank you, {submitted.name.trim().split(" ")[0]}. We will call you on{" "}
            <span className="nums">{submitted.phone.trim()}</span> to confirm a time. We are open
            11:00am to 8:00pm, {SITE.address}.
          </p>
          <p className="mt-6 text-sm leading-relaxed text-warmgrey">
            If it is easier, send the same details on WhatsApp and we will reply there.
          </p>
          <ActionLink
            className="mt-8"
            href={whatsappLink(bridalHandoffMessage(submitted))}
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
    <section id="consultation" className="scroll-mt-24 bg-primary py-24 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Private Appointment"
          title="The Bridal Consultation"
          description="An hour at the counter with the full range out on the tray, the day's rate in front of you, and no obligation. Tell us when suits and we will keep the time free."
          tone="light"
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

            <Field label="City" error={errors.city?.message}>
              <input
                {...register("city")}
                type="text"
                autoComplete="address-level2"
                className={inputClass}
              />
            </Field>

            <Field label="Wedding date" error={errors.weddingDate?.message}>
              <input {...register("weddingDate")} type="date" className={cn(inputClass, "nums")} />
            </Field>

            <Field label="Budget range" error={errors.budgetRange?.message}>
              <select {...register("budgetRange")} className={inputClass} defaultValue="">
                <option value="">Prefer not to say</option>
                {BUDGET_RANGES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Preferred time" error={errors.preferredTime?.message}>
              <select {...register("preferredTime")} className={inputClass} defaultValue="">
                <option value="">No preference</option>
                {PREFERRED_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Anything we should know" error={errors.message?.message}>
            <textarea
              {...register("message")}
              rows={4}
              placeholder="A design you have in mind, a family piece to match, the number of sets you need…"
              className={cn(inputClass, "resize-y")}
            />
          </Field>

          {failure && (
            <p
              role="alert"
              className="border border-rose/60 bg-rose/10 px-4 py-3 text-sm text-champagne"
            >
              {failure}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <ActionButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Request Consultation"}
            </ActionButton>
            <a
              href={whatsappLink(
                "Assalam-o-Alaikum, I would like to book a bridal consultation at Al-Madina Jewellers.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-gold pb-0.5 text-[11px] font-semibold uppercase tracking-widest text-gold transition-colors hover:text-champagne"
            >
              Or book on WhatsApp
            </a>
          </div>

          <p className="text-xs leading-relaxed text-champagne/60">
            We use these details only to arrange your appointment. Nothing is shared with anyone
            else.
          </p>
        </form>
      </div>
    </section>
  );
}

const inputClass =
  "mt-2 w-full border border-gold/50 bg-transparent px-3 py-2.5 text-sm text-ivory placeholder:text-champagne/40 focus-visible:border-gold focus-visible:outline-none";

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
      <span className="text-[11px] font-semibold uppercase tracking-widest text-champagne/80">
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
