import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Phone, Wallet } from "lucide-react";

import { Banner, Card, Chip, PageHeading, StatCard, toneBar } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchOrders,
  formatEnquiryDate,
  setOrderStatus,
  whatsappNumber,
  type AdminOrder,
  type OrderStatus,
} from "@/lib/admin";
import { formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersScreen,
});

const STATUSES: { key: OrderStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

/** Status drives the accent, so an unworked order is visible at a glance. */
function toneForStatus(status: string) {
  if (status === "new") return "bridal" as const;
  if (status === "confirmed") return "contact" as const;
  if (status === "completed") return "settled" as const;
  return "neutral" as const;
}

function OrdersScreen() {
  const [filter, setFilter] = useState<OrderStatus | "all">("new");
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: fetchOrders,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => setOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });

  const all = useMemo(() => data ?? [], [data]);
  const open = all.filter((o) => o.status === "new");

  const openValue = useMemo(() => open.reduce((sum, o) => sum + (o.total_pkr ?? 0), 0), [open]);

  const shown = useMemo(
    () => (filter === "all" ? all : all.filter((o) => o.status === filter)),
    [all, filter],
  );

  return (
    <>
      <PageHeading
        title="Orders"
        hint="Requests placed through the cart. No payment is taken on the website — confirm the weights and the day's rate, then settle in store or on delivery."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Awaiting confirmation"
          value={open.length}
          tone={open.length > 0 ? "bridal" : "settled"}
          hint={open.length > 0 ? "Call these first" : "All caught up"}
          icon={Package}
        />
        <StatCard
          label="Value awaiting"
          value={formatPKR(openValue)}
          tone="contact"
          hint="At the price quoted"
          icon={Wallet}
        />
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
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="font-display text-2xl font-light text-primary">No orders here yet</p>
          <p className="mt-2 text-sm text-warmgrey">
            They arrive as customers send them from the cart.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {shown.map((order) => (
            <OrderCard
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

function OrderCard({
  order,
  busy,
  onStatus,
}: {
  order: AdminOrder;
  busy: boolean;
  onStatus: (status: OrderStatus) => void;
}) {
  const tone = toneForStatus(order.status);
  const wa = whatsappNumber(order.phone);

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

            <div className="text-right">
              <p className="nums font-display text-2xl text-primary">
                {formatPKR(order.total_pkr)}
              </p>
              <p className="nums text-xs text-warmgrey">
                {order.item_count} {order.item_count === 1 ? "piece" : "pieces"}
              </p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-gold/15 border-t border-gold/15">
            {order.items.map((item, i) => (
              <li key={`${item.sku}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="nums w-8 shrink-0 text-warmgrey">{item.quantity}×</span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {item.name}
                  <span className="nums ml-2 text-xs text-warmgrey">
                    {item.sku} · {item.karat}
                  </span>
                </span>
                <span className="nums shrink-0 text-ink">
                  {formatPKR(item.unitPricePkr * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {order.notes ? (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-champagne/25 px-4 py-3 text-sm leading-relaxed text-ink">
              {order.notes}
            </p>
          ) : null}

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
                Order status
              </label>
              <select
                id={`status-${order.id}`}
                value={order.status}
                disabled={busy}
                onChange={(e) => onStatus(e.target.value as OrderStatus)}
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
