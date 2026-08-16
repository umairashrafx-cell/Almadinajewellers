import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * House buttons. Sharp corners (2px max), uppercase, wide tracking.
 * primary  = solid gold, dark green text
 * outline  = 1px gold outline on transparent
 * ghostLight = outline variant for use on dark green sections
 */
type Variant = "primary" | "outline" | "ghostLight";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[2px] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest transition-colors duration-300";

const variants: Record<Variant, string> = {
  primary: "bg-gold text-primary hover:bg-champagne",
  outline: "border border-gold bg-transparent text-ink hover:bg-champagne/50",
  ghostLight: "border border-gold bg-transparent text-ivory hover:bg-gold hover:text-primary",
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
