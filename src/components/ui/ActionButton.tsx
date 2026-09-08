import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * House buttons. Sharp corners (2px max), uppercase, wide tracking.
 * primary  = solid gold, dark green text
 * outline  = 1px gold outline on transparent
 * ghostLight = outline variant for use on dark green sections
 *
 * The shape is deliberate and unchanged: two-pixel corners and wide-tracked
 * capitals are what the rest of the site is built around, and rounding them
 * would make a jewellery house read like a piece of software.
 *
 * What they gained is depth and response. A gradient rather than a flat fill,
 * a hairline of light along the top edge the way a bevelled metal edge catches
 * it, a shadow that grows as the button lifts under the cursor, a press that
 * presses, and a band of light that crosses the face on hover — which is what
 * gold does when you turn it under a lamp. The sheen and the lift are dropped
 * for anyone who has asked for reduced motion; the colour and shadow changes
 * stay, because those carry meaning rather than decoration.
 */
type Variant = "primary" | "outline" | "ghostLight";

const base =
  "btn-surface inline-flex items-center justify-center gap-2 rounded-[2px] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest hover:-translate-y-px active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary:
    "btn-sheen bg-gradient-to-b from-[oklch(0.76_0.1_85)] to-gold text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.42),0_1px_2px_oklch(0.16_0.035_160/0.22),0_6px_14px_oklch(0.16_0.035_160/0.10)] hover:from-[oklch(0.79_0.1_85)] hover:to-[oklch(0.73_0.1_85)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_3px_7px_oklch(0.16_0.035_160/0.26),0_12px_24px_oklch(0.16_0.035_160/0.15)] active:shadow-[inset_0_2px_4px_oklch(0.16_0.035_160/0.28)]",
  outline:
    "border border-gold bg-transparent text-ink hover:border-gold hover:bg-champagne/50 hover:shadow-[0_4px_12px_oklch(0.16_0.035_160/0.10)]",
  ghostLight:
    "btn-sheen border border-gold bg-transparent text-ivory hover:bg-gold hover:text-primary hover:shadow-[0_4px_14px_oklch(0.16_0.035_160/0.35)]",
};

export function ActionButton({
  variant = "primary",
  className,
  children,
  ...props
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ActionLink({
  variant = "primary",
  className,
  children,
  ...props
}: { variant?: Variant; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn(base, variants[variant], className)} {...props}>
      {children}
    </a>
  );
}
