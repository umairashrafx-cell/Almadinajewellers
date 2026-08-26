import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, MessageSquareQuote, Star, Trash2 } from "lucide-react";

import { Banner, Card, Chip, PageHeading, StatCard, toneBar } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";

import {
  deleteReview,
  fetchAllReviews,
  formatEnquiryDate,
  moderateReview,
  type AdminReview,
  type ReviewStatus,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsScreen,
});

const FILTERS: { key: ReviewStatus | "all"; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Published" },
  { key: "rejected", label: "Hidden" },
  { key: "all", label: "All" },
];

function toneFor(status: string) {
  if (status === "pending") return "bridal" as const;
  if (status === "approved") return "settled" as const;
  return "neutral" as const;
}

function ReviewsScreen() {
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: fetchAllReviews,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
    // The storefront reads a different, narrower query.
    void queryClient.invalidateQueries({ queryKey: ["reviews"] });
  };

  const moderate = useMutation({
    mutationFn: ({
      id,
      status,
      verified,
    }: {
      id: string;
      status: ReviewStatus;
      verified?: boolean;
    }) => moderateReview(id, status, verified),
    onSuccess: invalidate,
  });

  const remove = useMutation({ mutationFn: deleteReview, onSuccess: invalidate });

  const all = useMemo(() => data ?? [], [data]);
  const waiting = all.filter((r) => r.status === "pending");
  const published = all.filter((r) => r.status === "approved");

  const average = useMemo(() => {
    if (published.length === 0) return "—";
    const total = published.reduce((sum, r) => sum + r.rating, 0);
    return (Math.round((total / published.length) * 10) / 10).toFixed(1);
  }, [published]);

  const shown = useMemo(
    () => (filter === "all" ? all : all.filter((r) => r.status === filter)),
    [all, filter],
  );

  return (
    <>
      <PageHeading
        title="Reviews"
        hint="Nothing appears on the website until you publish it here. Star ratings in Google are built from what you approve, so publish only what a real customer wrote."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Waiting for you"
          value={waiting.length}
          tone={waiting.length > 0 ? "bridal" : "settled"}
          hint={waiting.length > 0 ? "Not visible to anyone yet" : "Nothing to read"}
          icon={MessageSquareQuote}
        />
        <StatCard label="Published" value={published.length} tone="settled" />
        <StatCard label="Average rating" value={average} tone="contact" hint="Across published" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-ivory"
                : "border-gold/30 bg-card text-warmgrey hover:border-gold hover:text-primary",
            )}
          >
            {f.label}
            <span className="nums ml-2 text-xs opacity-70">
              {f.key === "all" ? all.length : all.filter((r) => r.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {error ? <Banner tone="error">{(error as Error).message}</Banner> : null}
      {moderate.error ? <Banner tone="error">{(moderate.error as Error).message}</Banner> : null}
      {remove.error ? <Banner tone="error">{(remove.error as Error).message}</Banner> : null}

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="font-display text-2xl font-light text-primary">Nothing here</p>
          <p className="mt-2 text-sm text-warmgrey">
            Reviews arrive as customers leave them on a product page.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {shown.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={
                (moderate.isPending && moderate.variables?.id === review.id) ||
                (remove.isPending && remove.variables === review.id)
              }
              onModerate={(status, verified) =>
                moderate.mutate({
                  id: review.id,
                  status,
                  ...(verified !== undefined && { verified }),
                })
              }
              onDelete={() => remove.mutate(review.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function ReviewCard({
  review,
  busy,
  onModerate,
  onDelete,
}: {
  review: AdminReview;
  busy: boolean;
  onModerate: (status: ReviewStatus, verified?: boolean) => void;
  onDelete: () => void;
}) {
  const tone = toneFor(review.status);

  return (
    <li>
      <Card className="relative overflow-hidden">
        <span className={cn("absolute inset-y-0 left-0 w-1", toneBar(tone))} aria-hidden="true" />

        <div className="p-5 pl-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < review.rating ? "fill-gold text-gold" : "text-gold/30",
                      )}
                      strokeWidth={1.5}
                    />
                  ))}
                </span>
                <span className="sr-only">{review.rating} out of 5</span>
                <span className="font-semibold text-primary">{review.name}</span>
                <Chip tone={tone}>{review.status}</Chip>
                {review.verified_purchase ? (
                  <Chip tone="settled">
                    <BadgeCheck className="mr-1 inline h-3 w-3" strokeWidth={2} />
                    Verified
                  </Chip>
                ) : null}
              </p>
              <p className="nums mt-1 text-xs text-warmgrey">
                {review.product_sku}
                {review.city ? ` · ${review.city}` : ""} · {formatEnquiryDate(review.created_at)}
              </p>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-champagne/25 px-4 py-3 text-sm leading-relaxed text-ink">
            {review.body}
          </p>

          {review.order_reference ? (
            <p className="nums mt-3 text-xs text-warmgrey">
              Order reference given:{" "}
              <span className="font-semibold text-primary">{review.order_reference}</span> — check
              it on the Orders screen before marking this verified.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-warmgrey" aria-hidden="true" />
            ) : null}

            {review.status !== "approved" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onModerate("approved")}
                className="rounded-lg bg-settled px-3 py-2 text-sm font-medium text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Publish
              </button>
            ) : null}

            {review.status === "approved" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onModerate("rejected")}
                className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-primary disabled:opacity-50"
              >
                Hide
              </button>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => onModerate(review.status, !review.verified_purchase)}
              className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-primary disabled:opacity-50"
            >
              {review.verified_purchase ? "Unmark verified" : "Mark verified purchase"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Delete this review permanently? This cannot be undone.")) onDelete();
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>
      </Card>
    </li>
  );
}
