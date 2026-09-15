/**
 * The counter calculator: the shop's own "Gold price calculator" spreadsheet,
 * moved into the admin panel.
 *
 * The arithmetic is copied from that sheet formula for formula so the two
 * always agree. That includes the tola: the sheet divides by 11.664, not the
 * 11.6638 the storefront uses, and staff check this screen against the sheet.
 * The difference is about Rs. 3 on a lakh, but a figure that disagrees with the
 * sheet by any amount is a figure nobody trusts.
 */

/** The tola the sheet uses. See the note above before changing it. */
export const SHEET_TOLA_GRAMS = 11.664;

/** A tola is 96 rati; kaat is quoted in rati per tola. */
export const RATI_PER_TOLA = 96;

/**
 * Selling a piece: the customer pays for its weight plus the polish (making
 * loss), which the shop charges as so many grams for every tola.
 *
 * Sheet columns: Weight, POLISH/T → Polish, T.WEIGHT, AMOUNT.
 */
export function sellingLine(weightGrams: number, polishPerTola: number, ratePerTola: number) {
  const polishGrams = (weightGrams / SHEET_TOLA_GRAMS) * polishPerTola;
  const totalGrams = weightGrams + polishGrams;
  const amount = (totalGrams / SHEET_TOLA_GRAMS) * ratePerTola;
  return { polishGrams, totalGrams, amount };
}

/**
 * Buying old gold: the kaat, in rati per tola, is taken off to reach the
 * weight of pure 24k it is worth, and that is paid for at the rate.
 *
 * Sheet columns: Weight, kaat Rati/tola → 24k, AMOUNT.
 */
export function buyingLine(weightGrams: number, kaatRati: number, ratePerTola: number) {
  const pureGrams = (weightGrams / RATI_PER_TOLA) * (RATI_PER_TOLA - kaatRati);
  const amount = (pureGrams / SHEET_TOLA_GRAMS) * ratePerTola;
  return { pureGrams, amount };
}

/**
 * Parses what was typed into a number field. Blank or nonsense is null, so a
 * row someone has not finished is left out rather than counted as zero.
 */
export function parseAmount(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Each row's rate, with a blank rate taking the one above it.
 *
 * The sheet does this with =E3, =E4 and so on down the column: most bills are
 * at one rate, so it is typed once and the rows below follow it.
 */
export function carriedRates(raw: readonly string[]): (number | null)[] {
  let previous: number | null = null;
  return raw.map((value) => {
    const parsed = parseAmount(value);
    if (parsed !== null) previous = parsed;
    return previous;
  });
}
