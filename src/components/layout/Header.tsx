import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Heart, Menu, X, MessageCircle, ChevronDown } from "lucide-react";
import { SITE } from "@/lib/site";
import { categories } from "@/data/products";
import { cn } from "@/lib/utils";

// Items still pointing at "/" are placeholders until those pages are built.
const NAV = [
  { label: "Collections", to: "/collections", mega: true },
  { label: "Bridal", to: "/bridal" },
  { label: "New Arrivals", to: "/" },
  { label: "Gold Rate", to: "/gold-rate" },
  { label: "Our Story", to: "/" },
  { label: "Stores", to: "/" },
];

/** Sticky header: transparent over the hero, solid ivory once scrolled. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <div key={item.label} className="group relative">
              <Link
                to={item.to}
                className={cn(
                  "flex items-center gap-1 py-2 text-[12px] font-medium uppercase tracking-widest transition-colors",
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
          {[
            { Icon: Search, label: "Search" },
            { Icon: Heart, label: "Wishlist" },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              className={cn("transition-colors hover:text-gold", solid ? "text-ink" : "text-ivory")}
            >
              <Icon className="h-5 w-5" strokeWidth={1.3} />
            </button>
          ))}
          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className={cn("transition-colors hover:text-gold", solid ? "text-ink" : "text-ivory")}
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.3} />
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
    </header>
  );
}
