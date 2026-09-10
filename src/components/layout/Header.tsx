import { useEffect, useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  Gem,
  Hammer,
  Heart,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  Star,
  Tag,
  X,
} from "lucide-react";

import logoOnDark from "@/assets/brand/logo-horizontal-on-dark.svg";
import logoOnLight from "@/assets/brand/logo-horizontal-on-light.svg";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { GoldBarsIcon, RingIcon } from "@/components/ui/JewelleryIcons";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { categoryTree, fetchCategories } from "@/lib/catalogue";
import { categories as fallbackCategories } from "@/data/products";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

type NavIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

const NAV: { label: string; to: string; icon: NavIcon; mega?: boolean }[] = [
  { label: "Collections", to: "/collections", icon: Gem, mega: true },
  { label: "Bridal", to: "/bridal", icon: RingIcon },
  { label: "New Arrivals", to: "/new-arrivals", icon: Star },
  { label: "Gold Rate", to: "/gold-rate-in-mandi-bahauddin-today", icon: GoldBarsIcon },
  { label: "Sell Gold", to: "/sell-your-gold", icon: Tag },
  { label: "Custom Order", to: "/custom-order", icon: Hammer },
  { label: "Our Story", to: "/our-story", icon: BookOpen },
  { label: "Stores", to: "/stores", icon: MapPin },
];

/*
 * The navigation pill.
 *
 * The gold is a layer rather than a background swap. A gradient cannot be
 * transitioned, so a hover that replaced one with another would snap; fading
 * a gold layer in over the ivory gives the quarter-second ease instead.
 *
 * The text on gold is near-black, not white. White on this gold measures about
 * 2:1, which is unreadable for thirteen-pixel capitals; ink on it is 9:1.
 *
 * Active is TanStack's own data-status, so the pill for the page you are on is
 * lit with nothing to keep in sync — and it follows you into child pages, so
 * Collections stays lit on a collection and Our Story on the founder's page.
 */
const PILL =
  "group/pill relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl border font-nav font-medium uppercase transition-[transform,box-shadow,border-color,color] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-lux-gold-light before:to-lux-gold-deep before:opacity-0 before:transition-opacity before:duration-[250ms] hover:-translate-y-0.5 hover:border-lux-gold hover:text-lux-ink hover:shadow-[0_8px_20px_rgb(184_137_45/0.22)] hover:before:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lux-gold data-[status=active]:border-lux-gold data-[status=active]:text-lux-ink data-[status=active]:shadow-[0_6px_18px_rgb(184_137_45/0.25)] data-[status=active]:before:opacity-100 motion-reduce:transition-none motion-reduce:before:transition-none motion-reduce:hover:translate-y-0";

/*
 * Four sizes, because eight labelled pills do not fit one row until the
 * screen is wide. Measured in Montserrat: the full design with icons needs
 * about 1,760px, so it arrives at 1840px. Below that the icons step out and
 * the type tightens a step at a time, and below 1280px the menu moves into
 * the drawer.
 *
 * Only min-[…] breakpoints here, never sm/md/xl: Tailwind emits the named
 * ones after the arbitrary ones, so mixing them lets a narrower size win.
 */
const PILL_SIZE =
  "h-10 px-2.5 text-[11px] tracking-[0.06em] min-[1400px]:h-[42px] min-[1400px]:px-3 min-[1400px]:text-[11.5px] min-[1400px]:tracking-[0.08em] min-[1536px]:h-11 min-[1536px]:px-3 min-[1536px]:text-xs min-[1536px]:tracking-[1.2px] min-[1840px]:h-[52px] min-[1840px]:px-3.5 min-[1840px]:text-[13px] min-[1840px]:tracking-[1.5px]";

const PILL_IVORY =
  "border-lux-border bg-gradient-to-br from-white to-lux-cream text-lux-ink shadow-[0_4px_12px_rgb(100_70_20/0.06)]";

/* Over a hero photograph: glass rather than ivory card, so the image shows. */
const PILL_GLASS =
  "border-white/25 bg-gradient-to-br from-white/15 to-white/5 text-ivory backdrop-blur-sm";

const ICON_BUTTON =
  "relative grid h-10 w-10 place-items-center rounded-full transition-colors duration-[250ms] hover:text-lux-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lux-gold [&>svg]:transition-transform [&>svg]:duration-[250ms] hover:[&>svg]:scale-[1.08] motion-reduce:hover:[&>svg]:scale-100";

const BADGE =
  "nums absolute right-0 top-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-full bg-lux-gold-dark px-1 text-[10px] font-semibold leading-none text-white";

/**
 * Sticky header: ivory everywhere, glass over a hero.
 *
 * `overHero` is the whole point of the second mode. Three pages pull a
 * full-bleed dark image up under the header, and there the wordmark, the
 * pills and the icons have to read against a photograph. Every other page
 * starts on the ivory ground, so solid is the default and a page has to opt
 * into the transparent treatment rather than every new page inheriting it.
 *
 * Its height lives in --header-h, which is also what those heroes pull up by,
 * so the photograph always tucks exactly under it at every breakpoint.
 */
export function Header({ overHero = false }: { overHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { skus } = useWishlist();
  const { count: cartCount } = useCart();

  /*
   * The mega menu reads the live categories, falling back to the bundled list
   * only until the query answers, so it is never empty on first paint and a
   * category added in the admin appears here without a deploy.
   */
  const { data: liveCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const tree = categoryTree(
    liveCategories ?? fallbackCategories.map((c, i) => ({ ...c, sortOrder: i, parentSlug: null })),
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the drawer, as it does any menu a keyboard can open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const solid = !overHero || scrolled || menuOpen;
  const iconTone = solid ? "text-lux-ink" : "text-ivory";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow] duration-500",
        // The rule under the header is an inset shadow rather than a border,
        // so the header is exactly --header-h tall in both modes and a hero
        // pulled up by that much leaves no hairline of page above it.
        solid
          ? "bg-lux-ivory shadow-[inset_0_-1px_0_var(--lux-border),0_4px_20px_rgb(80_55_20/0.04)]"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1480px] items-center gap-3 px-4 min-[640px]:px-6 min-[1280px]:gap-5 min-[1536px]:px-8 min-[1840px]:max-w-[1840px]">
        {/*
          The logo, in the shop's own artwork. Two files rather than one
          recoloured by CSS: the mark is a shaded gold diamond that cannot take
          a text colour, and the wordmark is green on ivory and pale gold over a
          photograph. Both share one lockup, so swapping them moves nothing.

          The alt text is empty and the name lives on the link, so a screen
          reader announces "Al-Madina Jewellers home" once rather than twice.
        */}
        <Link
          to="/"
          aria-label={`${SITE.name} home`}
          className="shrink-0 rounded-md leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lux-gold"
        >
          <img
            src={solid ? logoOnLight : logoOnDark}
            alt=""
            width={1120}
            height={300}
            className="h-[42px] w-auto min-[375px]:h-[46px] min-[768px]:h-[52px] min-[1280px]:h-[46px] min-[1536px]:h-[52px] min-[1840px]:h-[58px]"
          />
        </Link>

        <nav
          aria-label="Main"
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 min-[1280px]:flex min-[1400px]:gap-1.5 min-[1840px]:gap-2.5"
        >
          {NAV.map((item) => {
            const pill = (
              <Link to={item.to} className={cn(PILL, PILL_SIZE, solid ? PILL_IVORY : PILL_GLASS)}>
                <item.icon
                  className={cn(
                    "hidden h-[18px] w-[18px] shrink-0 transition-colors group-hover/pill:text-lux-ink group-data-[status=active]/pill:text-lux-ink min-[1840px]:block",
                    solid ? "text-lux-gold-deep" : "text-lux-gold-light",
                  )}
                  strokeWidth={1.7}
                />
                {item.label}
                {item.mega ? (
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-[250ms] group-hover/mega:rotate-180 group-focus-within/mega:rotate-180 motion-reduce:transition-none"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            );

            if (!item.mega) return <div key={item.label}>{pill}</div>;

            return (
              <div key={item.label} className="group/mega relative">
                {pill}
                {/*
                  Opens on hover and on focus, so a keyboard reaches every
                  category by tabbing through. The top padding is a bridge: the
                  pointer crosses it from the pill to the panel without the
                  menu closing underneath it.
                */}
                <div className="invisible absolute left-0 top-full z-10 w-[560px] pt-5 opacity-0 transition-[opacity,visibility] duration-300 group-focus-within/mega:visible group-focus-within/mega:opacity-100 group-hover/mega:visible group-hover/mega:opacity-100">
                  <div className="rounded-2xl border border-lux-border bg-lux-ivory p-8 shadow-[0_18px_40px_rgb(80_55_20/0.12)]">
                    <p className="font-nav text-[11px] font-medium uppercase tracking-[0.3em] text-lux-gold-dark">
                      Collections
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
                      {tree.map((c) => (
                        <div key={c.slug}>
                          <Link
                            to="/collections/$slug"
                            params={{ slug: c.slug }}
                            className="font-display text-lg text-lux-ink transition-colors hover:text-lux-gold-dark"
                          >
                            {c.name}
                          </Link>
                          {c.children.length > 0 ? (
                            <ul className="mt-1.5 space-y-1">
                              {c.children.map((child) => (
                                <li key={child.slug}>
                                  <Link
                                    to="/collections/$slug"
                                    params={{ slug: child.slug }}
                                    className="text-sm text-lux-muted transition-colors hover:text-lux-gold-dark"
                                  >
                                    {child.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/*
          Utilities. Each sits in a forty-pixel target, the size a fingertip
          needs. On a phone the wishlist moves into the drawer — with its count
          — which is what makes room for WhatsApp beside search and the bag.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 min-[768px]:gap-1.5 min-[1280px]:ml-0 min-[1280px]:gap-2 min-[1400px]:gap-3">
          <span
            className={cn(
              "mx-1 hidden h-8 w-px min-[1280px]:block",
              solid ? "bg-lux-gold-light" : "bg-white/30",
            )}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className={cn(ICON_BUTTON, iconTone)}
          >
            <Search className="h-[23px] w-[23px]" strokeWidth={1.4} />
          </button>

          <Link
            to="/wishlist"
            aria-label={skus.length > 0 ? `Wishlist, ${skus.length} saved` : "Wishlist"}
            className={cn(ICON_BUTTON, iconTone, "hidden min-[768px]:grid")}
          >
            <Heart className="h-[23px] w-[23px]" strokeWidth={1.4} />
            {skus.length > 0 && <span className={BADGE}>{skus.length}</span>}
          </Link>

          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Your order, ${cartCount} pieces` : "Your order"}
            className={cn(ICON_BUTTON, iconTone)}
          >
            <ShoppingBag className="h-[23px] w-[23px]" strokeWidth={1.4} />
            {cartCount > 0 && <span className={BADGE}>{cartCount}</span>}
          </Link>

          <a
            href={`https://wa.me/${SITE.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className={cn(ICON_BUTTON, iconTone)}
          >
            <WhatsAppIcon className="h-[25px] w-[25px]" />
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            className={cn(ICON_BUTTON, iconTone, "min-[1280px]:hidden")}
          >
            {menuOpen ? (
              <X className="h-6 w-6" strokeWidth={1.4} />
            ) : (
              <Menu className="h-6 w-6" strokeWidth={1.4} />
            )}
          </button>
        </div>
      </div>

      {/* Drawer: the same pills, full width, below 1280px. */}
      {menuOpen && (
        <div
          id="site-menu"
          className="max-h-[calc(100dvh-var(--header-h))] overflow-y-auto border-t border-lux-border bg-lux-ivory min-[1280px]:hidden"
        >
          <nav
            aria-label="Main"
            className="mx-auto grid max-w-3xl gap-2.5 px-4 py-5 min-[640px]:grid-cols-2 min-[640px]:px-6"
          >
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  PILL,
                  PILL_IVORY,
                  "h-14 justify-start gap-3 px-4 text-[13px] tracking-[1.4px]",
                )}
              >
                <item.icon
                  className="h-5 w-5 shrink-0 text-lux-gold-deep transition-colors group-hover/pill:text-lux-ink group-data-[status=active]/pill:text-lux-ink"
                  strokeWidth={1.7}
                />
                {item.label}
              </Link>
            ))}
            <Link
              to="/wishlist"
              onClick={() => setMenuOpen(false)}
              className={cn(
                PILL,
                PILL_IVORY,
                "h-14 justify-start gap-3 px-4 text-[13px] tracking-[1.4px] min-[768px]:hidden",
              )}
            >
              <Heart
                className="h-5 w-5 shrink-0 text-lux-gold-deep transition-colors group-hover/pill:text-lux-ink group-data-[status=active]/pill:text-lux-ink"
                strokeWidth={1.7}
                aria-hidden="true"
              />
              Wishlist
              {skus.length > 0 && (
                <span className="nums ml-auto grid h-[19px] min-w-[19px] place-items-center rounded-full bg-lux-gold-dark px-1 text-[10px] font-semibold leading-none tracking-normal text-white">
                  {skus.length}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
