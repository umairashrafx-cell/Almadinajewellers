import {
  metalValue,
  rateFor,
  sellingRateFor,
  type MetalRate,
  type RateSnapshot,
  type WeightUnit,
} from "@/lib/rates";

/**
 * Zakat, worked from the shop's own board.
 *
 * Every figure for metal comes out of src/lib/rates.ts — sellingRateFor for
 * the rate of a purity and metalValue for what a weight is worth at it — so a
 * tola of 22K is the same number of rupees here as on the gold calculator one
 * tab away. Nothing in this file prices gold; it only adds, subtracts and
 * compares.
 *
 * Valued at the day's rate on the board, the price gold of that purity sells
 * at today. Some scholars would value jewellery at what a jeweller pays for
 * it instead, which is lower; the screen says so rather than choosing for the
 * customer silently.
 */

/** A fortieth. */
export const ZAKAT_RATE = 0.025;

/**
 * The two thresholds, in the unit they are spoken in and in grams.
 *
 * The arithmetic uses the tola, because the board is set per tola and per
 * gram is derived from it to the rupee: 612.36 g at a rounded per-gram rate
 * lands a couple of hundred rupees away from 52.5 tola at the published one,
 * and then 52.5 tola of silver would fall short of its own nisab. The gram
 * figures are what the screen prints beside them.
 */
export const GOLD_NISAB_TOLA = 7.5;
export const GOLD_NISAB_GRAMS = 87.48;
export const SILVER_NISAB_TOLA = 52.5;
export const SILVER_NISAB_GRAMS = 612.36;

/** The board's silver row. */
export const SILVER_KARAT = "999";

export type GoldHolding = { amount: number; unit: WeightUnit; purity: string };

export type ZakatInput = {
  gold: GoldHolding[];
  silver: { amount: number; unit: WeightUnit };
  /** Cash in hand. */
  cash: number;
  /** In the bank, in committees, in savings schemes. */
  savings: number;
  /** Business stock, at what it would sell for. */
  stock: number;
  /** Money owed to the customer that they expect to get back. */
  owed: number;
  /** Debts the customer has to pay now. */
  debts: number;
};

/**
 * Which threshold the wealth was measured against, and why.
 *
 * - "gold-only": nothing but gold, so the gold nisab of 7.5 tola applies.
 * - "mixed": anything beside gold — silver, cash, savings, stock or money owed
 *   — so the silver nisab applies, the lower threshold and the one used for
 *   mixed wealth.
 * - "no-silver-rate": mixed wealth, but the board carries no silver rate to
 *   value the silver nisab at, so gold stands in and the screen says so.
 */
export type NisabBasis = "gold-only" | "mixed" | "no-silver-rate";

export type ZakatResult = {
  goldGrams: number;
  goldValue: number;
  silverGrams: number;
  silverValue: number;
  /** Cash, savings, stock and money owed, together. */
  moneyValue: number;
  /** Everything above, before debts. */
  total: number;
  debts: number;
  /** Total less debts, never below nothing. */
  net: number;
  nisab: { basis: NisabBasis; metal: "gold" | "silver"; grams: number; value: number };
  meetsNisab: boolean;
  /** Rupees due: a fortieth of the net, or nothing below the nisab. */
  zakat: number;
  /** Gold rows whose purity has no rate, so they could not be counted. */
  unpriced: number;
};

/** Anything that is not a positive, finite number counts as nothing. */
function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * What a figure typed into the form means, as a number.
 *
 * Commas are taken out because people write rupees with them, and an empty or
 * unreadable box is nothing rather than an error: the form adds up what it can.
 */
export function readAmount(text: string): number {
  return positive(Number(text.replace(/,/g, "").trim() || "0"));
}

/**
 * The zakat on what the customer has entered.
 *
 * Undefined without a published board. The fallback snapshot exists so a rate
 * band never renders empty, and zakat worked from figures nobody set would be
 * a sum nobody can stand behind.
 */
export function zakatFor(
  snapshot: RateSnapshot | undefined,
  input: ZakatInput,
): ZakatResult | undefined {
  if (!snapshot?.date) return undefined;

  let goldGrams = 0;
  let goldTolas = 0;
  let goldValue = 0;
  let unpriced = 0;

  for (const holding of input.gold) {
    const amount = positive(holding.amount);
    if (!amount) continue;

    const rate = sellingRateFor(snapshot, holding.purity);
    if (!rate) {
      unpriced += 1;
      continue;
    }

    const worth = metalValue(amount, holding.unit, rate);
    goldGrams += worth.grams;
    goldTolas += worth.tolas;
    goldValue += worth.value;
  }

  const silverRate = rateFor(snapshot, SILVER_KARAT);
  const silverAmount = positive(input.silver.amount);
  const silverWorth =
    silverAmount && silverRate ? metalValue(silverAmount, input.silver.unit, silverRate) : null;
  const silverGrams = silverWorth?.grams ?? 0;
  const silverValue = silverWorth?.value ?? 0;

  const moneyValue = Math.round(
    positive(input.cash) + positive(input.savings) + positive(input.stock) + positive(input.owed),
  );

  const total = goldValue + silverValue + moneyValue;
  const debts = Math.round(positive(input.debts));
  const net = Math.max(0, total - debts);

  const onlyGold = silverAmount === 0 && moneyValue === 0;
  const nisab = nisabFor(snapshot, onlyGold, silverRate, goldTolas, goldValue);

  const meetsNisab = net > 0 && nisab.value > 0 && net >= nisab.value;

  return {
    goldGrams,
    goldValue,
    silverGrams,
    silverValue,
    moneyValue,
    total,
    debts,
    net,
    nisab,
    meetsNisab,
    // A fortieth, rounded up to the rupee: a few paisa over is the side to err
    // on. Dividing by 40 rather than multiplying by 0.025 keeps a round figure
    // round — 0.025 is not exact in binary, and 100,000 × 0.025 is not 2,500.
    zakat: meetsNisab ? Math.ceil(net / 40) : 0,
    unpriced,
  };
}

function nisabFor(
  snapshot: RateSnapshot,
  onlyGold: boolean,
  silverRate: MetalRate | undefined,
  goldTolas: number,
  goldValue: number,
): ZakatResult["nisab"] {
  if (!onlyGold && silverRate) {
    return {
      basis: "mixed",
      metal: "silver",
      grams: SILVER_NISAB_GRAMS,
      value: metalValue(SILVER_NISAB_TOLA, "tola", silverRate).value,
    };
  }

  /*
   * Gold's nisab is a weight, 7.5 tola, and in the fiqh followed here it is
   * the weight of the jewellery that counts, not its pure gold content. So
   * for somebody holding only gold it is valued at their own gold's rupees per
   * tola: with no debts that is exactly "do you have 7.5 tola", and with debts
   * it asks the same of what is left once they are paid.
   *
   * With no gold entered at all — mixed wealth on a board with no silver rate
   * — there is no gold of theirs to take a rate from, so it is 7.5 tola at
   * the board's jewellery rate, the gold most people hold.
   */
  const perTola =
    goldTolas > 0
      ? goldValue / goldTolas
      : ((sellingRateFor(snapshot, "22K") ?? sellingRateFor(snapshot, "24K"))?.perTola ?? 0);

  return {
    basis: onlyGold ? "gold-only" : "no-silver-rate",
    metal: "gold",
    grams: GOLD_NISAB_GRAMS,
    value: Math.round(GOLD_NISAB_TOLA * perTola),
  };
}
