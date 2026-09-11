import heroImage from "@/assets/hero-bangles.jpg";
import heroMotionPoster from "@/assets/video/hero-motion-poster.jpg";
import { HeroMotion } from "@/components/home/HeroMotion";
import { ActionLink } from "@/components/ui/ActionButton";
import { SITE } from "@/lib/site";

/**
 * Full-screen hero: the house film where it fits, the still photograph where it
 * does not, under a green gradient that keeps the headline legible over both.
 */
export function Hero() {
  return (
    <section className="relative -mt-[var(--header-h)] flex min-h-screen items-end overflow-hidden">
      {/*
        The still. On a portrait screen the film covers it, so the picture
        served there is the film's own first frame — the same file as its
        poster, fetched once — rather than a 2560px photograph nobody sees.
        Decorative: the headline says what the page is.
      */}
      <picture>
        <source media="(orientation: portrait)" srcSet={heroMotionPoster} />
        <img
          src={heroImage}
          alt=""
          width={2560}
          height={1707}
          className="ken-burns absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <HeroMotion />
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to top, var(--primary-deep) 0%, oklch(0.16 0.035 160 / 0.75) 35%, oklch(0.16 0.035 160 / 0.25) 100%)",
        }}
      />

      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-24 pt-40 sm:px-6 lg:px-8 lg:pb-32">
        <p className="text-[11px] uppercase tracking-[0.35em] text-gold">
          Sarafa Market · Mandi Bahauddin
        </p>
        <h1 className="mt-6 max-w-3xl font-display text-5xl font-light tracking-wide text-ivory sm:text-6xl lg:text-7xl">
          {SITE.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-champagne/85 sm:text-base">
          The rate is posted daily. The weight is shown openly. The making charge is told upfront.
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
