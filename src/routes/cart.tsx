import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight, Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchProductsBySkus } from "@/lib/catalogue";
import { fetchRateSnapshot } from "@/lib/rates";
import {
  lineTotal,
  orderSchema,
  orderTotal,
  orderWhatsAppMessage,
  placeOrder,
  type OrderDetails,
  type OrderLine,
  type PlacedOrder,
} from "@/lib/orders";
import { useCart } from "@/hooks/use-cart";
import { SITE, formatGrams, formatPKR } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: `Your Order — ${SITE.name}` },
      {
        name: "description",
        content:
          "Review the pieces you have chosen and send your order to Al-Madina Jewellers. Payment is arranged in store or on confirmed delivery.",
      },
      // A per-visitor page. Nothing here belongs in a search index.
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQuantity, remove, clear, keepOnly } = useCart();
  const [placed, setPlaced] = useState<{
    order: PlacedOrder;
    lines: OrderLine[];
    details: OrderDetails;
  } | null>(null);

  const skus = useMemo(() => lines.map((l) => l.sku), [lines]);

  const { data: products, isPending } = useQuery({
    queryKey: ["cart", skus],
    queryFn: () => fetchProductsBySkus(skus),
    enabled: skus.length > 0,
  });

  const { data: snapshot } = useQuery({
    queryKey: ["rates", "snapshot"],
    queryFn: fetchRateSnapshot,
  });

  /**
   * Cart lines resolved against the live catalogue. A piece withdrawn since it
   * was added simply drops out rather than ordering something that no longer
   * exists at a price nobody can honour.
   */
  const orderLines: OrderLine[] = useMemo(() => {
    if (!products) return [];
    return lines.flatMap((line) => {
      const product = products.find((p) => p.sku === line.sku);
      if (!product) return [];
      return [
        {
          product,
          quantity: line.quantity,
          unitPricePkr: product.salePricePkr ?? product.pricePkr,
        },
      ];
    });
  }, [lines, products]);

  /**
   * Once the catalogue has answered, forget anything it does not sell any more.
   * Without this the header badge keeps counting a withdrawn piece that the
   * cart itself no longer lists.
   */
  useEffect(() => {
    if (!products) return;
    keepOnly(products.map((p) => p.sku));
  }, [products, keepOnly]);

  const total = orderTotal(orderLines);
  const count = orderLines.reduce((n, l) => n + l.quantity, 0);
  const loading = skus.length > 0 && isPending;

  if (placed) {
    return (
      <Placed order={placed.order} lines={placed.lines} details={placed.details} onDone={clear} />
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Breadcrumb current="Your order" />
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Your order
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              Send us the pieces you have chosen and we will confirm weights, the day's rate and
              delivery. Nothing is charged here — payment is arranged in store or on delivery.
            </p>
          </div>
        </section>

        <section className="section-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: Math.min(skus.length, 4) }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : orderLines.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
              <div>
                <p className="nums border-b border-gold/30 pb-4 text-xs text-warmgrey">
                  {count} {count === 1 ? "piece" : "pieces"} chosen
                </p>

                <ul className="divide-y divide-gold/20">
                  {orderLines.map((line) => (
                    <li key={line.product.sku} className="flex gap-4 py-6">
                      <Link to="/products/$slug" params={{ slug: line.product.slug }}>
                        <img
                          src={line.product.images[0]}
                          alt={line.product.name}
                          loading="lazy"
                          className="h-24 w-24 shrink-0 object-cover"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to="/products/$slug"
                          params={{ slug: line.product.slug }}
                          className="font-display text-xl font-light text-primary transition-colors hover:text-gold"
                        >
                          {line.product.name}
                        </Link>
                        <p className="nums mt-1 text-xs text-warmgrey">
                          {line.product.sku} · {line.product.karat} ·{" "}
                          {formatGrams(line.product.grossWeightG)}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <Quantity
                            value={line.quantity}
                            onChange={(q) => setQuantity(line.product.sku, q)}
                          />
                          <button
                            type="button"
                            onClick={() => remove(line.product.sku)}
                            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-warmgrey transition-colors hover:text-rose"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      </div>

                      <p className="nums shrink-0 text-right font-display text-lg text-primary">
                        {formatPKR(lineTotal(line))}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <OrderForm
                lines={orderLines}
                total={total}
                snapshot={snapshot}
                onPlaced={(order, details) => setPlaced({ order, lines: orderLines, details })}
              />
            </div>
          )}
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
        <li>
          <Link to="/" className="transition-colors hover:text-gold">
            Home
          </Link>
        </li>
        <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
        <li aria-current="page" className="text-gold">
          {current}
        </li>
      </ol>
    </nav>
  );
}

function Quantity({ value, onChange }: { value: number; onChange: (q: number) => void }) {
  return (
    <div className="inline-flex items-center border border-gold/40">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Reduce quantity"
        className="grid h-9 w-9 place-items-center text-primary transition-colors hover:bg-champagne/40"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <span className="nums w-10 text-center text-sm" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="grid h-9 w-9 place-items-center text-primary transition-colors hover:bg-champagne/40"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function OrderForm({
  lines,
  total,
  snapshot,
  onPlaced,
}: {
  lines: OrderLine[];
  total: number;
  snapshot: Parameters<typeof placeOrder>[2];
  onPlaced: (order: PlacedOrder, details: OrderDetails) => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrderDetails>({ resolver: zodResolver(orderSchema) });

  async function onSubmit(values: OrderDetails) {
    setFailure(null);
    try {
      onPlaced(await placeOrder(values, lines, snapshot), values);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not place the order.");
    }
  }

  return (
    <aside className="h-fit border border-gold/40 bg-champagne/20 p-6">
      <h2 className="font-display text-2xl font-light tracking-wide text-primary">Order summary</h2>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-warmgrey">Pieces</dt>
          <dd className="nums text-ink">{lines.reduce((n, l) => n + l.quantity, 0)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-warmgrey">Delivery</dt>
          <dd className="text-ink">Free, insured</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-gold/30 pt-3">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Total
          </dt>
          <dd className="nums font-display text-2xl text-primary">{formatPKR(total)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-warmgrey">
        Priced against today's gold rate. Confirmed against the rate on the day you buy.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        <Field label="Your name" error={errors.name?.message}>
          <input {...register("name")} className={inputClass} autoComplete="name" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input {...register("phone")} className={inputClass} autoComplete="tel" inputMode="tel" />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <input {...register("city")} className={inputClass} autoComplete="address-level2" />
        </Field>
        <Field label="Anything we should know?" error={errors.notes?.message}>
          <textarea {...register("notes")} rows={3} className={inputClass} />
        </Field>

        {failure ? (
          <p role="alert" className="text-sm text-rose">
            {failure}
          </p>
        ) : null}

        <ActionButton type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Send my order
        </ActionButton>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-warmgrey">
        No payment is taken here. We will call to confirm, then payment is arranged in store or on
        delivery.
      </p>
    </aside>
  );
}

const inputClass =
  "mt-1.5 w-full border border-gold/40 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {label}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-rose">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/**
 * The confirmation. Shows the reference first — it is the one thing the
 * customer needs to quote back — and offers the WhatsApp handoff, which is
 * where the conversation actually continues.
 */
function Placed({
  order,
  lines,
  details,
  onDone,
}: {
  order: PlacedOrder;
  lines: OrderLine[];
  details: OrderDetails;
  onDone: () => void;
}) {
  // Emptying the cart notifies the header's badge, and React forbids updating
  // another component while this one renders — so it happens after the paint.
  // The badge clearing one frame late is not something anyone can see.
  useEffect(() => {
    onDone();
    // Once, on arrival. onDone is stable, but listing it would re-run this if
    // that ever stopped being true, and emptying the cart twice is harmless.
  }, [onDone]);

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main className="section-y mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/50 bg-champagne/30">
          <Check className="h-7 w-7 text-primary" strokeWidth={1.4} />
        </span>

        <h1 className="mt-8 font-display text-4xl font-light tracking-wide text-primary">
          Order received
        </h1>
        <p className="nums mt-4 text-sm text-warmgrey">
          Your reference is{" "}
          <span className="font-semibold tracking-widest text-primary">{order.reference}</span>
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink">
          We will call you to confirm the weights and today's rate. Send it on WhatsApp too and we
          will come back faster.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionLink
            href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
              orderWhatsAppMessage(order.reference, details, lines),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Send on WhatsApp
          </ActionLink>
          <ActionLink variant="outline" href="/collections">
            Continue browsing
          </ActionLink>
        </div>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="py-20 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50">
        <ShoppingBag className="h-6 w-6 text-gold" strokeWidth={1.4} />
      </span>
      <h2 className={cn("mt-8 font-display text-3xl font-light tracking-wide text-primary")}>
        Nothing chosen yet
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-warmgrey">
        Add the pieces you are interested in and send them to us in one message. We will confirm
        weights and the day's rate before anything is charged.
      </p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <ActionLink href="/collections">Browse collections</ActionLink>
        <ActionLink variant="outline" href="/bridal">
          See bridal sets
        </ActionLink>
      </div>
    </div>
  );
}
