import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

export type StepItem = { title: string; body: string; icon: LucideIcon };

/**
 * What happens, in order, on a light ground.
 *
 * The light-ground counterpart of the Sell Your Gold timeline: numbered gold
 * medallions, the same step label and Cormorant titles. Down the page on a
 * phone with a hairline joining the numbers, where a row of narrow columns
 * would be unreadable; across the page from `lg`, where the order still reads
 * left to right.
 *
 * An ordered list, so a screen reader announces "1 of 4" without being told.
 */
export function StepList({ steps }: { steps: StepItem[] }) {
  const columns =
    steps.length >= 5 ? "lg:grid-cols-5" : steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <ol className={cn("grid gap-6 lg:gap-8", columns)}>
      {steps.map((step, i) => (
        <Reveal
          as="li"
          key={step.title}
          delay={i * 80}
          className="relative grid grid-cols-[3rem_1fr] gap-4 lg:block"
        >
          <span className="nums relative z-10 grid h-12 w-12 place-items-center rounded-full border border-gold bg-ivory text-sm font-semibold text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>

          {i < steps.length - 1 ? (
            <span
              className="absolute -bottom-6 left-6 top-12 w-px bg-gold/30 lg:hidden"
              aria-hidden="true"
            />
          ) : null}

          <div className="h-full border border-gold/25 bg-card p-5 shadow-[var(--shadow-soft)] lg:mt-6 lg:p-6">
            <step.icon className="h-6 w-6 text-gold" strokeWidth={1.3} aria-hidden="true" />
            <p className="nums mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rate-gold-deep">
              Step {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 font-display text-2xl font-light leading-tight text-primary">
              {step.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{step.body}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
