import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export type Step = {
  title: string;
  body: string;
  icon: LucideIcon;
};

/**
 * What happens at the counter, in order, for a dark band.
 *
 * Across the page on a wide screen, with a line drawn through the numbers as
 * the section arrives — the one piece of motion here that says something,
 * because it is the order that matters. Down the page on a phone, where five
 * columns would be five slivers, with the same line running vertically between
 * the cards.
 *
 * An ordered list, so a screen reader announces "1 of 5" without being told.
 */
export function ProcessTimeline({ steps }: { steps: Step[] }) {
  const { ref, shown } = useReveal<HTMLOListElement>();

  return (
    <ol ref={ref} className="relative mt-14 grid gap-5 lg:grid-cols-5 lg:gap-6">
      {/*
        Centre of the first column to centre of the last: with five equal
        columns those sit at a tenth in from either edge.
      */}
      <div
        className="absolute left-[10%] right-[10%] top-6 hidden h-px bg-gold/20 lg:block"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-full origin-left bg-gradient-to-r from-gold via-gold/80 to-gold/50 transition-transform duration-[1400ms] ease-out motion-reduce:transition-none",
            shown ? "scale-x-100" : "scale-x-0 motion-reduce:scale-x-100",
          )}
        />
      </div>

      {steps.map((step, i) => (
        <Reveal
          as="li"
          key={step.title}
          delay={i * 90}
          className="relative grid grid-cols-[3rem_1fr] gap-4 lg:flex lg:flex-col lg:items-center lg:gap-0"
        >
          <span className="nums relative z-10 grid h-12 w-12 place-items-center rounded-full border border-gold bg-primary text-sm font-semibold text-gold">
            {String(i + 1).padStart(2, "0")}
          </span>

          {i < steps.length - 1 ? (
            <span
              className="absolute -bottom-5 left-6 top-12 w-px bg-gold/30 lg:hidden"
              aria-hidden="true"
            />
          ) : null}

          <div className="h-full w-full border border-gold/20 bg-primary-deep/40 p-5 transition-colors duration-300 hover:border-gold/50 lg:mt-6 lg:p-6 lg:text-center">
            <step.icon
              className="h-6 w-6 text-gold lg:mx-auto"
              strokeWidth={1.3}
              aria-hidden="true"
            />
            <p className="nums mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Step {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 font-display text-2xl font-light leading-tight text-ivory">
              {step.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-champagne/85">{step.body}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
