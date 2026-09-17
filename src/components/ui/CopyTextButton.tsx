import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { ActionButton } from "@/components/ui/ActionButton";
import { TileIcon, shareTile } from "@/components/ui/ShareTile";
import { cn } from "@/lib/utils";

/**
 * Copies a piece of text and says so.
 *
 * The clipboard API needs a secure context and permission; where either is
 * missing — an older in-app browser, a page opened over plain http — it falls
 * back to selecting a hidden textarea and copying that, which browsers still
 * honour from a click. If both fail the button says so rather than pretending.
 *
 * The confirmation is announced politely, so a screen reader hears it without
 * the button's own name changing under the keyboard focus.
 */
export function CopyTextButton({
  text,
  label,
  className,
  variant = "outline",
  announce = "Rates copied to the clipboard",
  tile = false,
}: {
  text: string;
  label: string;
  className?: string;
  variant?: "outline" | "ghostLight";
  /** What a screen reader hears once the copy has worked. */
  announce?: string;
  /** Draw as a square tile, beside the other ways to share. */
  tile?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(reset.current), []);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }

    setState(ok ? "copied" : "failed");
    clearTimeout(reset.current);
    reset.current = setTimeout(() => setState("idle"), 2500);
  };

  const icon =
    state === "copied" ? (
      <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
    ) : (
      <Copy className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
    );

  if (tile) {
    return (
      <button type="button" onClick={copy} className={cn(shareTile, className)}>
        <TileIcon>{icon}</TileIcon>
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
        <span className="sr-only" aria-live="polite">
          {state === "copied" ? announce : state === "failed" ? "Could not copy" : ""}
        </span>
      </button>
    );
  }

  return (
    <ActionButton type="button" variant={variant} onClick={copy} className={className}>
      {icon}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? announce : state === "failed" ? "Could not copy" : ""}
      </span>
    </ActionButton>
  );
}
