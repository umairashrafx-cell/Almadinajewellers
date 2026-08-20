import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import { Banner, PageHeading } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
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

/**
 * The enquiry inbox — the screen that actually gets opened every day.
 *
 * Unhandled first by default, because the cost of this table is a bridal
 * booking sitting unanswered, not a missing feature.
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

  const shown = useMemo(() => {
    if (filter === "all") return all;
    if (filter === "new") return all.filter((e) => !e.handled);
    return all.filter((e) => e.type === filter);
  }, [all, filter]);

  return (
    <>
      <PageHeading
        title="Enquiries"
        hint="Everything submitted through the website. Marking one handled only clears it from this list — nothing is sent to the customer."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="nums ml-2 text-xs opacity-70">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? <Banner tone="error">{(error as Error).message}</Banner> : null}

      {handled.error ? <Banner tone="error">{(handled.error as Error).message}</Banner> : null}

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-md border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === "new" ? "Nothing waiting for a reply." : "No enquiries of this kind yet."}
        </p>
      ) : (
        <ul className="space-y-3">
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
    <li
      className={cn(
        "rounded-md border bg-card p-4",
        enquiry.handled ? "border-border opacity-60" : "border-primary/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{enquiry.name}</span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {enquiry.type}
            </span>
          </p>
          <p className="nums mt-1 text-xs text-muted-foreground">
            {formatEnquiryDate(enquiry.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${enquiry.phone.replace(/\s/g, "")}`}>
              <Phone aria-hidden="true" />
              {enquiry.phone}
            </a>
          </Button>
          {wa ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {details
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="text-muted-foreground">{label}:</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {enquiry.message ? (
        <p className="mt-3 whitespace-pre-wrap border-l-2 border-border pl-3 text-sm leading-relaxed">
          {enquiry.message}
        </p>
      ) : null}

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={enquiry.handled}
          disabled={busy}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Handled
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      </label>
    </li>
  );
}
