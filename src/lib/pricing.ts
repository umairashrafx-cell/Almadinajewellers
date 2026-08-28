import { rateFor, type RateSnapshot } from "@/lib/rates";

/**
 * Live pricing.
 *
 * A listed price is not a stored number — it is rebuilt from the day's gold
 * rate every time it is shown:
 *
 *     price = (net weight × today's rate for the karat) + making + stones
 *
 * Only the metal moves. **Making charges stay fixed in rupees**, because making
 * is labour: the workshop's time does not cost more because gold rose this
 * morning, and a customer reading the price panel can check that for
 * themselves. Stone value is fixed for the same reason — a carat of emerald is
 * not indexed to bullion.
 *
 * Nothing is rounded beyond the rupee. The panel's whole argument is that the
 * three parts add up to the total, and a tidier headline figure would break
 * that arithmetic for anyone who checks it on a calculator — which is exactly
 * the customer this feature is for.
 */

/** The stored, rate-independent parts of a price. */
export type PriceParts = {
  metal: string;
  karat: string;
  netWeightG: number;
  /** Grams of polish per tola of net metal. Priced at the gold rate. */
  polishGPerTola?: number | null | undefined;
  makingChargesPkr: number;
  stoneValuePkr: number;
};

/** Grams to the tola, the same constant the admin form calculates with. */
const TOLA_G = 11.6638;

/**
 * The weight the gold rate is charged on: metal plus polish.
 *
 * Polish is gold laid on the piece in finishing, so it is weighed and paid for
 * at the rate like the rest of the gold. Stones are not — they are the other
 * part of the gross weight and carry their own value.
 *
 *     priced = net + (net / tola) x polish        = gross - stones
 */
export function pricedWeightFor(netWeightG: number, polishGPerTola?: number | null): number {
  const polish = (netWeightG / TOLA_G) * (polishGPerTola ?? 0);
  return Math.round((netWeightG + polish) * 1000) / 1000;
}

export type LivePrice = {
  pricePkr: number;
  metalValuePkr: number;
  /** Net metal plus polish — the grams the rate was applied to. */
  pricedWeightG: number;
  /** The per-gram rate this price was built from — today's, by definition. */
  ratePerGram: number;
};

/**
 * Silver is priced as merchandised and does not track the metal rate.
 *
 * Silver making runs to several times its metal value — a 7 g cuff holds a few
 * thousand rupees of silver inside a twenty-thousand rupee piece — so
 * recalculating it against the 925 rate would move the price by a rounding
 * error while adding daily churn to figures the shop set deliberately.
 */
export function tracksMetalRate(metal: string): boolean {
  return metal !== "silver";
}

/**
 * Today's price for a piece, or undefined when it cannot be computed — no
 * published rate for that karat, no stored parts, or a metal that does not
 * track the rate. Callers fall back to the stored price, so a missing rate
 * shows yesterday's number rather than nothing at all.
 */
export function livePriceFor(
  parts: PriceParts,
  snapshot: RateSnapshot | undefined,
): LivePrice | undefined {
  if (!tracksMetalRate(parts.metal)) return undefined;
  if (!parts.netWeightG) return undefined;

  const rate = rateFor(snapshot, parts.karat);
  if (!rate?.perGram) return undefined;

  const pricedWeightG = pricedWeightFor(parts.netWeightG, parts.polishGPerTola);
  const metalValuePkr = Math.round(pricedWeightG * rate.perGram);

  return {
    metalValuePkr,
    pricedWeightG,
    pricePkr: metalValuePkr + parts.makingChargesPkr + parts.stoneValuePkr,
    ratePerGram: rate.perGram,
  };
}

/**
 * A discount is a number of rupees off, and stays that number.
 *
 * It used to be carried through as a percentage of the stored price, so a
 * "50,000 off" quietly became 55,000 off as gold rose. The shop sets discounts
 * in rupees — "ten thousand off this one" — and this keeps it at ten thousand
 * whatever the metal does.
 *
 * Returns undefined when there is no discount, and never returns a price below
 * zero: a discount larger than the live price would otherwise invert it.
 */
export function liveSalePrice(
  storedPricePkr: number,
  storedSalePkr: number | null | undefined,
  livePricePkr: number,
  discountPkr?: number | null,
): number | undefined {
  const discount =
    discountPkr ??
    // Rows saved before the discount column existed only have the sale price.
    (storedSalePkr != null && storedSalePkr < storedPricePkr
      ? storedPricePkr - storedSalePkr
      : undefined);

  if (discount === undefined || discount <= 0) return undefined;
  if (discount >= livePricePkr) return undefined;

  return Math.round(livePricePkr - discount);
}
