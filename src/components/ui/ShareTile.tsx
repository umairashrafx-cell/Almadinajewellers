import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One way to send something, drawn as a small square.
 *
 * A row of three of these — text, picture, link — has to fit the width of a
 * phone, so each is an icon in a gold ring above one or two words rather than a
 * full-width button with a long label. Used on the dark green panels, where a
 * hairline ring reads as jewellery rather than as a form control.
 */
export const shareTile =
  "group flex min-h-[86px] w-full flex-col items-center justify-center gap-2 rounded-[2px] border border-gold/35 bg-ivory/[0.04] px-2 py-3 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-ivory transition-colors hover:border-gold hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60 sm:text-[11px]";

/** The gold ring the tile's icon sits in. */
export function TileIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/50 text-gold transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
