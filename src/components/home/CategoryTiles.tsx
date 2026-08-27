import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { categoryTree, fetchCategories } from "@/lib/catalogue";
import { categories as fallbackCategories } from "@/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Tall image tiles, one per top-level category.
 *
 * Reads the live categories rather than the bundled list, so a category added
 * to the catalogue appears here too. Sub-categories are deliberately left out:
 * this is the front door, and the four kinds of necklace set are a decision to
 * make on the Necklace Set page rather than on the way to it.
 */
export function CategoryTiles() {
  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const tiles = categoryTree(
    data ?? fallbackCategories.map((c, i) => ({ ...c, sortOrder: i, parentSlug: null })),
  );

  return (
    <section id="categories" className="section-y scroll-mt-24 bg-ivory">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The House" title="Shop by Category" />

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {tiles.map((cat, i) => (
            <Reveal key={cat.slug} delay={(i % 3) * 80}>
              <Link
                to="/collections/$slug"
                params={{ slug: cat.slug }}
                className="group relative block aspect-[3/4] overflow-hidden bg-muted"
                aria-label={`Browse ${cat.name}`}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  width={800}
                  height={1100}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, oklch(0.16 0.035 160 / 0.8) 0%, transparent 55%)",
                  }}
                />
                <span className="absolute inset-x-0 bottom-0 p-5 text-center">
                  <span className="block font-display text-xl tracking-wide text-ivory sm:text-2xl">
                    {cat.name}
                  </span>
                  <span className="mx-auto mt-3 block h-px w-8 bg-gold transition-all duration-500 group-hover:w-16" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
