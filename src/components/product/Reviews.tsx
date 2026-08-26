import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, Loader2, Star } from "lucide-react";

import { ActionButton } from "@/components/ui/ActionButton";
import { Skeleton } from "@/components/ui/skeleton";

import {
  MAX_RATING,
  fetchReviews,
  formatReviewDate,
  ratingBreakdown,
  reviewSchema,
  submitReview,
  summarise,
  type Review,
  type ReviewDraft,
} from "@/lib/reviews";
import { cn } from "@/lib/utils";

/**
 * Reviews for one piece.
 *
 * Shows only what the shop has approved. Nothing is written here that a
 * customer did not write, and the page says plainly when there is nothing yet
 * rather than filling the space with anything else.
 */
export function Reviews({
  sku,
  productName,
  initial,
}: {
  sku: string;
  productName: string;
  /** Loaded with the page, so the list and its rating are in the server HTML. */
  initial: Review[];
}) {
  const { data, isPending, error } = useQuery({
    queryKey: ["reviews", sku],
    queryFn: () => fetchReviews(sku),
    initialData: initial,
  });

  const reviews = data ?? [];
  const summary = summarise(reviews);

  return (
    <section id="reviews" className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 className="font-display text-3xl font-light tracking-wide text-primary">
            Customer reviews
          </h2>

          {isPending ? (
            <div className="mt-8 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <p className="mt-6 text-sm text-warmgrey">
              Reviews could not be loaded just now. Everything else on this page is unaffected.
            </p>
          ) : reviews.length === 0 ? (
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-warmgrey">
              No reviews for this piece yet. If you have bought it, yours would be the first — and
              it will appear here once we have read it.
            </p>
          ) : (
            <>
              <Summary reviews={reviews} />
              <ul className="mt-10 divide-y divide-gold/20 border-t border-gold/20">
                {reviews.map((review) => (
                  <ReviewItem key={review.id} review={review} />
                ))}
              </ul>
            </>
          )}
        </div>

        <ReviewForm sku={sku} productName={productName} hasReviews={reviews.length > 0} />
      </div>

      {summary ? <ReviewSchema sku={sku} reviews={reviews} /> : null}
    </section>
  );
}

/** Filled stars up to `rating`, hollow after it. */
function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden="true">
      {Array.from({ length: MAX_RATING }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-4 w-4", i < Math.round(rating) ? "fill-gold text-gold" : "text-gold/30")}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function Summary({ reviews }: { reviews: Review[] }) {
  const summary = summarise(reviews);
  if (!summary) return null;

  const breakdown = ratingBreakdown(reviews);

  return (
    <div className="mt-8 flex flex-wrap items-start gap-x-12 gap-y-6">
      <div>
        <p className="nums font-display text-5xl font-light text-primary">{summary.average}</p>
        <Stars rating={summary.average} className="mt-2" />
        <p className="nums mt-2 text-xs text-warmgrey">
          {summary.count} {summary.count === 1 ? "review" : "reviews"}
        </p>
      </div>

      <ul className="min-w-[200px] flex-1 space-y-1.5">
        {breakdown.map(({ stars, count }) => (
          <li key={stars} className="flex items-center gap-3 text-xs text-warmgrey">
            <span className="nums w-3 text-right">{stars}</span>
            <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={1.5} aria-hidden="true" />
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-champagne/50">
              <span
                className="block h-full rounded-full bg-gold"
                style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }}
              />
            </span>
            <span className="nums w-6">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="py-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        <span className="sr-only">{review.rating} out of 5</span>
        <p className="text-sm font-semibold text-primary">{review.name}</p>
        {review.city ? <p className="text-xs text-warmgrey">{review.city}</p> : null}
        {review.verified_purchase ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-settled-tint px-2 py-0.5 text-[11px] font-medium text-settled">
            <BadgeCheck className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Verified purchase
          </span>
        ) : null}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{review.body}</p>
      <p className="nums mt-2 text-xs text-warmgrey">{formatReviewDate(review.created_at)}</p>
    </li>
  );
}

function ReviewForm({
  sku,
  productName,
  hasReviews,
}: {
  sku: string;
  productName: string;
  hasReviews: boolean;
}) {
  const [sent, setSent] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewDraft>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { name: "", city: "", body: "", orderReference: "" },
  });

  const rating = watch("rating");

  const mutation = useMutation({
    mutationFn: (values: ReviewDraft) => submitReview(sku, values),
    onSuccess: () => {
      setSent(true);
      reset();
      // Nothing new is visible yet — it is pending — but this keeps the list
      // honest if the shop approves it while the page is still open.
      void queryClient.invalidateQueries({ queryKey: ["reviews", sku] });
    },
  });

  if (sent) {
    return (
      <aside className="h-fit border border-gold bg-champagne/30 p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold/50 bg-ivory">
          <Check className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <p className="mt-5 font-display text-xl font-light text-primary">Thank you</p>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          We read every review before it appears, so yours will show here shortly rather than
          straight away.
        </p>
      </aside>
    );
  }

  return (
    <aside className="h-fit border border-gold/40 bg-card p-7">
      <h3 className="font-display text-xl font-light tracking-wide text-primary">
        {hasReviews ? "Write a review" : "Be the first to review"}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-warmgrey">
        For {productName}. We publish reviews after reading them, so yours will not appear
        instantly.
      </p>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="mt-6 space-y-4"
      >
        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
            Your rating
          </legend>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: MAX_RATING }).map((_, i) => {
              const value = i + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("rating", value, { shouldValidate: true })}
                  aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                  aria-pressed={rating === value}
                  className="rounded p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      rating >= value ? "fill-gold text-gold" : "text-gold/40",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>
          <FieldError message={errors.rating?.message} />
        </fieldset>

        <Field label="Your name" error={errors.name?.message}>
          <input {...register("name")} className={inputClass} autoComplete="name" />
        </Field>

        <Field label="City (optional)" error={errors.city?.message}>
          <input {...register("city")} className={inputClass} autoComplete="address-level2" />
        </Field>

        <Field label="Your review" error={errors.body?.message}>
          <textarea {...register("body")} rows={5} className={cn(inputClass, "resize-y")} />
        </Field>

        <Field
          label="Order reference (optional)"
          error={errors.orderReference?.message}
          hint="If you ordered through this website, adding it lets us mark your review a verified purchase."
        >
          <input {...register("orderReference")} className={cn(inputClass, "nums")} />
        </Field>

        {mutation.error ? (
          <p role="alert" className="text-sm text-destructive">
            {(mutation.error as Error).message}
          </p>
        ) : null}

        <ActionButton type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Send review
        </ActionButton>
      </form>
    </aside>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-[2px] border border-gold/40 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs leading-relaxed text-warmgrey">{hint}</span>
      ) : null}
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1 block text-xs text-destructive">
      {message}
    </span>
  );
}

/**
 * Review and aggregateRating for the Product on this page.
 *
 * Rendered only when approved reviews exist — the whole point of building this
 * rather than typing numbers into the markup. Search Console reports the two
 * fields as missing until then, and that report is correct.
 *
 * It sits inside the reviews section rather than beside the Product schema so
 * that the data it describes and the data it is built from cannot drift apart.
 */
function ReviewSchema({ sku, reviews }: { sku: string; reviews: Review[] }) {
  const summary = summarise(reviews);
  if (!summary) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    sku,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: summary.average,
      reviewCount: summary.count,
      bestRating: MAX_RATING,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      datePublished: r.created_at.slice(0, 10),
      reviewBody: r.body,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: MAX_RATING,
        worstRating: 1,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Approved review rows, serialised. Published only after a person read it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
