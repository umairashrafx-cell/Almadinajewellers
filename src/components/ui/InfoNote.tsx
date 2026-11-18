import { useId, useState } from "react";
import type { ReactNode } from "react";

import { ChevronDown, Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The small print, folded away.
 *
 * Every section of the international board says where its figures come from
 * and what they are not — not the shop's rate, not a forecast, not advice. The
 * shop asked for those paragraphs to stop filling the screen, so they sit
 * behind one quiet line that opens them. They are folded, never removed: the
 * sources and the disclaimers are still one tap away for anybody who asks.
 *
 * Shared by the app's International tab and the website's rate page, which is
 * what `size` is for. The app sets this type at ten and a half pixels because
 * it is a footnote on a phone screen already full of cards; the same size on a
 * desktop page reads as something the page is trying to hide, so the website
 * asks for the larger step.
 */
export function InfoNote({
  children,
  label = "About this data",
  align = "start",
  size = "sm",
  className,
}: {
  children: ReactNode;
  label?: string;
  align?: "start" | "center";
  size?: "sm" | "md";
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
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1 py-0.5 font-semibold text-rate-ink/55 transition-colors hover:text-rate-gold-deep active:text-rate-gold-deep",
          size === "sm" ? "text-[10.5px]" : "text-xs",
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {label}
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <p
          id={id}
          className={cn(
            "leading-relaxed text-warmgrey",
            size === "sm" ? "mt-1.5 text-[10.5px]" : "mt-2 text-xs",
          )}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
