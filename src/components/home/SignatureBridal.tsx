import { bridalSets } from "@/data/products";
import { formatGrams, formatPKR, productEnquiryLink } from "@/lib/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

/** Horizontal-scroll carousel of flagship bridal sets. */
export function SignatureBridal() {
  return (
    <section className="bg-primary py-24 lg:py-28">
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
        {bridalSets.map((set, i) => (
          <Reveal
            key={set.id}
            delay={(i % 4) * 80}
            className="w-[280px] shrink-0 snap-start sm:w-[340px]"
          >
            <a
              href={productEnquiryLink(set.name, set.sku)}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
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
              <p className="mt-2 text-xs text-champagne/70 nums">
                {formatGrams(set.grossWeightG)} · {set.stones}
              </p>
              <p className="mt-3 text-sm font-semibold text-gold nums">
                {formatPKR(set.salePricePkr ?? set.pricePkr)}
              </p>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
