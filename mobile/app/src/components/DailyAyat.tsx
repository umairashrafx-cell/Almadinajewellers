import { useMemo } from "react";

import { TEXT_SOURCE, URDU_TRANSLATOR, ayatToday, reference } from "../lib/ayat";

/**
 * Today's ayat, on the home screen, above the rate.
 *
 * Above rather than below, because of what it is. The verse is not a feature
 * competing with the gold rate for a customer's attention — it is the thing
 * the shop opens the day with, and burying it under a price would say the
 * opposite of what showing it at all is meant to say. The hero photograph
 * still comes first: that is the shopfront, and this reads as what is written
 * inside the door.
 *
 * Quiet by construction. The same white card, the same gold hairline and the
 * same card-lift shadow as every other section on the screen, so it belongs
 * to the set rather than announcing itself. No icon, no gradient, no gold
 * plate: one eyebrow, the Arabic, the Urdu, and a citation a reader can check.
 * It is the only block on the screen with no button in it, which is the point.
 *
 * Three things here are worth not undoing later:
 *
 * `dir="rtl"` and `lang` are set explicitly on both scripts rather than left
 * to the document. The app is a left-to-right document and the WebView will
 * happily lay Arabic out inside an LTR block — which puts a sentence-final
 * full stop at the wrong end and breaks mixed runs like the bracketed asides
 * Jalandhri writes into his translation. `lang` is separate from `dir` and
 * matters on its own: it is what tells the engine to reach for an Urdu face
 * for Urdu and an Arabic face for Arabic, which are not the same face.
 *
 * The line heights are generous past the point of looking generous. Nastaliq
 * hangs a long way below its baseline — the shop's own Play Store artwork sets
 * it at line-height 2 for exactly this reason — and Uthmani Arabic carries
 * marks above and below the letters that a tight leading simply crops. Both
 * numbers here are the smallest that left nothing clipped on a 360-point
 * screen.
 *
 * And it renders nothing at all rather than something wrong. No verse for
 * today — which can only happen if the date is unreadable — means no card,
 * not a card with a dash in it.
 */
export function DailyAyat() {
  /*
   * Read once per mount. The verse is a function of the date, so re-reading it
   * on every render would return the same object anyway; this is to say so
   * rather than to save the work. A phone left open across midnight in
   * Pakistan keeps yesterday's verse until the app is next opened, which is
   * the right trade: a verse changing under somebody mid-sentence would be
   * worse than one that is a few hours old.
   */
  const ayat = useMemo(() => ayatToday(), []);

  if (!ayat) return null;

  return (
    <section className="card-lift mt-5 rounded-xl border border-gold/15 bg-white px-5 pt-4 pb-3.5">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-warmgrey uppercase">
        Aaj ki ayat
      </p>

      <p
        dir="rtl"
        lang="ar"
        className="font-quran mt-3.5 text-center text-[20px] leading-[2] text-primary"
      >
        {ayat.arabic}
      </p>

      <p
        dir="rtl"
        lang="ur"
        className="font-urdu mt-2.5 text-right text-[14px] leading-[1.95] text-ink"
      >
        {ayat.urdu}
      </p>

      {/*
        The citation, in the Latin script the rest of the screen is in, because
        it is a reference rather than a reading: a surah name, two numbers, and
        the name of the translation, so that anybody can hold this against the
        copy in his own house. Tanzil is named because its terms ask for it and
        because the shop should be seen to have taken the text from somewhere.
      */}
      <p className="mt-3.5 border-t border-gold/15 pt-2.5 text-[10px] leading-relaxed text-warmgrey">
        {reference(ayat)}
        <span aria-hidden> &middot; </span>
        Tarjuma: {URDU_TRANSLATOR}
        <span aria-hidden> &middot; </span>
        {TEXT_SOURCE}
      </p>
    </section>
  );
}
