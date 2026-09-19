import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, ChevronRight } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ProductCard } from "@/components/product/ProductCard";
import { FilterPanel } from "@/components/collection/FilterPanel";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
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

import { CATEGORY_BLURBS, fetchCategoryWithChildren, fetchCollection } from "@/lib/catalogue";
import {
  boundsOf,
  emptyFilters,
  passes,
  sortProducts,
  SORT_OPTIONS,
  type Filters,
  type SortKey,
} from "@/lib/filters";
import { SITE, absoluteUrl, productUrl } from "@/lib/site";
import type { Product } from "@/data/products";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

const PAGE_SIZE = 12;

/** Turns "gold-bangles" into "Gold Bangles" for the head tag before data loads. */
function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Collections whose slug has been corrected, and where the old address goes.
 *
 * 301 rather than 404: the old URL may be in a customer's WhatsApp history or
 * someone's bookmarks, and a permanent redirect is also what tells a search
 * engine to carry the old address's standing over to the new one rather than
 * treating it as a new page. Kept as a map because the next renamed collection
 * belongs on the line below rather than in another branch.
 *
 * Delete an entry only once the old URL has stopped being requested — this is
 * cheap to keep and expensive to remove early.
 */
const RENAMED_COLLECTIONS: Record<string, string> = {
  // Transposed letters. See the children_rings_slug migration.
  "childern-rings": "children-rings",
};

export const Route = createFileRoute("/collections/$slug")({
  /*
   * The category and the pieces in it.
   *
   * The category answers "does this collection exist?" before anything renders,
   * which is what lets an invented URL 404 instead of returning 200 with a
   * title invented from the slug.
   *
   * The pieces are here because filtering and sorting happening on the client
   * is not a reason to fetch them there. Loading them in a client query left
   * the server's HTML with no product links and no ItemList at all, so the
   * catalogue was reachable only through the sitemap and a collection looked
   * like an empty page to anything that does not run JavaScript.
   */
  loader: async ({ params }) => {
    const corrected = RENAMED_COLLECTIONS[params.slug];
    if (corrected) {
      throw redirect({ to: "/collections/$slug", params: { slug: corrected }, statusCode: 301 });
    }

    const [found, collection] = await Promise.all([
      fetchCategoryWithChildren(params.slug),
      /*
       * Whether the collection exists is still `found`'s answer, because it is
       * the one that returns null rather than throwing. This call only supplies
       * the pieces, so a failure here costs the server-rendered grid and
       * nothing else — the client query below then fetches them as it used to.
       */
      fetchCollection(params.slug).catch(() => null),
    ]);
    if (!found) throw notFound();
    return { ...found, collection };
  },
  head: ({ loaderData, params }) => {
    /*
     * No loaderData means the loader threw notFound(), so there is no such
     * collection. Titling the page from the slug would name a collection that
     * does not exist — which is how "Not A Real Collection — Al-Madina
     * Jewellers" ended up in the markup of a 404.
     */
    if (!loaderData) {
      return { meta: [{ title: `No such collection — ${SITE.name}` }] };
    }

    const name = loaderData.category.name;
    const title = `${name} — Al-Madina Jewellers`;
    const description = `Browse ${name.toLowerCase()} at Al-Madina Jewellers. Hallmarked gold, certified diamond and 925 silver with weight and stone detail on every piece. Enquire on WhatsApp.`;

    /*
     * An empty collection is a good page to arrive at and a bad page to index.
     *
     * sitemap.xml already leaves these out — a collection joins it the morning
     * something is filed under it — but the sitemap is not the only way in.
     * These pages are in the header navigation, so they are crawled anyway, and
     * seven near-empty pages on a site with fourteen products is most of what a
     * crawler sees. This applies the sitemap's own test to the robots tag so
     * the two agree.
     *
     * `collection` is null when the query failed rather than when the
     * collection is empty, and those must not be treated alike: a database
     * hiccup would otherwise deindex a stocked collection. So this asks for a
     * list that is present and empty, and says nothing when there is no answer.
     *
     * The parent case is already handled — fetchCollection rolls up the
     * children, so Necklace Set counts the pieces in Chokar, Mala, Short and
     * Ghani rather than the nothing filed against the parent itself.
     */
    const known = loaderData.collection?.products;
    const empty = known != null && known.length === 0;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        // follow, not nofollow: the pieces linked from a collection that fills
        // up later should still be found through it.
        ...(empty ? [{ name: "robots", content: "noindex, follow" }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE.origin}/collections/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `${SITE.origin}/collections/${params.slug}` }],
    };
  },
  component: CollectionPage,
  notFoundComponent: CollectionMissing,
});

function CollectionPage() {
  const { slug } = Route.useParams();
  // The loader proved this collection exists and gave us its real name, so the
  // heading no longer has to be guessed from the slug while the list loads.
  const { category: loaded, children: loadedChildren, parent, collection } = Route.useLoaderData();

  /*
   * The loader's pieces seed the query, so the grid is in the server's HTML.
   *
   * Filtering and sorting still happen here, on the client, against the same
   * in-memory set as before — `initialData` only decides what the first render
   * draws. Without it the first paint was eight skeletons, which is also all a
   * crawler that does not run JavaScript ever saw, leaving every product page
   * reachable only through the sitemap.
   */
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["collection", slug],
    queryFn: () => fetchCollection(slug),
    initialData: collection ?? undefined,
  });

  const products = useMemo(() => data?.products ?? [], [data]);
  const bounds = useMemo(() => boundsOf(products), [products]);

  /*
   * Bounded from the loader's pieces, not from an empty list.
   *
   * `boundsOf([])` is a price range of 0 to 0, and `passes` rejects everything
   * priced above it — so seeding the query without seeding these would render
   * the grid empty on the server and fix nothing.
   */
  const [filters, setFilters] = useState<Filters>(() =>
    emptyFilters(boundsOf(collection?.products ?? [])),
  );
  const [sort, setSort] = useState<SortKey>("featured");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /*
   * Re-bound the sliders when the refetch actually changes the range.
   *
   * Keyed on the range rather than the array: prices are rebuilt from the day's
   * gold rate, so the background refetch hands back a new array most of the
   * time, and resetting on identity would clear a filter the visitor had just
   * set.
   */
  const boundsKey = `${bounds.price[0]}:${bounds.price[1]}:${bounds.weight[0]}:${bounds.weight[1]}`;
  useEffect(() => {
    if (products.length > 0) setFilters(emptyFilters(bounds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  const results = useMemo(() => {
    const matched = products.filter((p) => passes(p, filters));
    return sortProducts(matched, sort);
  }, [products, filters, sort]);

  // Any change to the result set drops us back to the first page.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters, sort]);

  const shown = results.slice(0, visible);
  const category = data?.category ?? loaded;
  const heading = category.name;
  const blurb = CATEGORY_BLURBS[slug];
  // From the loader, so the links are in the server HTML from the first byte.
  const children = data?.children ?? loadedChildren;

  const clear = () => setFilters(emptyFilters(bounds));

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <BreadcrumbSchema
        trail={[
          { name: "Collections", path: "/collections" },
          // A sub-category sits under its parent, in the markup as on the page.
          ...(parent ? [{ name: parent.name, path: `/collections/${parent.slug}` }] : []),
          { name: heading, path: `/collections/${slug}` },
        ]}
      />
      <CollectionItemList heading={heading} products={shown} />

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
                {parent ? (
                  <>
                    <li>
                      <Link
                        to="/collections/$slug"
                        params={{ slug: parent.slug }}
                        className="transition-colors hover:text-gold"
                      >
                        {parent.name}
                      </Link>
                    </li>
                    <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  </>
                ) : null}
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

            {/*
              The kinds within this collection, where there are any. Shown as
              links rather than filters because they are how customers name what
              they want at the counter — someone asking for a mala set is not
              narrowing a list of necklaces, they are asking for a mala set.
            */}
            {children.length > 0 ? (
              <nav aria-label={`Kinds of ${heading}`} className="mt-8">
                <ul className="flex flex-wrap gap-2">
                  {children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        to="/collections/$slug"
                        params={{ slug: child.slug }}
                        className="inline-block rounded-full border border-gold/50 px-4 py-2 text-[12px] font-medium uppercase tracking-widest text-champagne transition-colors hover:bg-gold hover:text-primary"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
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
              {/*
                A failed refetch only takes the page over when it has left us
                with nothing to show. The pieces now arrive with the document,
                so a later network fault should not replace a grid the visitor
                is already reading with an error about loading it.
              */}
              {isError && products.length === 0 ? (
                <ErrorState message={(error as Error)?.message} />
              ) : isPending ? (
                <GridSkeleton />
              ) : results.length === 0 ? (
                products.length === 0 ? (
                  <NoPieces />
                ) : (
                  <EmptyState onClear={clear} />
                )
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

/*
 * The collection itself is empty — no filter is hiding anything. Offering to
 * clear filters here sends people to a button that cannot change the answer,
 * so this says the piece simply is not on the site yet and points at the
 * things that will help: the rest of the catalogue, or asking us directly.
 */
function NoPieces() {
  return (
    <div className="py-24 text-center">
      <h2 className="font-display text-2xl font-light text-primary">
        Nothing in this collection yet
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-warmgrey">
        We are photographing new pieces for it. In the meantime we almost certainly have something
        in the shop — tell us what you are looking for and we will send pictures.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ActionLink variant="outline" href="/collections">
          Browse all collections
        </ActionLink>
        <ActionLink href="/custom-order">Have a piece made</ActionLink>
      </div>
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

/**
 * The pieces on this page, as an ordered list.
 *
 * This is what lets a collection appear as a list of named products rather than
 * one undifferentiated page. It is built from the same data the grid draws, so
 * now that the loader supplies that, the list ships in the server's HTML with
 * the products it describes rather than appearing on a second pass.
 *
 * It lists the pieces currently shown, so a filtered view describes itself
 * honestly rather than claiming the whole collection.
 */
function CollectionItemList({ heading, products }: { heading: string; products: Product[] }) {
  if (products.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: heading,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: product.name,
        sku: product.sku,
        url: productUrl(product.slug),
        image: absoluteUrl(product.images[0]),
        offers: {
          "@type": "Offer",
          priceCurrency: "PKR",
          price: product.salePricePkr ?? product.pricePkr,
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Catalogue data, serialised. No user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/** No collection has this slug. Served with a 404 so the URL leaves the index. */
function CollectionMissing() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />
      <div className="section-y mx-auto max-w-2xl px-4 text-center">
        <h1 className="font-display text-4xl font-light tracking-wide text-primary">
          No such collection
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-warmgrey">
          That link does not match anything we sell. The collections below are the current ones.
        </p>
        <div className="mt-10 flex justify-center">
          <ActionLink href="/collections">Browse collections</ActionLink>
        </div>
      </div>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
