import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Heart } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ProductCard } from "@/components/product/ProductCard";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchProductsBySkus } from "@/lib/catalogue";
import { useWishlist } from "@/hooks/use-wishlist";
import { SITE, formatGrams, formatPKR, productUrl, whatsappLink } from "@/lib/site";
import type { Product } from "@/data/products";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: `My Wishlist — ${SITE.name}` },
      {
        name: "description",
        content:
          "The pieces you have saved. Send the whole list to Al-Madina Jewellers on WhatsApp and we will come back with weights and prices.",
      },
      // A private, per-visitor page — nothing here belongs in a search index.
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { skus } = useWishlist();

  const { data, isPending } = useQuery({
    queryKey: ["wishlist", skus],
    queryFn: () => fetchProductsBySkus(skus),
    enabled: skus.length > 0,
  });

  const products = data ?? [];
  // The list lives in localStorage, so the server render is always empty and
  // the real contents appear on hydration.
  const loading = skus.length > 0 && isPending;

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-champagne/70">
                <li>
                  <Link to="/" className="transition-colors hover:text-gold">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  Wishlist
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              My Wishlist
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              Saved on this device. Send the list to us on WhatsApp and we will come back with
              current weights, prices and photographs.
            </p>
          </div>
        </section>

        <section className="band-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
              {Array.from({ length: Math.min(skus.length, 8) }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="mt-4 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyWishlist />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/30 pb-4">
                <p className="nums text-xs text-warmgrey">
                  {products.length} {products.length === 1 ? "piece" : "pieces"} saved
                </p>
                <ActionLink
                  href={whatsappLink(wishlistMessage(products))}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Send my wishlist on WhatsApp
                </ActionLink>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
                {products.map((product, i) => (
                  <Reveal key={product.id} delay={(i % 4) * 80}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>

              <p className="mt-12 text-xs leading-relaxed text-warmgrey">
                Tap the heart on any piece to remove it. This list is stored on this device only —
                it is not sent anywhere until you choose to share it.
              </p>
            </>
          )}
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function EmptyWishlist() {
  return (
    <div className="py-20 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50">
        <Heart className="h-6 w-6 text-gold" strokeWidth={1.4} />
      </span>
      <h2 className="mt-8 font-display text-3xl font-light tracking-wide text-primary">
        Nothing saved yet
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-warmgrey">
        Tap the heart on any piece to keep it here while you decide. Useful for narrowing a bridal
        shortlist before you visit the shop.
      </p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <ActionLink href="/collections">Browse collections</ActionLink>
        <ActionLink variant="outline" href="/new-arrivals">
          See new arrivals
        </ActionLink>
      </div>
    </div>
  );
}

/** One line per saved piece, so the shop can price the list straight away. */
function wishlistMessage(products: Product[]): string {
  const lines = products.map(
    (p) =>
      `• ${p.name} (${p.sku}) — ${p.karat}, ${formatGrams(p.grossWeightG)}, ${formatPKR(
        p.salePricePkr ?? p.pricePkr,
      )}\n  ${productUrl(p.slug)}`,
  );

  return [
    "Assalam-o-Alaikum, these are the pieces on my wishlist:",
    "",
    ...lines,
    "",
    "Could you confirm current weights and prices?",
  ].join("\n");
}
