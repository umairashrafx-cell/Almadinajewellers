import { everydayGold } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/** Accessible price points: 2 / 3 / 4 column responsive grid. */
export function EverydayGold() {
  return (
    <section className="bg-ivory py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="From Rs. 45,000"
          title="Everyday Gold"
          description="Light, wearable pieces for daily use and gifting — same hallmark, same buy-back."
        />

        <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {everydayGold.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 80}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
