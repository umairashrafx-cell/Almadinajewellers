import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, Ruler, Sparkles } from "lucide-react";

import { Banner, Card, Chip, PageHeading, StatCard, toneBar } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchCustomOrders,
  formatEnquiryDate,
  setCustomOrderStatus,
  signAttachment,
  whatsappNumber,
  type AdminCustomOrder,
  type CustomOrderStatus,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/custom-orders")({
  component: CustomOrdersScreen,
});

const STATUSES: { key: CustomOrderStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "discussed", label: "Discussed" },
  { key: "quoted", label: "Quoted" },
  { key: "closed", label: "Closed" },
];

function toneFor(status: string) {
  if (status === "new") return "bridal" as const;
  if (status === "discussed") return "contact" as const;
  if (status === "quoted") return "callback" as const;
  return "settled" as const;
}

function CustomOrdersScreen() {
  const [filter, setFilter] = useState<CustomOrderStatus | "all">("new");
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "custom-orders"],
    queryFn: fetchCustomOrders,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomOrderStatus }) =>
      setCustomOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "custom-orders"] }),
  });

  const all = useMemo(() => data ?? [], [data]);
  const open = all.filter((o) => o.status === "new");
  const withVoice = all.filter((o) => o.voice_path).length;

  const shown = useMemo(
    () => (filter === "all" ? all : all.filter((o) => o.status === filter)),
    [all, filter],
  );

  return (
    <>
      <PageHeading
        title="Custom orders"
        hint="Ideas people have sent in — a picture, a description, a voice note, or all three. Listen or look first, then call: most of these are a conversation, not an order."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Waiting for you"
          value={open.length}
          tone={open.length > 0 ? "bridal" : "settled"}
          hint={open.length > 0 ? "Nobody has been called yet" : "All caught up"}
          icon={Sparkles}
        />
        <StatCard label="With a voice note" value={withVoice} tone="contact" hint="Listen first" />
        <StatCard label="All time" value={all.length} tone="neutral" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[{ key: "all" as const, label: "All" }, ...STATUSES].map((f) => (
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
              {f.key === "all" ? all.length : all.filter((o) => o.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {error ? <Banner tone="error">{(error as Error).message}</Banner> : null}
      {update.error ? <Banner tone="error">{(update.error as Error).message}</Banner> : null}

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="font-display text-2xl font-light text-primary">Nothing here yet</p>
          <p className="mt-2 text-sm text-warmgrey">
            These arrive from the Custom Order page on the website.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {shown.map((order) => (
            <EnquiryCard
              key={order.id}
              order={order}
              busy={update.isPending && update.variables?.id === order.id}
              onStatus={(status) => update.mutate({ id: order.id, status })}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function EnquiryCard({
  order,
  busy,
  onStatus,
}: {
  order: AdminCustomOrder;
  busy: boolean;
  onStatus: (status: CustomOrderStatus) => void;
}) {
  const tone = toneFor(order.status);
  const wa = whatsappNumber(order.phone);

  /*
   * Attachments live in a private bucket, so each one needs a signed link.
   * Signed on render rather than on click: the shop should see the photograph
   * without having to ask for it, and an hour is longer than anyone spends on
   * one enquiry.
   */
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (order.image_path) void signAttachment(order.image_path).then((u) => live && setImageUrl(u));
    if (order.voice_path) void signAttachment(order.voice_path).then((u) => live && setVoiceUrl(u));
    return () => {
      live = false;
    };
  }, [order.image_path, order.voice_path]);

  return (
    <li>
      <Card className="relative overflow-hidden">
        <span className={cn("absolute inset-y-0 left-0 w-1", toneBar(tone))} aria-hidden="true" />

        <div className="p-5 pl-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex flex-wrap items-center gap-2">
                <span className="nums font-semibold tracking-widest text-primary">
                  {order.reference}
                </span>
                <Chip tone={tone}>{order.status}</Chip>
              </p>
              <p className="mt-1 text-sm text-ink">
                {order.name}
                {order.city ? ` · ${order.city}` : ""}
              </p>
              <p className="nums mt-1 text-xs text-warmgrey">
                {formatEnquiryDate(order.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {order.category_slug ? <Chip tone="product">{order.category_slug}</Chip> : null}
              {order.size ? (
                <Chip tone="neutral">
                  <Ruler className="mr-1 inline h-3 w-3" strokeWidth={2} />
                  {order.size}
                </Chip>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
            {order.image_path ? (
              <div>
                {imageUrl ? (
                  <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={imageUrl}
                      alt={`Reference picture sent with ${order.reference}`}
                      className="h-40 w-full rounded-lg border border-gold/25 object-cover transition-opacity hover:opacity-90"
                    />
                  </a>
                ) : (
                  <Skeleton className="h-40 w-full rounded-lg" />
                )}
              </div>
            ) : null}

            <div className="min-w-0">
              {order.description ? (
                <p className="whitespace-pre-wrap rounded-lg bg-champagne/25 px-4 py-3 text-sm leading-relaxed text-ink">
                  {order.description}
                </p>
              ) : (
                <p className="text-sm italic text-warmgrey">
                  Nothing written — {order.voice_path ? "listen to the voice note" : "picture only"}
                  .
                </p>
              )}

              {order.voice_path ? (
                <div className="mt-3">
                  {voiceUrl ? (
                    <audio controls src={voiceUrl} className="h-10 w-full">
                      <track kind="captions" />
                    </audio>
                  ) : (
                    <Skeleton className="h-10 w-full rounded" />
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href={`tel:${order.phone.replace(/\s/g, "")}`}
              className="nums inline-flex items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {order.phone}
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

            <span className="ml-auto inline-flex items-center gap-2">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-warmgrey" aria-hidden="true" />
              ) : null}
              <label className="sr-only" htmlFor={`status-${order.id}`}>
                Enquiry status
              </label>
              <select
                id={`status-${order.id}`}
                value={order.status}
                disabled={busy}
                onChange={(e) => onStatus(e.target.value as CustomOrderStatus)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>
      </Card>
    </li>
  );
}
