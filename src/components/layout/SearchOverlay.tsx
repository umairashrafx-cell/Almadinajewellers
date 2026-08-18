import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { fetchAllProducts, searchProducts } from "@/lib/catalogue";
import { formatGrams, formatPKR } from "@/lib/site";

const TRENDING = ["Bridal set", "Kara", "Jhumka", "Ayat pendant", "Solitaire", "Silver"];

const MAX_RESULTS = 8;

/**
 * Full-screen search. The catalogue is small enough to load once and filter in
 * memory, so results appear as the visitor types with no per-keystroke request.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Only fetch once the overlay has been opened at least once.
  const { data: products, isPending } = useQuery({
    queryKey: ["all-products"],
    queryFn: fetchAllProducts,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const results = useMemo(
    () => searchProducts(products ?? [], query).slice(0, MAX_RESULTS),
    [products, query],
  );

  // Escape closes; focus moves to the field on open; body scroll is locked.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Clear the field between visits so a stale query is not waiting next time.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const showEmpty = query.trim().length >= 2 && !isPending && results.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search the catalogue"
      className="fixed inset-0 z-[60] bg-ivory"
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        {/* Field */}
        <div className="flex items-center gap-4 border-b border-gold pb-4">
          <Search className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.5} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a piece, a category, a karat…"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent font-display text-2xl font-light text-primary placeholder:text-warmgrey/60 focus-visible:outline-none sm:text-3xl"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 text-warmgrey transition-colors hover:text-primary"
          >
            <X className="h-6 w-6" strokeWidth={1.4} />
          </button>
        </div>

        {/* Results */}
        <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
          {query.trim().length < 2 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
                Trending searches
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {TRENDING.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="border border-gold/50 px-4 py-2 text-xs text-ink transition-colors hover:bg-champagne/40"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : showEmpty ? (
            <div className="py-12 text-center">
              <p className="font-display text-2xl font-light text-primary">
                Nothing matches "{query.trim()}"
              </p>
              <p className="mt-3 text-sm text-warmgrey">
                Try a category, or browse the full collections.
              </p>
              <Link
                to="/collections"
                onClick={onClose}
                className="mt-6 inline-block border-b border-gold pb-1 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:text-gold"
              >
                All collections
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gold/20">
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    onClick={onClose}
                    className="group flex items-center gap-4 py-4"
                  >
                    <img
                      src={product.images[0]}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg text-primary transition-colors group-hover:text-gold">
                        {product.name}
                      </p>
                      <p className="nums mt-0.5 truncate text-xs text-warmgrey">
                        {product.karat} · {formatGrams(product.grossWeightG)} · {product.category}
                      </p>
                    </div>
                    <p className="nums shrink-0 text-sm font-semibold text-ink">
                      {formatPKR(product.salePricePkr ?? product.pricePkr)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
