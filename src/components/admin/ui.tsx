import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Small shared pieces for the admin screens. Plain on purpose — this is a tool
 * for the shop, not part of the storefront's visual language.
 *
 * Optional props are written `?: string | undefined` rather than `?: string`
 * because the project sets exactOptionalPropertyTypes, and every caller here
 * passes a value that may legitimately be undefined.
 */

export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}

export function Banner({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-primary/30 bg-primary/5 text-primary",
      )}
    >
      {children}
    </p>
  );
}

export function PageHeading({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | undefined;
  children?: ReactNode | undefined;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-light tracking-wide text-primary">{title}</h1>
        {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
