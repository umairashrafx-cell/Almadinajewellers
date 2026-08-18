import heroImage from "@/assets/hero-bridal.jpg";
import { ActionLink } from "@/components/ui/ActionButton";
import { SITE } from "@/lib/site";

/** Full-screen hero with a slow Ken Burns zoom and green gradient. */
export function Hero() {
  return (
    <section className="relative -mt-[74px] flex min-h-screen items-end overflow-hidden">
      <img
        src={heroImage}
        alt="Hand-crafted 22K gold bridal necklace set with rubies and pearls"
        width={1920}
        height={1280}
        className="ken-burns absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--primary-deep) 0%, oklch(0.16 0.035 160 / 0.75) 35%, oklch(0.16 0.035 160 / 0.25) 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-40 sm:px-6 lg:px-8 lg:pb-32">
        <p className="text-[11px] uppercase tracking-[0.35em] text-gold">
          Sarafa Market · Mandi Bahauddin
        </p>
        <h1 className="mt-6 max-w-3xl font-display text-5xl font-light tracking-wide text-ivory sm:text-6xl lg:text-7xl">
          {SITE.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-champagne/85 sm:text-base">
          Hallmarked 21K and 22K gold, certified diamonds and 925 silver — made by three generations
          of one family.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ActionLink href="#categories">Explore Collections</ActionLink>
          <ActionLink variant="ghostLight" href="/bridal#consultation">
            Book a Bridal Consultation
          </ActionLink>
        </div>
      </div>
    </section>
  );
}
