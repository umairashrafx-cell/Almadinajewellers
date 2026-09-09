import type { ComponentType } from "react";

/**
 * One of the three promises under the board.
 *
 * The icon is decorative — the words beside it say the same thing, and a
 * screen reader reading "shield" before "Hallmarked gold" adds nothing.
 */
export function TrustFeature({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-center gap-3 sm:justify-start">
      <Icon className="h-5 w-5 shrink-0 text-rate-gold-deep" strokeWidth={1.5} aria-hidden={true} />
      <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.14em] text-rate-ink/90">
        {children}
      </span>
    </li>
  );
}
