import { ArrowRight } from "lucide-react";

import workshopImage from "@/assets/story-workshop.webp";
import banglesImage from "@/assets/cat-bangles.webp";
import { GENERATIONS, STANDARDS } from "@/lib/page-copy";
import { SITE } from "@/lib/site";

import { AppButton } from "../components/AppButton";

/**
 * Who the shop is, in the app.
 *
 * The website's version of this page is a long scroll with a full-bleed hero
 * and two photographs; this is the same three generations and the same four
 * standards, at a length somebody will actually finish on a phone. Every
 * sentence is the website's own, from page-copy.
 *
 * The standards are the part that earns its place. "Three generations" is a
 * claim anybody can make; "weighed in front of you, hallmarked, priced in
 * three parts, bought back for life" is four things a customer can hold the
 * shop to, and they are the reason this screen exists rather than being a
 * paragraph on the home screen.
 */
export function StoryScreen({ showStore }: { showStore: () => void }) {
  return (
    <div className="pb-10">
      <Hero />

      <div className="px-4">
        <Generations />
        <Workshop />
        <Standards />
        <Visit onStore={showStore} />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary">
      <img
        src={workshopImage}
        alt="Goldsmith working at the bench in the Al-Madina workshop"
        /*
          Biased up from centre, as on the website and for the same reason: a
          centred crop of a landscape frame cuts the goldsmith's cap off and
          spends the room on the bench instead of on him.
        */
        className="absolute inset-0 h-full w-full object-cover object-[50%_22%] opacity-80"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-primary via-primary/75 to-primary/10"
      />

      <div className="relative px-4 pt-24 pb-6">
        <p className="text-[10px] font-semibold tracking-[0.3em] text-gold uppercase">
          Since {SITE.founded} &middot; Sarafa Market
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight text-ivory">
          Three generations.
          <br />
          One standard.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ivory/75">
          A family jewellery house in Mandi Bahauddin, founded by {SITE.founder}.
        </p>
      </div>
    </section>
  );
}

/** The three generations, on a rule, in order. */
function Generations() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-primary">How the shop was built</h2>

      <ol className="mt-5 space-y-7 border-l border-gold/40 pl-6">
        {GENERATIONS.map((generation) => (
          <li key={generation.era} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[27px] h-2.5 w-2.5 rounded-full bg-gold"
            />
            <p className="text-[10px] font-semibold tracking-[0.25em] text-gold-deep uppercase">
              {generation.era}
            </p>
            <h3 className="font-display mt-1.5 text-lg leading-snug text-primary">
              {generation.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-warmgrey">{generation.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Workshop() {
  return (
    <section className="mt-9">
      <img
        src={banglesImage}
        alt="Hand-finished gold karay on the workbench"
        loading="lazy"
        className="card-lift aspect-[5/3] w-full rounded-2xl object-cover"
      />

      <p className="mt-5 text-[10px] font-semibold tracking-[0.25em] text-gold-deep uppercase">
        The workshop
      </p>
      <h2 className="font-display mt-2 text-xl leading-snug text-primary">
        Made by hand, a few pieces at a time
      </h2>

      <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-warmgrey">
        <p>
          Work starts with the metal being weighed and alloyed to the karat the customer has asked
          for. From there it is drawn, formed, soldered and filed at the bench &mdash; the slow
          part, and the part that decides whether a piece still looks right in twenty years.
        </p>
        <p>
          Stones are set last, by hand, under a loupe. Every piece is polished, checked for sharp
          edges and weak clasps, then hallmarked before it goes into the tray.
        </p>
        <p>
          Bridal work is made to order and is ready within ten days. We send photographs through the
          making so nothing is a surprise at the end.
        </p>
      </div>
    </section>
  );
}

/** The four promises, each on its own card. */
function Standards() {
  return (
    <section className="mt-9">
      <h2 className="font-display text-lg text-primary">What we stand behind</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-warmgrey">
        Four things a customer can hold us to, on every piece, every time.
      </p>

      <ul className="mt-4 space-y-2.5">
        {STANDARDS.map((standard) => (
          <li
            key={standard.title}
            className="card-lift-sm rounded-xl border border-gold/15 bg-white px-4 py-3.5"
          >
            <h3 className="text-[13px] font-semibold text-ink">{standard.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-warmgrey">{standard.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Visit({ onStore }: { onStore: () => void }) {
  return (
    <section className="card-lift mt-9 rounded-2xl bg-primary px-5 py-6">
      <h2 className="font-display text-xl text-ivory">Come and see the work</h2>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ivory/75">
        The full range is on the tray at the counter, and the scale is on the table. We are open
        Saturday to Thursday, 11:00am to 8:00pm, and closed on Friday.
      </p>

      <AppButton variant="gold" onClick={onStore} className="mt-5">
        Find the shop
        <ArrowRight className="h-4 w-4" aria-hidden />
      </AppButton>
    </section>
  );
}
