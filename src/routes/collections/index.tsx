import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCategories } from "@/lib/catalogue";
import { SITE } from "@/lib/site";

const title = "Collections — Al-Madina Jewellers";
const description =
  "Bridal sets, gold bangles, rings, earrings, lockets and 925 silver essentials. Hallmarked, weighed and priced against the day's gold rate.";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE.origin}/collections` },
    ],
    links: [{ rel: "canonical", href: `${SITE.origin}/collections` }],
  }),
  component: CollectionsIndex,
});

function CollectionsIndex() {
  const { data, isPending } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <div className="min-h-screen bg-ivory">
      <AnnouncementBar />
      <Header />

      <main>
        <section className="band-y bg-primary px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-4xl font-light tracking-wide text-ivory sm:text-5xl">
              Collections
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-champagne/80">{description}</p>
          </div>
        </section>

        <section className="band-y mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="The House" title="Browse the catalogue" />

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
            {isPending
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] w-full" />
                ))
              : (data ?? []).map((cat, i) => (
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
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
