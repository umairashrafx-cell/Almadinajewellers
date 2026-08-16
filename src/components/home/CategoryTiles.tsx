import { Link } from "@tanstack/react-router";
import { categories } from "@/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/** Six tall image tiles with the category name overlaid. */
export function CategoryTiles() {
  return (
    <section id="categories" className="scroll-mt-24 bg-ivory py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The House" title="Shop by Category" />

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {categories.map((cat, i) => (
            <Reveal key={cat.slug} delay={(i % 3) * 80}>
              <Link
                to="/"
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
