import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { fetchHomeRails } from "@/lib/catalogue";
import { formatGrams, formatPKR } from "@/lib/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

/** Horizontal-scroll carousel of flagship bridal sets, heaviest first. */
export function SignatureBridal() {
  const { data, isPending } = useQuery({
    queryKey: ["home-rails"],
    queryFn: fetchHomeRails,
    staleTime: 5 * 60 * 1000,
  });

  const sets = data?.bridal ?? [];

  /*
   * A heading promising our heaviest sets, over an empty strip, reads as a
   * fault. While the category has nothing in it the section stands down
   * entirely rather than announcing an absence.
   */
  if (!isPending && sets.length === 0) return null;

  return (
    <section className="section-y bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Flagship"
          title="Signature Bridal"
          description="Our heaviest, most intricate sets. Each one is made to order and takes six to ten weeks."
          tone="light"
          align="left"
        />
      </div>

      <div className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8">
        {isPending
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[280px] shrink-0 sm:w-[340px]">
                <Skeleton className="aspect-[4/5] w-full bg-primary-deep" />
                <Skeleton className="mt-5 h-7 w-3/4 bg-primary-deep" />
                <Skeleton className="mt-3 h-3 w-1/2 bg-primary-deep" />
                <Skeleton className="mt-3 h-4 w-1/3 bg-primary-deep" />
              </div>
            ))
          : sets.map((set, i) => (
              <Reveal
                key={set.id}
                delay={(i % 4) * 80}
                className="w-[280px] shrink-0 snap-start sm:w-[340px]"
              >
                <Link
                  to="/products/$slug"
                  params={{ slug: set.slug }}
                  className="group block"
                  aria-label={set.name}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-primary-deep">
                    <img
                      src={set.images[0]}
                      alt={set.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <span className="absolute left-0 top-0 bg-primary-deep/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-champagne">
                      {set.karat}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-light tracking-wide text-ivory">
                    {set.name}
                  </h3>
                  <p className="nums mt-2 text-xs text-champagne/70">
                    {formatGrams(set.grossWeightG)} · {set.stones}
                  </p>
                  <p className="nums mt-3 text-sm font-semibold text-gold">
                    {formatPKR(set.salePricePkr ?? set.pricePkr)}
                  </p>
                </Link>
              </Reveal>
            ))}
      </div>
    </section>
  );
}
