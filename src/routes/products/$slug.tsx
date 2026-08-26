import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Heart, Minus, Plus, ShoppingBag, ZoomIn } from "lucide-react";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { ProductCard } from "@/components/product/ProductCard";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal } from "@/components/ui/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { fetchProductPage, type ProductDetail } from "@/lib/catalogue";
import { fetchRateSnapshot, rateFor } from "@/lib/rates";
import {
  SITE,
  absoluteUrl,
  formatGrams,
  productShareImage,
  shareImageUrl,
  formatPKR,
  productEnquiryLink,
  productUrl,
  whatsappLink,
} from "@/lib/site";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";
import { productShareMessage, shareOnWhatsApp } from "@/lib/share";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { Reviews } from "@/components/product/Reviews";
import { safeFetchReviews } from "@/lib/reviews";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$slug")({
  // A loader rather than useQuery: the title, description and Product schema
  // have to be in the server-rendered HTML to be worth anything for SEO.
  loader: async ({ params }) => {
    const page = await fetchProductPage(params.slug);
    // Sequential because the SKU is only known once the product is loaded.
    // The reviews query is small and indexed; the alternative is a rating that
    // exists only after hydration, which is the thing this feature is for.
    const reviews = await safeFetchReviews(page.product.sku);
    return { ...page, reviews };
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product;
    if (!product) return { meta: [{ title: `${SITE.name}` }] };

    const price = formatPKR(product.salePricePkr ?? product.pricePkr);
    // May be the brand card rather than the piece, when this one has no
    // photograph of its own yet — so the alt text has to follow the image.
    const shareImage = productShareImage(product.images[0]);
    const shareAlt =
      shareImage === shareImageUrl()
        ? `${SITE.name} — ${SITE.tagline}`
        : `${product.name} — ${product.karat}`;
    const title = `${product.name} — ${product.karat} · ${SITE.name}`;
    const description = `${product.name}: ${formatGrams(product.grossWeightG)} in ${product.karat}, ${product.stones.toLowerCase()}. ${price}. Hallmarked and weighed in front of you. Enquire on WhatsApp.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: productUrl(params.slug) },
        // The piece itself, not the brand card. A product link pasted into
        // WhatsApp should preview the jewellery someone is being shown.
        { property: "og:image", content: shareImage },
        { property: "og:image:alt", content: shareAlt },
        { name: "twitter:image", content: shareImage },
        // Read by Facebook and Pinterest; harmless elsewhere.
        {
          property: "product:price:amount",
          content: String(product.salePricePkr ?? product.pricePkr),
        },
        { property: "product:price:currency", content: "PKR" },
      ],
      links: [{ rel: "canonical", href: productUrl(params.slug) }],
    };
  },
  component: ProductDetailPage,
  errorComponent: ProductError,
});

function ProductDetailPage() {
  const { product, categoryName, related, reviews } = Route.useLoaderData();
  const { has, toggle } = useWishlist();

  const url = productUrl(product.slug);
  const onSale = typeof product.salePricePkr === "number";
  const listed = product.salePricePkr ?? product.pricePkr;
  const wished = has(product.sku);

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <ProductSchema product={product} url={url} />
      <BreadcrumbSchema
        trail={[
          { name: categoryName, path: `/collections/${product.categorySlug}` },
          { name: product.name, path: `/products/${product.slug}` },
        ]}
      />

      <main>
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-warmgrey">
            <li>
              <Link to="/" className="transition-colors hover:text-gold">
                Home
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
            <li>
              <Link
                to="/collections/$slug"
                params={{ slug: product.categorySlug }}
                className="transition-colors hover:text-gold"
              >
                {categoryName}
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
            <li aria-current="page" className="text-primary">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="band-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16">
            <Gallery product={product} />

            {/* Detail column */}
            <div className="mt-10 lg:mt-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                {categoryName}
              </p>
              <h1 className="mt-4 font-display text-[32px] font-light leading-tight tracking-wide text-primary sm:text-4xl">
                {product.name}
              </h1>

              <p className="nums mt-5 flex items-baseline gap-3">
                <span className="text-2xl font-semibold text-ink">{formatPKR(listed)}</span>
                {onSale && (
                  <span className="text-sm font-normal text-warmgrey line-through">
                    {formatPKR(product.pricePkr)}
                  </span>
                )}
              </p>
              <p className="mt-2 text-xs text-warmgrey">
                SKU {product.sku} · {product.stones}
              </p>

              <SpecTable product={product} />

              <PriceBreakdownPanel product={product} listed={listed} />

              {/* Actions */}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <AddToOrder sku={product.sku} />
                <ActionLink
                  href={productEnquiryLink(product.name, product.sku, url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:flex-1"
                >
                  Enquire on WhatsApp
                </ActionLink>
                <ActionLink
                  variant="outline"
                  href={whatsappLink(
                    `Assalam-o-Alaikum, please call me back about ${product.name} (SKU: ${product.sku}) - ${url}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Request a callback
                </ActionLink>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-6">
                <button
                  type="button"
                  onClick={() => toggle(product.sku)}
                  aria-pressed={wished}
                  className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-gold"
                >
                  <Heart
                    className={cn("h-4 w-4", wished ? "fill-rose text-rose" : "text-primary")}
                    strokeWidth={1.4}
                  />
                  {wished ? "Saved to wishlist" : "Save to wishlist"}
                </button>

                <a
                  href={shareOnWhatsApp(productShareMessage(product, listed))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-gold"
                >
                  <WhatsAppIcon className="h-4 w-4 text-primary" />
                  Share this piece
                </a>

                <a
                  href={whatsappLink(
                    `Assalam-o-Alaikum, I would like to view ${product.name} (SKU: ${product.sku}) at the shop. When is a good time?`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-gold pb-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-gold"
                >
                  Book a store viewing
                </a>
              </div>

              <Details product={product} />
            </div>
          </div>
        </div>

        <div className="border-t border-gold/20">
          <Reviews sku={product.sku} productName={product.name} initial={reviews} />
        </div>

        {related.length > 0 && (
          <section className="section-y border-t border-gold/20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="font-display text-3xl font-light tracking-wide text-primary">
                You may also like
              </h2>
              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
                {related.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 80}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

/**
 * Vertical thumbnails beside a click-to-zoom main image on desktop; a swipeable
 * carousel on mobile.
 */
function Gallery({ product }: { product: ProductDetail }) {
  const [active, setActive] = useState(0);
  const images = product.images;

  return (
    <div>
      {/* Mobile: swipe */}
      <div className="lg:hidden">
        <Carousel opts={{ loop: images.length > 1 }}>
          <CarouselContent>
            {images.map((src, i) => (
              <CarouselItem key={i}>
                <img
                  src={src}
                  alt={i === 0 ? product.name : `${product.name} view ${i + 1}`}
                  className="aspect-square w-full object-cover"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <p className="mt-3 text-center text-[11px] uppercase tracking-widest text-warmgrey">
          Swipe for more views
        </p>
      </div>

      {/* Desktop: thumbs + zoom */}
      <div className="hidden gap-4 lg:flex">
        <div className="flex w-20 shrink-0 flex-col gap-3">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "aspect-square overflow-hidden border transition-colors",
                i === active ? "border-gold" : "border-transparent hover:border-gold/40",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group relative min-w-0 flex-1 overflow-hidden bg-muted"
              aria-label={`Zoom ${product.name}`}
            >
              <img
                src={images[active]}
                alt={product.name}
                className="aspect-square w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <span className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center bg-ivory/90 text-primary">
                <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl border-gold/30 bg-ivory p-2">
            <DialogTitle className="sr-only">{product.name}</DialogTitle>
            <img src={images[active]} alt={product.name} className="w-full object-contain" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function SpecTable({ product }: { product: ProductDetail }) {
  const rows: Array<[string, string]> = [
    ["SKU", product.sku],
    [
      "Metal",
      product.metal === "diamond" ? "Gold with certified diamond" : titleCase(product.metal),
    ],
    ["Purity", product.karat === "925" ? "925 sterling silver" : `${product.karat} hallmarked`],
    ["Gross weight", formatGrams(product.grossWeightG)],
    ["Net metal weight", formatGrams(product.netWeightG)],
    ["Stones", product.stones],
  ];

  if (product.stoneWeightCt) rows.push(["Stone weight", `${product.stoneWeightCt.toFixed(2)} ct`]);
  if (product.dimensions) rows.push(["Dimensions", product.dimensions]);
  if (product.sizes.length > 0) rows.push(["Available sizes", product.sizes.join(" · ")]);

  return (
    <table className="mt-8 w-full border-t border-gold/30 text-left text-sm">
      <caption className="sr-only">Specification</caption>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-gold/15">
            <th scope="row" className="w-40 py-3 pr-4 font-medium text-warmgrey">
              {label}
            </th>
            <td className="nums py-3 text-ink">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The trust panel: gold value + making charges + stone value, which sum to the
 * listed price. Only shown for gold and diamond pieces — on silver the metal is
 * a small fraction of the price and the split reads as noise, not reassurance.
 */
function PriceBreakdownPanel({ product, listed }: { product: ProductDetail; listed: number }) {
  const [open, setOpen] = useState(false);
  const { breakdown } = product;

  const { data: snapshot } = useQuery({
    queryKey: ["gold-rates"],
    queryFn: fetchRateSnapshot,
    staleTime: 5 * 60 * 1000,
  });

  if (!breakdown || product.metal === "silver") return null;

  const today = rateFor(snapshot, product.karat);
  const rateMoved = today && today.perGram !== breakdown.rateBasisPkrPerG;
  // The stored parts sum to the full price; a discount is applied on top.
  const discount = product.pricePkr - listed;

  const lines: Array<[string, string, number]> = [
    [
      "Gold value",
      `${formatGrams(product.netWeightG)} net × Rs. ${breakdown.rateBasisPkrPerG.toLocaleString("en-US")}/g (${product.karat})`,
      breakdown.metalValuePkr,
    ],
    ["Making charges", "Workshop labour and finishing", breakdown.makingChargesPkr],
  ];
  if (breakdown.stoneValuePkr > 0) {
    lines.push(["Stone value", product.stones, breakdown.stoneValuePkr]);
  }

  return (
    <div className="mt-8 border border-gold/40 bg-champagne/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          How this price is calculated
        </span>
        {open ? (
          <Minus className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
        ) : (
          <Plus className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
        )}
      </button>

      {open && (
        <div className="border-t border-gold/30 px-5 pb-5 pt-4">
          <dl className="space-y-3">
            {lines.map(([label, note, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-ink">
                  {label}
                  <span className="mt-0.5 block text-xs text-warmgrey">{note}</span>
                </dt>
                <dd className="nums shrink-0 text-sm text-ink">{formatPKR(value)}</dd>
              </div>
            ))}

            {discount > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-rose">Discount applied</dt>
                <dd className="nums shrink-0 text-sm text-rose">− {formatPKR(discount)}</dd>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-4 border-t border-gold/30 pt-3">
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Listed price
              </dt>
              <dd className="nums shrink-0 text-base font-semibold text-primary">
                {formatPKR(listed)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-warmgrey">
            {rateMoved
              ? // Only reachable when no rate is published for this karat, so the
                // price fell back to the figure it was last saved at. Say so
                // plainly rather than implying it is today's.
                `Today's ${product.karat} rate is Rs. ${today.perGram.toLocaleString("en-US")}/g. This price was last set against Rs. ${breakdown.rateBasisPkrPerG.toLocaleString("en-US")}/g and is confirmed against the rate on the day you buy.`
              : `The gold value above is calculated against today's ${product.karat} rate, so this price moves with the market. Making charges are fixed and do not rise with the rate.`}{" "}
            We weigh every piece in front of you before it is billed.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Adds the piece to the order, then shows that it is in and offers the way on.
 *
 * The confirmation replaces the button rather than sitting beside it: the most
 * common next thought after adding something is "where did it go", and a link
 * to the order answers that without the customer hunting for the header.
 */
function AddToOrder({ sku }: { sku: string }) {
  const { add, has } = useCart();
  const inOrder = has(sku);

  if (inOrder) {
    return (
      <Link
        to="/cart"
        className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-gold bg-champagne/40 px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-champagne sm:flex-1"
      >
        <Check className="h-4 w-4" strokeWidth={2} />
        In your order — review
      </Link>
    );
  }

  return (
    <ActionButton onClick={() => add(sku)} className="sm:flex-1">
      <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
      Add to order
    </ActionButton>
  );
}

function Details({ product }: { product: ProductDetail }) {
  const care =
    product.metal === "silver"
      ? "Sterling silver darkens with air and moisture. Keep it dry, store it in the pouch provided, and bring it in for free polishing whenever it dulls."
      : "Keep gold away from perfume, chlorine and household cleaners. Store each piece separately in the pouch provided. Bring it to the shop for free cleaning and polishing at any time.";

  const certification =
    product.metal === "silver"
      ? "Stamped 925 for sterling silver content. Weight is verified on a calibrated scale in front of you at the counter."
      : `Hallmarked ${product.karat} gold${product.metal === "diamond" ? ", with a certificate for the diamond" : ""}. Weight is verified on a calibrated scale in front of you at the counter.`;

  return (
    <Accordion type="single" collapsible className="mt-10 border-t border-gold/30">
      <AccordionItem value="description">
        <AccordionTrigger>Description</AccordionTrigger>
        <AccordionContent>{describe(product)}</AccordionContent>
      </AccordionItem>
      <AccordionItem value="care">
        <AccordionTrigger>Care instructions</AccordionTrigger>
        <AccordionContent>{care}</AccordionContent>
      </AccordionItem>
      <AccordionItem value="certification">
        <AccordionTrigger>Certification &amp; hallmarking</AccordionTrigger>
        <AccordionContent>{certification}</AccordionContent>
      </AccordionItem>
      <AccordionItem value="delivery">
        <AccordionTrigger>Delivery &amp; buy-back</AccordionTrigger>
        <AccordionContent>
          Insured delivery across Pakistan, free of charge. Made-to-order pieces take six to ten
          weeks. Every piece carries a lifetime buy-back against the day's rate — bring it back to{" "}
          {SITE.address} with the bill.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** JSON-LD Product schema. Rendered in the component so it is server-rendered. */
function ProductSchema({ product, url }: { product: ProductDetail; url: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    // Google will not show a product rich result without an image.
    image: product.images.map(absoluteUrl),
    description: describe(product),
    category: product.categorySlug,
    url,
    weight: { "@type": "QuantitativeValue", value: product.grossWeightG, unitCode: "GRM" },
    material: product.karat === "925" ? "925 sterling silver" : `${product.karat} gold`,
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "PKR",
      price: product.salePricePkr ?? product.pricePkr,
      availability: "https://schema.org/InStock",
      // Catalogue-and-enquiry: the sale is completed in store or over WhatsApp.
      availableDeliveryMethod: "https://schema.org/OnSitePickup",
      seller: { "@type": "JewelryStore", name: SITE.name, telephone: SITE.phones[0] },
    },
  };

  return (
    <script
      type="application/ld+json"
      // The payload is our own data, serialised — no user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function ProductError() {
  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />
      <div className="section-y mx-auto max-w-2xl px-4 text-center">
        <h1 className="font-display text-4xl font-light tracking-wide text-primary">
          This piece isn't available
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-warmgrey">
          It may have been sold or renamed. Browse the collections, or ask us on WhatsApp and we
          will find something close to it.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionLink href="/collections">Browse collections</ActionLink>
          <ActionLink
            variant="outline"
            href={whatsappLink("Assalam-o-Alaikum, I was looking at a piece on your website.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ask on WhatsApp
          </ActionLink>
        </div>
      </div>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Stored copy where it exists, otherwise a plain line from the specs — so the
 * Description accordion and the Product schema are never blank.
 */
function describe(product: ProductDetail) {
  if (product.description) return product.description;
  const metal = product.karat === "925" ? "925 sterling silver" : `${product.karat} gold`;
  return `${product.name} in ${metal}, ${formatGrams(product.grossWeightG)} gross, ${product.stones.toLowerCase()}.`;
}
