import { SectionHeading } from "@/components/ui/SectionHeading";
import type { UrduAnswers } from "@/lib/roman-urdu";

/**
 * The page's own answers, repeated in Roman Urdu.
 *
 * Plain text in the document, not an accordion: these are short, and the point
 * of the block is that the words are readable by someone — or something —
 * arriving from a Roman Urdu search. Nothing worth reading should be behind a
 * click here.
 *
 * `lang="ur-Latn"` is Urdu written in Latin letters, which is exactly what this
 * is. It tells a screen reader not to pronounce it as English and tells a
 * search engine which language it is looking at, without claiming the page is
 * in Urdu script.
 *
 * No FAQPage markup, following the rule the rest of the site keeps: the same
 * questions are marked up once, on /faq, rather than on every page that answers
 * them.
 */
export function RomanUrduAnswers({ answers }: { answers: UrduAnswers }) {
  return (
    <section className="section-y bg-champagne/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Roman Urdu" title={answers.title} align="left" />

        <dl lang="ur-Latn" className="mt-12 space-y-10">
          {answers.items.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-xl font-light tracking-wide text-primary">
                {item.q}
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-ink/80">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
