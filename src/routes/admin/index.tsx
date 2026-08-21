import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarHeart, Check, Inbox, Loader2, Phone, Sparkles } from "lucide-react";

import {
  Banner,
  Card,
  Chip,
  PageHeading,
  StatCard,
  toneBar,
  toneFor,
  type Tone,
} from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchEnquiries,
  formatEnquiryDate,
  setEnquiryHandled,
  whatsappNumber,
  type AdminEnquiry,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: EnquiriesScreen,
});

const FILTERS = [
  { key: "new", label: "Needs a reply" },
  { key: "bridal", label: "Bridal" },
  { key: "product", label: "Product" },
  { key: "contact", label: "Contact" },
  { key: "callback", label: "Callback" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** Initials for the avatar disc, from however many names were given. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

/**
 * The enquiry inbox — the screen that gets opened every morning.
 *
 * Unhandled first by default, because the cost of this table is a bridal
 * booking sitting unanswered, not a missing feature. Each kind of enquiry
 * carries its own colour so the shape of the day is readable before a single
 * label is.
 */
function EnquiriesScreen() {
  const [filter, setFilter] = useState<FilterKey>("new");
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "enquiries"],
    queryFn: fetchEnquiries,
  });

  const handled = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setEnquiryHandled(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "enquiries"] }),
  });

  const all = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const byKey: Record<string, number> = { all: all.length, new: 0 };
    for (const e of all) {
      if (!e.handled) byKey["new"] = (byKey["new"] ?? 0) + 1;
      byKey[e.type] = (byKey[e.type] ?? 0) + 1;
    }
    return byKey;
  }, [all]);

  const thisWeek = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return all.filter((e) => new Date(e.created_at).getTime() >= since).length;
  }, [all]);

  const shown = useMemo(() => {
    if (filter === "all") return all;
    if (filter === "new") return all.filter((e) => !e.handled);
    return all.filter((e) => e.type === filter);
  }, [all, filter]);

  return (
    <>
      <PageHeading
        title="Enquiries"
        hint="Everything submitted through the website. Marking one handled clears it from this list — nothing is sent to the customer."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Needs a reply"
          value={counts["new"] ?? 0}
          tone={(counts["new"] ?? 0) > 0 ? "bridal" : "settled"}
          hint={(counts["new"] ?? 0) > 0 ? "Waiting on you" : "All caught up"}
          icon={Inbox}
        />
        <StatCard
          label="Bridal bookings"
          value={counts["bridal"] ?? 0}
          tone="bridal"
          hint="Highest value enquiry"
          icon={CalendarHeart}
        />
        <StatCard label="Last 7 days" value={thisWeek} tone="contact" icon={Sparkles} />
        <StatCard label="All time" value={all.length} tone="neutral" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const tone: Tone = f.key === "new" || f.key === "all" ? "neutral" : toneFor(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-ivory"
                  : "border-gold/30 bg-card text-warmgrey hover:border-gold hover:text-primary",
              )}
            >
              {f.key !== "new" && f.key !== "all" ? (
                <span
                  className={cn("h-2 w-2 rounded-full", active ? "bg-gold" : toneBar(tone))}
                  aria-hidden="true"
                />
              ) : null}
              {f.label}
              <span className={cn("nums text-xs", active ? "text-champagne" : "text-warmgrey/70")}>
                {counts[f.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {error ? <Banner tone="error">{(error as Error).message}</Banner> : null}
      {handled.error ? <Banner tone="error">{(handled.error as Error).message}</Banner> : null}

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-settled-tint text-settled">
            <Check className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <p className="mt-6 font-display text-2xl font-light text-primary">
            {filter === "new" ? "Nothing waiting for a reply" : "No enquiries of this kind yet"}
          </p>
          <p className="mt-2 text-sm text-warmgrey">
            {filter === "new"
              ? "Every enquiry has been dealt with."
              : "They will appear here as they come in."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {shown.map((enquiry) => (
            <EnquiryCard
              key={enquiry.id}
              enquiry={enquiry}
              busy={handled.isPending && handled.variables?.id === enquiry.id}
              onToggle={(value) => handled.mutate({ id: enquiry.id, value })}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function EnquiryCard({
  enquiry,
  busy,
  onToggle,
}: {
  enquiry: AdminEnquiry;
  busy: boolean;
  onToggle: (value: boolean) => void;
}) {
  const wa = whatsappNumber(enquiry.phone);
  const tone = enquiry.handled ? "settled" : toneFor(enquiry.type);

  const details: [string, string | null][] = [
    ["City", enquiry.city],
    ["Wedding date", enquiry.wedding_date],
    ["Budget", enquiry.budget_range],
    ["Preferred time", enquiry.preferred_time],
    ["Subject", enquiry.subject],
    ["Email", enquiry.email],
    ["Product", enquiry.product_sku],
  ];

  return (
    <li>
      <Card className={cn("relative overflow-hidden", enquiry.handled && "opacity-70")}>
        {/* The colour bar is the type; it turns green once dealt with. */}
        <span className={cn("absolute inset-y-0 left-0 w-1", toneBar(tone))} aria-hidden="true" />

        <div className="p-5 pl-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "nums grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  enquiry.handled ? "bg-settled-tint text-settled" : "bg-primary text-ivory",
                )}
                aria-hidden="true"
              >
                {initials(enquiry.name)}
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{enquiry.name}</span>
                  <Chip tone={tone}>{enquiry.handled ? "Handled" : enquiry.type}</Chip>
                </p>
                <p className="nums mt-1 text-xs text-warmgrey">
                  {formatEnquiryDate(enquiry.created_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${enquiry.phone.replace(/\s/g, "")}`}
                className="nums inline-flex items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {enquiry.phone}
              </a>
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-settled px-3 py-2 text-sm font-medium text-ivory transition-opacity hover:opacity-90"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          {details.some(([, v]) => v) ? (
            <dl className="mt-4 grid gap-x-8 gap-y-2 border-t border-gold/15 pt-4 text-sm sm:grid-cols-2">
              {details
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-warmgrey">{label}:</dt>
                    <dd className="text-ink">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}

          {enquiry.message ? (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-champagne/25 px-4 py-3 text-sm leading-relaxed text-ink">
              {enquiry.message}
            </p>
          ) : null}

          <label className="mt-5 inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-warmgrey">
            <input
              type="checkbox"
              checked={enquiry.handled}
              disabled={busy}
              onChange={(e) => onToggle(e.target.checked)}
              className="h-4 w-4 rounded accent-settled"
            />
            Mark handled
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          </label>
        </div>
      </Card>
    </li>
  );
}
