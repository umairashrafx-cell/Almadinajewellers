import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared furniture for the admin screens.
 *
 * Optional props are written `?: T | undefined` rather than `?: T` because the
 * project sets exactOptionalPropertyTypes and every caller here passes a value
 * that may legitimately be undefined.
 */

/* ------------------------------------------------------------------ *
 * Accents
 * ------------------------------------------------------------------ */

/**
 * The enquiry kinds, each with its own colour.
 *
 * Staff read this list under counter pressure, and a bridal booking is worth a
 * hundred times a rate question. Colour lets that difference register before
 * the label is read.
 */
export type Tone = "bridal" | "product" | "contact" | "callback" | "settled" | "neutral";

const TONES: Record<Tone, { chip: string; bar: string; dot: string }> = {
  bridal: { chip: "bg-bridal-tint text-bridal", bar: "bg-bridal", dot: "bg-bridal" },
  product: { chip: "bg-piece-tint text-piece", bar: "bg-piece", dot: "bg-piece" },
  contact: { chip: "bg-enquiry-tint text-enquiry", bar: "bg-enquiry", dot: "bg-enquiry" },
  callback: { chip: "bg-callback-tint text-callback", bar: "bg-callback", dot: "bg-callback" },
  settled: { chip: "bg-settled-tint text-settled", bar: "bg-settled", dot: "bg-settled" },
  neutral: { chip: "bg-muted text-warmgrey", bar: "bg-warmgrey/40", dot: "bg-warmgrey" },
};

const ENQUIRY_TONES: readonly string[] = ["bridal", "product", "contact", "callback"];

/** Maps an enquiry's stored type onto its colour, defaulting to neutral. */
export function toneFor(type: string): Tone {
  return ENQUIRY_TONES.includes(type) ? (type as Tone) : "neutral";
}

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        TONES[tone].chip,
        className,
      )}
    >
      {children}
    </span>
  );
}

export const toneBar = (tone: Tone) => TONES[tone].bar;
export const toneDot = (tone: Tone) => TONES[tone].dot;

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

export function Card({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gold/25 bg-card shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A headline number with its own colour, for the top of a screen. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
  tone?: Tone | undefined;
  icon?: ComponentType<{ className?: string }> | undefined;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      {/* A colour bar rather than a coloured card: the number stays readable. */}
      <span className={cn("absolute inset-x-0 top-0 h-1", TONES[tone].bar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-warmgrey">
            {label}
          </p>
          <p className="nums mt-2 font-display text-4xl font-light text-primary">{value}</p>
          {hint ? <p className="mt-1 text-xs text-warmgrey">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn("rounded-lg p-2", TONES[tone].chip)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */

export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

export function Banner({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-settled/30 bg-settled-tint text-settled",
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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-light tracking-wide text-primary">{title}</h1>
        {hint ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-warmgrey">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
