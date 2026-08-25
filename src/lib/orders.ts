import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { RateSnapshot } from "@/lib/rates";
import { SITE, formatGrams, formatPKR, productUrl } from "@/lib/site";

/**
 * Order requests.
 *
 * The shop does not take payment online — this records what the customer wants
 * and the price they were quoted, then hands the conversation to WhatsApp.
 *
 * `orders` is newer than the generated Database type, which the platform
 * regenerates and must not be hand-edited, so it is reached through an untyped
 * handle with the row shape declared here.
 */
const untyped = supabase as unknown as SupabaseClient;

/** Pakistani mobile and landline formats, matching the enquiry forms. */
const PHONE = /^(\+?92|0)?[\s-]?\d{2,4}[\s-]?\d{6,8}$/;

export const orderSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(25, "That number is too long.")
    .regex(PHONE, "Please check the phone number."),
  city: z.string().trim().max(60, "That city name is too long.").optional(),
  notes: z.string().trim().max(1000, "Please keep notes under 1000 characters.").optional(),
});

export type OrderDetails = z.infer<typeof orderSchema>;

/** A cart line resolved against the catalogue, priced as shown. */
export type OrderLine = {
  product: Product;
  quantity: number;
  /** The price on screen — the sale price when there is one. */
  unitPricePkr: number;
};

export function lineTotal(line: OrderLine): number {
  return line.unitPricePkr * line.quantity;
}

export function orderTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export type PlacedOrder = { reference: string; totalPkr: number };

/**
 * Saves the order and returns its reference.
 *
 * Prices are written down rather than referenced, because they are rebuilt from
 * the day's gold rate on every read — a foreign key would give tomorrow's
 * figure for yesterday's agreement.
 */
export async function placeOrder(
  details: OrderDetails,
  lines: OrderLine[],
  snapshot: RateSnapshot | undefined,
): Promise<PlacedOrder> {
  if (lines.length === 0) throw new Error("Your cart is empty.");

  const items = lines.map((line) => ({
    sku: line.product.sku,
    name: line.product.name,
    slug: line.product.slug,
    karat: line.product.karat,
    grossWeightG: line.product.grossWeightG,
    unitPricePkr: line.unitPricePkr,
    quantity: line.quantity,
  }));

  const totalPkr = orderTotal(lines);

  // A SECURITY DEFINER function rather than a plain insert. The customer has to
  // be told their reference, but `INSERT ... RETURNING` needs SELECT privilege
  // on the table — and orders hold names, phone numbers and shopping lists,
  // which the anon key must never be able to read back. The function returns
  // that one column and nothing else.
  const { data, error } = await untyped.rpc("place_order", {
    p_name: details.name.trim(),
    p_phone: details.phone.trim(),
    p_city: details.city?.trim() || null,
    p_notes: details.notes?.trim() || null,
    p_items: items,
    p_item_count: lines.reduce((n, l) => n + l.quantity, 0),
    p_total_pkr: totalPkr,
    p_rate_basis: snapshot
      ? { date: snapshot.date, publishedAt: snapshot.publishedAt ?? null, rates: snapshot.rates }
      : null,
  });

  if (error) {
    throw new Error(
      /violates|constraint/i.test(error.message)
        ? "Please check the details and try again."
        : "We could not place that order just now. Please try again, or send it to us on WhatsApp.",
    );
  }

  const reference = typeof data === "string" ? data : null;
  if (!reference) {
    throw new Error(
      "Your order was not confirmed. Please try again, or send it to us on WhatsApp.",
    );
  }

  return { reference, totalPkr };
}

/**
 * The order as a WhatsApp message.
 *
 * Sent to the shop, so it is addressed rather than shared. The monospace block
 * keeps the quantity, piece and price columns aligned on a phone; without it a
 * five-line order wraps into something nobody can price from.
 */
export function orderWhatsAppMessage(
  reference: string,
  details: OrderDetails,
  lines: OrderLine[],
): string {
  const body = lines.map(
    (l) =>
      `${l.quantity} x ${l.product.name} (${l.product.sku})\n` +
      `    ${l.product.karat} · ${formatGrams(l.product.grossWeightG)} · ${formatPKR(lineTotal(l))}`,
  );

  return [
    `Assalam-o-Alaikum, I have placed an order on your website.`,
    "",
    `*Order ${reference}*`,
    `${details.name.trim()}${details.city?.trim() ? ` · ${details.city.trim()}` : ""}`,
    `${details.phone.trim()}`,
    "",
    ...body,
    "",
    `*Total: ${formatPKR(orderTotal(lines))}*`,
    ...(details.notes?.trim() ? ["", `Notes: ${details.notes.trim()}`] : []),
    "",
    `_Prices as shown on ${SITE.origin} today. Please confirm against the rate on the day._`,
    "",
    ...lines.slice(0, 4).map((l) => productUrl(l.product.slug)),
  ].join("\n");
}
