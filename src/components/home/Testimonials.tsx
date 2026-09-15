import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { fetchFeaturedReviews, type FeaturedReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/** Longest quote shown in full; longer reviews are cut at a word and link to the piece. */
const MAX_QUOTE = 220;

function shorten(text: string): { quote: string; cut: boolean } {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= MAX_QUOTE) return { quote: clean, cut: false };
  const slice = clean.slice(0, MAX_QUOTE);
  return { quote: `${slice.slice(0, slice.lastIndexOf(" ")).replace(/[,.;:]$/, "")}…`, cut: true };
}

/**
 * Real customer reviews in Cormorant italic on champagne.
 *
 * These used to be three quotes written into the code. Now they are the most
 * recent reviews customers left on the site and the shop approved, rated four
 * stars or more, each linked to the piece it is about. With none approved yet,
 * the section is not shown at all rather than filled with something invented.
 */
export function Testimonials() {
  const { data: reviews } = useQuery({
    queryKey: ["reviews", "featured"],
    queryFn: () => fetchFeaturedReviews(3),
    staleTime: 10 * 60 * 1000,
  });

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="section-y bg-champagne" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="testimonials-heading"
          className="text-center font-sans text-[11px] font-normal uppercase tracking-[0.3em] text-primary/70"
        >
          In Their Words
        </h2>

        <div
          className={cn(
            "mx-auto mt-14 grid gap-12",
            reviews.length === 1 && "max-w-xl",
            reviews.length === 2 && "max-w-4xl md:grid-cols-2",
            reviews.length >= 3 && "md:grid-cols-3",
          )}
        >
          {reviews.map((review, i) => (
            <ReviewQuote key={review.id} review={review} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewQuote({ review, delay }: { review: FeaturedReview; delay: number }) {
  const { quote, cut } = shorten(review.body);

  return (
    <Reveal delay={delay} as="article" className="text-center">
      <p className="flex justify-center gap-1" aria-label={`Rated ${review.rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              i < review.rating ? "fill-primary text-primary" : "text-primary/30",
            )}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ))}
      </p>
      <blockquote className="mt-5 font-display text-xl font-light italic leading-relaxed text-primary">
        “{quote}”
      </blockquote>
      <div className="mx-auto mt-6 h-px w-10 bg-gold" />
      <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-primary/70">
        {review.name}
        {review.city ? ` · ${review.city}` : ""}
        {review.verified_purchase ? " · Verified purchase" : ""}
      </p>
      {review.product ? (
        <Link
          to="/products/$slug"
          params={{ slug: review.product.slug }}
          className="mt-2 inline-block text-xs text-primary/80 underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          {cut ? "Read the full review on " : "On "}
          {review.product.name}
        </Link>
      ) : null}
    </Reveal>
  );
}
