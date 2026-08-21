import { testimonials } from "@/data/products";
import { Reveal } from "@/components/ui/Reveal";

/** Three quotes in Cormorant italic on champagne. */
export function Testimonials() {
  return (
    <section className="section-y bg-champagne">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-primary/70">
          In Their Words
        </p>

        <div className="mt-14 grid gap-12 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 80} as="article" className="text-center">
              <p className="font-display text-xl font-light italic leading-relaxed text-primary">
                “{t.quote}”
              </p>
              <div className="mx-auto mt-6 h-px w-10 bg-gold" />
              <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-primary/70">
                {t.name} · {t.city}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
