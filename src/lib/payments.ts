import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Paying for an order the shop has already priced.
 *
 * There is no checkout here and this is not one. An order is placed, the shop
 * weighs the piece and agrees a figure on WhatsApp, and only then does a pay
 * link exist. Everything in this file works from a token the shop issued, and
 * the amount is never one this code chose — it is read back from the database
 * for display, and read again server-side by the Edge Function for the
 * payment itself.
 *
 * `payments` and the two functions below are newer than the generated
 * Database type, which the platform regenerates and must not be hand-edited,
 * so they are reached through an untyped handle with the shapes declared here.
 */
const untyped = supabase as unknown as SupabaseClient;

/** A line as the pay page shows it: enough to recognise, no more. */
export type PaymentLine = { name: string; quantity: number };

export type PaymentIntent = {
  reference: string;
  amountPkr: number;
  /** The order's status, so a paid link stops offering to take money again. */
  status: string;
  itemCount: number;
  items: PaymentLine[];
};

/**
 * What a pay link points at, or null when it points at nothing.
 *
 * Null covers a mistyped link, a link whose order was never priced, and a
 * link that never existed. The page says the same thing for all three on
 * purpose: a page that distinguishes them tells someone walking tokens which
 * of their guesses was close.
 */
export async function fetchPaymentIntent(token: string): Promise<PaymentIntent | null> {
  const { data, error } = await untyped.rpc("payment_intent", { p_token: token }).maybeSingle<{
    reference: string;
    amount_pkr: number;
    status: string;
    item_count: number;
    items: PaymentLine[] | null;
  }>();

  if (error) throw error;
  if (!data) return null;

  return {
    reference: data.reference,
    amountPkr: data.amount_pkr,
    status: data.status,
    itemCount: data.item_count,
    items: data.items ?? [],
  };
}

/** The form Easypaisa expects, built and signed where the hash key lives. */
export type PaymentHandoff = { action: string; fields: Record<string, string> };

export async function startPayment(token: string): Promise<PaymentHandoff> {
  const { data, error } = await untyped.functions.invoke<PaymentHandoff | { error: string }>(
    "easypaisa/start",
    { body: { token } },
  );

  if (error) throw new Error("We could not reach Easypaisa. Please try again in a moment.");
  if (!data || "error" in data) {
    throw new Error((data as { error?: string })?.error ?? "That payment link is not usable.");
  }

  return data;
}

/**
 * Hands the customer to Easypaisa.
 *
 * Their hosted page is reached by form POST rather than by a URL, so there is
 * nothing to navigate to — the fields have to be submitted. Built and
 * submitted rather than rendered, because it exists for one instant and
 * nothing on the page should be able to hold a reference to it.
 */
export function handOffToProvider({ action, fields }: PaymentHandoff): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }

  document.body.append(form);
  form.submit();
}
