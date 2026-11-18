import { useId, useState } from "react";
import type { ReactNode } from "react";

import { ChevronDown, Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The small print, folded away.
 *
 * Every section of the International tab says where its figures come from and
 * what they are not — not the shop's rate, not a forecast, not advice. The
 * shop asked for those paragraphs to stop filling the screen, so they sit
 * behind one quiet line that opens them. They are folded, never removed: the
 * sources and the disclaimers are still one tap away for anybody who asks.
 */
export function InfoNote({
  children,
  label = "About this data",
  align = "start",
  className,
}: {
  children: ReactNode;
  label?: string;
  align?: "start" | "center";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((shown) => !shown)}
        className="inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-[10.5px] font-semibold text-rate-ink/55 active:text-rate-gold-deep"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {label}
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <p id={id} className="mt-1.5 text-[10.5px] leading-relaxed text-warmgrey">
          {children}
        </p>
      ) : null}
    </div>
  );
}
