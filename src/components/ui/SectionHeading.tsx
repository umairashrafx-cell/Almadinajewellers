import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light"; // light = for use on dark green backgrounds
  /**
   * Kept so existing calls still compile. The readable colours it used to
   * switch on are now the default on a light ground: bright gold on ivory
   * measures 2.3:1, too faint for eleven-pixel words, so every heading uses
   * the deep gold and a darker description rather than only the ones that
   * asked for it.
   */
  strong?: boolean;
  className?: string;
};

/**
 * Editorial section heading: small tracked eyebrow + Cormorant title.
 *
 * The scroll reveal lives here rather than at the call sites. Section content
 * was already revealing — product grids, story panels — while the heading above
 * it appeared instantly, so sections animated from the middle outwards. Putting
 * it on the heading itself means every section leads with the same motion
 * without twenty call sites having to remember to wrap it.
 *
 * The reveal is applied to the existing container rather than a new wrapper, so
 * layout classes passed in through `className` keep working unchanged.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "dark",
  className,
}: Props) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "reveal max-w-2xl",
        shown && "reveal-in",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.3em]",
            tone === "light" ? "text-gold" : "text-gold-deep",
          )}
        >
          {eyebrow}
        </p>
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
            tone === "light" ? "text-champagne/80" : "text-ink/75",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
