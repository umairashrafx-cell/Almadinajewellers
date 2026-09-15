import type { LucideIcon } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

export type PointItem = { title: string; body: string; icon?: LucideIcon };

/**
 * A few short, equal points under a gold rule.
 *
 * The pattern Our Story uses for its standards — a hairline, a Cormorant title
 * and a paragraph — made reusable, with an optional icon. One column on a
 * phone, two from `sm`, and three from `lg` when there are three or more.
 */
export function PointGrid({ points }: { points: PointItem[] }) {
  return (
    <div
      className={cn(
        "grid gap-x-12 gap-y-10 sm:grid-cols-2",
        points.length % 3 === 0 && "lg:grid-cols-3",
      )}
    >
      {points.map((point, i) => (
        <Reveal key={point.title} delay={(i % 3) * 80}>
          <div className="border-t border-gold/40 pt-6">
            {point.icon ? (
              <point.icon className="h-6 w-6 text-gold" strokeWidth={1.3} aria-hidden="true" />
            ) : null}
            <h3
              className={cn(
                "font-display text-2xl font-light tracking-wide text-primary",
                point.icon && "mt-4",
              )}
            >
              {point.title}
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{point.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
