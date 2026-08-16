import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light"; // light = for use on dark green backgrounds
  className?: string;
};

/** Editorial section heading: small tracked eyebrow + Cormorant title. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "dark",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      )}
      <h2
        className={cn(
          "mt-4 font-display text-3xl font-light tracking-wide sm:text-4xl md:text-5xl",
          tone === "light" ? "text-ivory" : "text-primary",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-sm leading-relaxed",
            tone === "light" ? "text-champagne/80" : "text-warmgrey",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
