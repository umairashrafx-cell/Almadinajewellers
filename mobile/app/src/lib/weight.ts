import { TOLA_IN_GRAMS } from "@/lib/rates";

/**
 * A piece's weight, the way the app says it to a customer.
 *
 * The scale reads to the milligram, and the catalogue keeps that figure —
 * 31.126 g — because the price is worked from it. A customer does not ask for
 * the milligram: the shop asked for the weight to the nearest hundredth of a
 * gram, still written with three decimals so it reads like a bill (31.130 g),
 * and said again in tola, which older buyers still think in.
 *
 * The tola is worked from the rounded grams, not the raw ones, so the two
 * figures on the screen are the same weight and a customer checking one
 * against the other with a calculator gets the same answer. Three decimals, as
 * the website's gold calculator writes a tola: a thousandth of a tola is about
 * 12 mg, finer than the rounding of the grams beside it.
 */

/** Grams to the nearest 0.01 g. */
export function roundGrams(grams: number): number {
  // Shifting by the exponent rather than multiplying by 100 keeps a figure
  // like 1.005 from landing on 100.49999… and rounding the wrong way.
  return Number(`${Math.round(Number(`${grams}e2`))}e-2`);
}

/** "31.130 g": rounded to the hundredth, written to three decimals. */
export function formatWeightGrams(grams: number): string {
  return `${roundGrams(grams).toFixed(3)} g`;
}

/** "2.669 tola", from the same rounded grams the gram figure shows. */
export function formatWeightTola(grams: number): string {
  return `${(roundGrams(grams) / TOLA_IN_GRAMS).toFixed(3)} tola`;
}
