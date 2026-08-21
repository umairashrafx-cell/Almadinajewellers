import { useQuery } from "@tanstack/react-query";

import { fetchHomeRails } from "@/lib/catalogue";
import { formatPKR } from "@/lib/site";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

/** Accessible price points: 2 / 3 / 4 column responsive grid. */
export function EverydayGold() {
  const { data, isPending } = useQuery({
    queryKey: ["home-rails"],
    queryFn: fetchHomeRails,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.everyday ?? [];
  // The eyebrow quotes the real entry price rather than a fixed claim.
  const from = products.length > 0 ? products[0]! : undefined;

  return (
    <section className="section-y bg-ivory">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={from ? `From ${formatPKR(from.salePricePkr ?? from.pricePkr)}` : "Everyday"}
          title="Everyday Gold"
          description="Light, wearable pieces for daily use and gifting — same hallmark, same buy-back."
        />

        <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {isPending
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="mt-4 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                </div>
              ))
            : products.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
