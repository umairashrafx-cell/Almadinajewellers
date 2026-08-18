import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ProductCard } from "@/components/product/ProductCard";
import { ActionLink } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchNewArrivals } from "@/lib/catalogue";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/new-arrivals")({
  head: () => {
    const title = `New Arrivals — ${SITE.name}`;
    const description =
      "The latest pieces to reach the counter: hallmarked 21K and 22K gold, certified diamond and 925 silver, with weight and stone detail on every piece.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/new-arrivals` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/new-arrivals` }],
    };
  },
  component: NewArrivalsPage,
});

function NewArrivalsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: fetchNewArrivals,
    staleTime: 5 * 60 * 1000,
  });

  const products = data ?? [];

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="bg-primary px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
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
                  New Arrivals
                </li>
              </ol>
            </nav>
            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              New Arrivals
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">
              The latest pieces to reach the counter, newest first. Everything here is hallmarked
              and weighed in front of you.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="nums border-b border-gold/30 pb-4 text-xs text-warmgrey">
            {isPending
              ? "Loading…"
              : `${products.length} ${products.length === 1 ? "piece" : "pieces"}`}
          </p>

          {isError ? (
            <div className="py-24 text-center">
              <h2 className="font-display text-2xl font-light text-primary">These didn't load</h2>
              <p className="mt-3 text-sm text-warmgrey">Please refresh and try again.</p>
            </div>
          ) : isPending ? (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="mt-4 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center">
              <h2 className="font-display text-2xl font-light text-primary">
                Nothing new just yet
              </h2>
              <p className="mt-3 text-sm text-warmgrey">
                New work reaches the counter most weeks. Browse the collections in the meantime.
              </p>
              <ActionLink variant="outline" className="mt-8" href="/collections">
                All collections
              </ActionLink>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
