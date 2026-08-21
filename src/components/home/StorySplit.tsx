import { Link } from "@tanstack/react-router";
import storyImage from "@/assets/story-workshop.jpg";
import { Reveal } from "@/components/ui/Reveal";
import { SITE } from "@/lib/site";

/** Editorial split: image left, house story right. */
export function StorySplit() {
  return (
    <section className="section-y bg-ivory">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal>
          <img
            src={storyImage}
            alt="A goldsmith setting stones into a gold pendant at the workbench"
            loading="lazy"
            width={1200}
            height={1400}
            className="aspect-[4/5] w-full object-cover"
          />
        </Reveal>

        <Reveal delay={80}>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Our Story</p>
          <h2 className="mt-4 font-display text-4xl font-light tracking-wide text-primary lg:text-5xl">
            Three generations. One standard.
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-warmgrey">
            {SITE.founder} opened a single counter in Sarafa Market. The tools have changed. The
            rule has not — weigh it in front of the customer, hallmark every piece, and stand behind
            it for life.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-warmgrey">
            Today our karigars still finish each set by hand, from the first wax model to the final
            polish. Families who bought their bridal set from us return for their daughters.
          </p>
          <Link
            to="/our-story"
            className="mt-8 inline-block border-b border-gold pb-1 text-[12px] font-semibold uppercase tracking-widest text-primary transition-colors hover:text-gold"
          >
            Our Story
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
