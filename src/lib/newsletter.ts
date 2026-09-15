import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Newsletter sign-up.
 *
 * `newsletter_subscribers` is newer than the generated Database type, which the
 * platform regenerates and must not be hand-edited, so the function is reached
 * through an untyped handle.
 */
const untyped = supabase as unknown as SupabaseClient;

export const newsletterEmail = z
  .string()
  .trim()
  .min(1, "Please enter your email address.")
  .max(254, "That email address is too long.")
  .email("Please check the email address.");

/**
 * Adds an address to the list.
 *
 * Signing up twice succeeds quietly — the database ignores a repeat — so this
 * never reveals whether an address was already subscribed.
 */
export async function subscribeNewsletter(email: string, source = "home"): Promise<void> {
  const { error } = await untyped.rpc("subscribe_newsletter", {
    p_email: email.trim(),
    p_source: source,
  });

  if (error) {
    if (error.code === "22023") throw new Error("Please check the email address.");
    throw new Error("We could not add you just now. Please try again in a moment.");
  }
}
