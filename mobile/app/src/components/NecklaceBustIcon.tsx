import type { SVGProps } from "react";

/**
 * A necklace on a display bust: the Shop tab's mark.
 *
 * It had been Lucide's sparkles, which is the icon every app uses for "new",
 * "AI" and "magic" and says nothing about a jewellery case. This says what is
 * behind the tab — the tray at the counter — and it is the one tab in the bar
 * whose subject is a thing rather than an action.
 *
 * Drawn here rather than traced from the reference, because the reference is a
 * 512px illustration and this renders at twenty. Three things in it do not
 * survive that: the beads along the chain, which merge into a single thick
 * line; the ring beside the bust, which at this size is a circle with a crumb
 * on it; and the sparkles, which become noise. What is kept is the silhouette,
 * the chain, the pendant and the base — the four marks that make the object
 * readable at a glance, which is the whole job of a tab icon.
 *
 * Stroked rather than filled, at Lucide's own geometry, so it sits beside
 * Home, Gem, Heart and PencilRuler as one family and not as a pasted-in guest.
 */
export function NecklaceBustIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {/* The bust. Straight out of the neck to the shoulder and rounded from
          there to the point, which is the line that stops it reading as a
          vase: shoulders are a corner, and a smooth flare has none. */}
      <path d="M9.3 2.6h5.4l3.2 5c1.5 2.7.5 6.3-5.9 10.8-6.4-4.5-7.4-8.1-5.9-10.8Z" />
      {/* The chain, hung wide across the chest rather than down the neck.
          Drawn close to the collar it reads at this size as a slit cut into
          the bust; out here there is daylight either side of it and it reads
          as what it is. */}
      <path d="M8.5 6c.4 3 1.8 4.6 3.5 5.3 1.7-.7 3.1-2.3 3.5-5.3" />
      {/* The pendant. A diamond rather than the reference's hexagon: at this
          size the two are the same four pixels, and a diamond keeps its
          corners while a hexagon rounds off into a blob. */}
      <path d="m12 11.5 1.3 1.3-1.3 1.3-1.3-1.3Z" />
      {/* The stand. */}
      <ellipse cx="12" cy="19.8" rx="4.3" ry="1.5" />
    </svg>
  );
}
