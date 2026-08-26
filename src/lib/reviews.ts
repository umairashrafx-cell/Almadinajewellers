import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Customer reviews.
 *
 * Every review is written by a customer and published by the shop — nothing
 * here manufactures one. That is not only a policy matter (Google treats
 * invented ratings as structured-data spam and answers with a manual action);
 * it is the same promise the rest of the site makes about weights and rates.
 *
 * `reviews` is newer than the generated Database type, which the platform
 * regenerates and must not be hand-edited, so it is reached through an untyped
 * handle with the row shape declared here.
 */
const untyped = supabase as unknown as SupabaseClient;

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type Review = {
  id: string;
  product_sku: string;
  name: string;
  city: string | null;
  rating: number;
  body: string;
  verified_purchase: boolean;
  created_at: string;
};

export const reviewSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(60, "That name is too long."),
  city: z.string().trim().max(60, "That city name is too long.").optional(),
  rating: z
    // required_error, not just invalid_type_error: the field starts undefined
    // because no star is chosen, and zod reports undefined as "Required"
    // otherwise — which is not this form's voice.
    .number({
      required_error: "Please choose a rating.",
      invalid_type_error: "Please choose a rating.",
    })
    .int()
    .min(MIN_RATING, "Please choose a rating.")
    .max(MAX_RATING, "Please choose a rating."),
  body: z
    .string()
    .trim()
    .min(10, "Please write a little more — at least ten characters.")
    .max(1500, "Please keep it under 1500 characters."),
  /** Optional. Lets the shop confirm the reviewer bought the piece. */
  orderReference: z
    .string()
    .trim()
    .max(40, "That reference is too long.")
    .optional()
    .or(z.literal("")),
});

export type ReviewDraft = z.infer<typeof reviewSchema>;

/** Approved reviews for one piece, newest first. */
export async function fetchReviews(sku: string): Promise<Review[]> {
  const { data, error } = await untyped
    .from("reviews")
    // Not select("*"): anon's grant is column-level, and asking for a column it
    // cannot read — order_reference, status — fails the whole query.
    .select("id, product_sku, name, city, rating, body, verified_purchase, created_at")
    .eq("product_sku", sku)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as Review[];
}

/**
 * Files a review for moderation.
 *
 * Goes through a SECURITY DEFINER function, which pins the status to pending
 * and refuses to let the submitter mark their own purchase verified.
 */
export async function submitReview(sku: string, draft: ReviewDraft): Promise<void> {
  const { error } = await untyped.rpc("submit_review", {
    p_sku: sku,
    p_name: draft.name.trim(),
    p_city: draft.city?.trim() || null,
    p_rating: draft.rating,
    p_body: draft.body.trim(),
    p_order_reference: draft.orderReference?.trim() || null,
  });

  if (error) {
    throw new Error(
      /unknown product/i.test(error.message)
        ? "We could not find that piece. Please reload the page and try again."
        : "We could not send that review just now. Please try again in a moment.",
    );
  }
}

export type RatingSummary = { average: number; count: number };

/**
 * The average, to one decimal.
 *
 * Returns undefined for an empty list rather than zero, because "no reviews
 * yet" and "rated zero" are different things — and an aggregateRating of 0 in
 * the page's structured data would be a claim we do not want to make.
 */
export function summarise(reviews: Review[]): RatingSummary | undefined {
  if (reviews.length === 0) return undefined;

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

/** How many reviews sit at each star, for the distribution bars. */
export function ratingBreakdown(reviews: Review[]): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

/**
 * Reviews for the server render, degrading to none.
 *
 * The product page's loader calls this. A review list is worth having in the
 * server's HTML — it is what Google reads on its first pass, and a rating that
 * only appears after JavaScript runs may never be read at all — but it is not
 * worth a 500 on the product page if the query fails.
 */
export async function safeFetchReviews(sku: string): Promise<Review[]> {
  try {
    return await fetchReviews(sku);
  } catch {
    return [];
  }
}
