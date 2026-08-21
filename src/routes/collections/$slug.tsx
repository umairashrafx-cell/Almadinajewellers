import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterPanel } from "@/components/collection/FilterPanel";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

import { CATEGORY_BLURBS, fetchCollection } from "@/lib/catalogue";
import {
  boundsOf,
  emptyFilters,
  passes,
  sortProducts,
  SORT_OPTIONS,
  type Filters,
  type SortKey,
} from "@/lib/filters";

const PAGE_SIZE = 12;

/** Turns "gold-bangles" into "Gold Bangles" for the head tag before data loads. */
function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/collections/$slug")({
  head: ({ params }) => {
    const name = titleFromSlug(params.slug);
    const title = `${name} — Al-Madina Jewellers`;
    const description = `Browse ${name.toLowerCase()} at Al-Madina Jewellers. Hallmarked gold, certified diamond and 925 silver with weight and stone detail on every piece. Enquire on WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { slug } = Route.useParams();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["collection", slug],
    queryFn: () => fetchCollection(slug),
  });

  const products = useMemo(() => data?.products ?? [], [data]);
  const bounds = useMemo(() => boundsOf(products), [products]);

  const [filters, setFilters] = useState<Filters>(() => emptyFilters(boundsOf([])));
  const [sort, setSort] = useState<SortKey>("featured");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Price/weight sliders can only be bounded once the data arrives.
  useEffect(() => {
    if (products.length > 0) setFilters(emptyFilters(boundsOf(products)));
  }, [products]);

  const results = useMemo(() => {
    const matched = products.filter((p) => passes(p, filters));
    return sortProducts(matched, sort);
  }, [products, filters, sort]);

  // Any change to the result set drops us back to the first page.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters, sort]);

  const shown = results.slice(0, visible);
  const category = data?.category;
  const heading = category?.name ?? titleFromSlug(slug);
  const blurb = CATEGORY_BLURBS[slug];

  const clear = () => setFilters(emptyFilters(bounds));

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        {/* Banner */}
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
                <li>
                  <Link to="/collections" className="transition-colors hover:text-gold">
                    Collections
                  </Link>
                </li>
                <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <li aria-current="page" className="text-gold">
                  {heading}
                </li>
              </ol>
            </nav>

            <h1 className="mt-6 font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              {heading}
            </h1>
            {blurb && (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">{blurb}</p>
            )}
          </div>
        </section>

        <div className="band-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:gap-12">
            {/* Desktop sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              {isPending ? (
                <FilterSkeleton />
              ) : (
                <FilterPanel
                  products={products}
                  filters={filters}
                  bounds={bounds}
                  onChange={setFilters}
                  onClear={clear}
                />
              )}
            </aside>

            <div className="min-w-0 flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4 border-b border-gold/30 pb-4">
                <p className="nums text-xs text-warmgrey">
                  {isPending
                    ? "Loading…"
                    : `${results.length} ${results.length === 1 ? "piece" : "pieces"}`}
                </p>

                <div className="flex items-center gap-3">
                  {/* Mobile filter trigger */}
                  <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DrawerTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 border border-gold px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-champagne/50 lg:hidden"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Filter
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[85vh] bg-ivory">
                      <DrawerHeader className="border-b border-gold/30 text-left">
                        <DrawerTitle className="font-display text-2xl font-light text-primary">
                          Refine
                        </DrawerTitle>
                      </DrawerHeader>
                      <div className="overflow-y-auto px-4 py-6">
                        <FilterPanel
                          products={products}
                          filters={filters}
                          bounds={bounds}
                          onChange={setFilters}
                          onClear={clear}
                        />
                      </div>
                      <div className="border-t border-gold/30 p-4">
                        <DrawerClose asChild>
                          <ActionButton className="w-full">
                            Show {results.length} {results.length === 1 ? "piece" : "pieces"}
                          </ActionButton>
                        </DrawerClose>
                      </div>
                    </DrawerContent>
                  </Drawer>

                  <label className="flex items-center gap-2">
                    <span className="sr-only">Sort by</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="border border-gold/50 bg-transparent px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-ink focus-visible:outline-none"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Grid */}
              {isError ? (
                <ErrorState message={(error as Error)?.message} />
              ) : isPending ? (
                <GridSkeleton />
              ) : results.length === 0 ? (
                <EmptyState onClear={clear} />
              ) : (
                <>
                  <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
                    {shown.map((product, i) => (
                      <Reveal key={product.id} delay={(i % 4) * 80}>
                        <ProductCard product={product} />
                      </Reveal>
                    ))}
                  </div>

                  {visible < results.length && (
                    <div className="mt-16 text-center">
                      <ActionButton
                        variant="outline"
                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      >
                        Load more
                      </ActionButton>
                      <p className="nums mt-4 text-xs text-warmgrey">
                        Showing {shown.length} of {results.length}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function GridSkeleton() {
  return (
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
  );
}

function FilterSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="py-24 text-center">
      <h2 className="font-display text-2xl font-light text-primary">
        Nothing matches those filters
      </h2>
      <p className="mt-3 text-sm text-warmgrey">Try widening the price or weight range.</p>
      <ActionButton variant="outline" className="mt-8" onClick={onClear}>
        Clear all filters
      </ActionButton>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="py-24 text-center">
      <h2 className="font-display text-2xl font-light text-primary">This collection didn't load</h2>
      <p className="mt-3 text-sm text-warmgrey">
        {message ?? "Please refresh the page and try again."}
      </p>
    </div>
  );
}
