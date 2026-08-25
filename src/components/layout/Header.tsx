import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Heart, Menu, X, ChevronDown, ShoppingBag } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { SITE } from "@/lib/site";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { categories } from "@/data/products";
import { cn } from "@/lib/utils";

// Items still pointing at "/" are placeholders until those pages are built.
const NAV = [
  { label: "Collections", to: "/collections", mega: true },
  { label: "Bridal", to: "/bridal" },
  { label: "New Arrivals", to: "/new-arrivals" },
  { label: "Gold Rate", to: "/gold-rate" },
  { label: "Sell Gold", to: "/sell-your-gold" },
  { label: "Our Story", to: "/our-story" },
  { label: "Stores", to: "/stores" },
];

/** Sticky header: transparent over the hero, solid ivory once scrolled. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { skus } = useWishlist();
  const { count: cartCount } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-500",
        solid ? "border-b border-gold/40 bg-ivory" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link to="/" className="shrink-0 leading-none" aria-label={`${SITE.name} home`}>
          <span
            className={cn(
              "block font-display text-2xl font-light tracking-[0.18em] transition-colors",
              solid ? "text-primary" : "text-ivory",
            )}
          >
            AL-MADINA
          </span>
          <span
            className={cn(
              "block text-[9px] font-medium uppercase tracking-[0.55em] transition-colors",
              solid ? "text-warmgrey" : "text-champagne",
            )}
          >
            Jewellers
          </span>
        </Link>

        {/* Centre navigation */}
        <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
          {NAV.map((item) => (
            <div key={item.label} className="group relative">
              <Link
                to={item.to}
                className={cn(
                  // Tracking tightens below xl. Seven items and the icon cluster
                  // exactly fill the bar at 1024px, where the desktop nav first
                  // appears; the wide tracking returns as soon as there is room.
                  "flex items-center gap-1 py-2 text-[12px] font-medium uppercase tracking-wider transition-colors xl:tracking-widest",
                  solid ? "text-ink hover:text-gold" : "text-ivory hover:text-gold",
                )}
              >
                {item.label}
                {item.mega && <ChevronDown className="h-3 w-3" strokeWidth={1.5} />}
              </Link>

              {item.mega && (
                <div className="invisible absolute left-1/2 top-full w-[560px] -translate-x-1/2 border border-gold/30 bg-ivory p-8 opacity-0 shadow-[var(--shadow-soft)] transition-opacity duration-300 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Collections</p>
                  <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
                    {categories.map((c) => (
                      <Link
                        key={c.slug}
                        to="/collections/$slug"
                        params={{ slug: c.slug }}
                        className="font-display text-lg text-primary transition-colors hover:text-gold"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className={cn("transition-colors hover:text-gold", solid ? "text-ink" : "text-ivory")}
          >
            <Search className="h-5 w-5" strokeWidth={1.3} />
          </button>

          <Link
            to="/wishlist"
            aria-label={skus.length > 0 ? `Wishlist, ${skus.length} saved` : "Wishlist"}
            className={cn(
              "relative transition-colors hover:text-gold",
              solid ? "text-ink" : "text-ivory",
            )}
          >
            <Heart className="h-5 w-5" strokeWidth={1.3} />
            {skus.length > 0 && (
              <span className="nums absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold text-primary">
                {skus.length}
              </span>
            )}
          </Link>

          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Your order, ${cartCount} pieces` : "Your order"}
            className={cn(
              "relative transition-colors hover:text-gold",
              solid ? "text-ink" : "text-ivory",
            )}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.3} />
            {cartCount > 0 && (
              <span className="nums absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold text-primary">
                {cartCount}
              </span>
            )}
          </Link>
          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className={cn("transition-colors hover:text-gold", solid ? "text-ink" : "text-ivory")}
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={cn("lg:hidden", solid ? "text-ink" : "text-ivory")}
          >
            {menuOpen ? (
              <X className="h-6 w-6" strokeWidth={1.3} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.3} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="border-t border-gold/30 bg-ivory lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="border-b border-gold/20 py-4 font-display text-xl text-primary last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
