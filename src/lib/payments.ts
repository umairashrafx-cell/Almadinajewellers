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

/**
 * How a provider takes the customer: a URL to visit, or a form to post.
 *
 * Two shapes because the two providers differ in kind, not in detail.
 * Easypaisa's hosted page is reached by POSTing signed fields and has no URL
 * to visit; Safepay's is a URL carrying a tracker and a one-hour token, with
 * nothing to post. Both are built server-side, where the keys are, and neither
 * is anything the browser could usefully alter.
 */
export type PaymentHandoff = { url: string } | { action: string; fields: Record<string, string> };

export type PaymentProvider = "easypaisa" | "safepay";

/** What to call the provider when something goes wrong and a person reads it. */
const PROVIDER_NAMES: Record<PaymentProvider, string> = {
  easypaisa: "Easypaisa",
  safepay: "Safepay",
};

export async function startPayment(
  token: string,
  provider: PaymentProvider = "easypaisa",
): Promise<PaymentHandoff> {
  const { data, error } = await untyped.functions.invoke<PaymentHandoff | { error: string }>(
    `${provider}/start`,
    { body: { token } },
  );

  if (error) {
    throw new Error(
      `We could not reach ${PROVIDER_NAMES[provider]}. Please try again in a moment.`,
    );
  }
  if (!data || "error" in data) {
    throw new Error((data as { error?: string })?.error ?? "That payment link is not usable.");
  }

  return data;
}

/**
 * Hands the customer to the provider's own page.
 *
 * A URL is navigated to. Fields have to be submitted, because Easypaisa's
 * hosted page is reached by POST and there is nothing to navigate to — that
 * form is built and submitted rather than rendered, because it exists for one
 * instant and nothing on the page should be able to hold a reference to it.
 */
export function handOffToProvider(handoff: PaymentHandoff): void {
  if ("url" in handoff) {
    window.location.assign(handoff.url);
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = handoff.action;

  for (const [name, value] of Object.entries(handoff.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }

  document.body.append(form);
  form.submit();
}
