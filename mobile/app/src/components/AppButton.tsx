import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The app's own buttons.
 *
 * Deliberately not the website's ActionButton, which the app goes on using
 * wherever it already does. That component's comment is explicit that its
 * two-pixel corners are a brand decision — "rounding them would make a
 * jewellery house read like a piece of software" — and it is right about the
 * website. These are for the app's own screens, where the house style is a
 * stack of rounded cards and a square button in the middle of them reads as
 * something that has not been finished.
 *
 * Three variants, and the split is by what the button does rather than by how
 * it looks. `primary` is the green one: the action the screen exists for, one
 * per screen. `gold` is the brand's own invitation — browsing, exploring,
 * sending something in — and it is the website's gold, not a second gold.
 * `quiet` is everything a customer might want and the screen does not need
 * them to do.
 *
 * Full width by default, because every one of these sits in a column on a
 * phone and a button that stops short of the column edge is a button somebody
 * misses with a thumb.
 */
type Variant = "primary" | "gold" | "quiet";

const base =
  "inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-semibold tracking-wide transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-55 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary: "card-lift-sm bg-primary text-ivory hover:bg-primary-deep",
  gold: "card-lift-sm bg-gold text-primary hover:bg-gold-light",
  quiet: "border border-gold/30 bg-white text-ink hover:border-gold/60 hover:bg-champagne/30",
};

type Shared = { variant?: Variant; children: ReactNode; className?: string };

export function AppButton({
  variant = "primary",
  className,
  children,
  ...props
}: Shared & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function AppLink({
  variant = "primary",
  className,
  children,
  ...props
}: Shared & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn(base, variants[variant], className)} {...props}>
      {children}
    </a>
  );
}
