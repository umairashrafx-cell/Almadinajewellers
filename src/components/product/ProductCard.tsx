import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { useWishlist } from "@/hooks/use-wishlist";
import { formatGrams, formatPKR, productEnquiryLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Reusable product card.
 * Square image with a cross-fading second image, karat + status badges,
 * weight/stone spec line, price, and ONE hover action: Enquire.
 * The image and name link through to the product page; the badges, wishlist and
 * Enquire controls sit outside that link so no anchor is nested in another.
 */
export function ProductCard({ product }: { product: Product }) {
  const { has, toggle } = useWishlist();
  const wished = has(product.sku);
  const onSale = typeof product.salePricePkr === "number";

  return (
    <article className="group relative bg-card transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="block h-full w-full"
          aria-label={product.name}
        >
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-0"
          />
          <img
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            loading="lazy"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
          />
        </Link>

        {/* Karat badge */}
        <span className="pointer-events-none absolute left-0 top-0 bg-primary/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ivory">
          {product.karat}
        </span>

        {/* New / Sale badge */}
        {(product.isNew || onSale) && (
          <span
            className={cn(
              "pointer-events-none absolute right-0 top-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ivory",
              onSale ? "bg-rose" : "bg-gold text-primary",
            )}
          >
            {onSale ? "Sale" : "New"}
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => toggle(product.sku)}
          aria-label={
            wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
          }
          aria-pressed={wished}
          className="absolute right-2 top-9 grid h-9 w-9 place-items-center bg-ivory/90 opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Heart
            className={cn("h-4 w-4", wished ? "fill-rose text-rose" : "text-primary")}
            strokeWidth={1.4}
          />
        </button>

        {/* Single hover action */}
        <a
          href={productEnquiryLink(product.name, product.sku)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-x-0 bottom-0 translate-y-full bg-gold py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-primary transition-transform duration-300 ease-out focus-visible:translate-y-0 group-hover:translate-y-0"
        >
          Enquire
        </a>
      </div>

      <div className="px-1 pb-5 pt-4">
        <h3 className="font-display text-lg font-normal tracking-wide text-primary">
          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            className="transition-colors hover:text-gold"
          >
            {product.name}
          </Link>
        </h3>
        <p className="nums mt-1 text-xs text-warmgrey">
          {formatGrams(product.grossWeightG)} · {product.stones}
        </p>
        <p className="nums mt-3 flex items-baseline gap-2 text-sm font-semibold text-ink">
          {formatPKR(product.salePricePkr ?? product.pricePkr)}
          {onSale && (
            <span className="text-xs font-normal text-warmgrey line-through">
              {formatPKR(product.pricePkr)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
