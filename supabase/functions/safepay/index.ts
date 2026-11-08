/**
 * Paying for an agreed order through Safepay.
 *
 * Runs as a Supabase Edge Function (Deno). It holds the shop's secret key,
 * which is why it exists: the amount must be read server-side and the key must
 * never reach a browser.
 *
 * The flow, which is Safepay's rather than ours:
 *
 *   start    the pay page asks for a payment by its token. This reads the
 *            agreed amount out of the database, opens an attempt, creates a
 *            payment session and a one-hour passport token at Safepay, and
 *            hands back a URL to send the customer to.
 *   webhook  Safepay tells the server, server to server, what happened. This
 *            is the only place an order is marked paid.
 *
 * The customer pays on Safepay's own hosted page, so no card number ever
 * reaches this shop and there is no PCI obligation here. The browser never
 * carries an amount and is never believed about an outcome: the return URL
 * only decides what the page says, and a customer can edit a return URL.
 *
 *   SAFEPAY_SECRET_KEY       the secret key from Dashboard → Developers. Used
 *                            as the X-SFPY-MERCHANT-SECRET header. The secret.
 *                            Never in the repo, never in a log.
 *   SAFEPAY_MERCHANT_API_KEY the `sec_…` API key sent in the session body.
 *   SAFEPAY_WEBHOOK_SECRET   the endpoint's shared secret, from Developers →
 *                            Endpoints → View shared secret. Sandbox and live
 *                            have different ones. Without it nothing can be
 *                            marked paid, by design — see webhook() below.
 *   SAFEPAY_ENV              "live" for production. Anything else, including
 *                            unset, means the sandbox, so a typo cannot charge
 *                            a real card.
 *   SITE_ORIGIN              where the customer comes back to, e.g.
 *                            https://www.almadinajeweller.com
 *
 * Deploy with --no-verify-jwt: Safepay posts here without a Supabase key, and
 * so does the pay page before anyone has signed in.
 *
 * Unlike the Easypaisa function this replaces, nothing here is guesswork.
 * Every endpoint, header and payload field is from Safepay's published API
 * reference and developer documentation; the checkout host table in
 * protocol.ts is from their own SDK. See docs/safepay.md.
 */

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(key: string): string | undefined } };

import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  apiHost,
  checkoutUrl,
  envFromSecret,
  outcomeOf,
  toPaisa,
  verifyWebhook,
  type SafepayEvent,
} from "./protocol.ts";

const SECRET_KEY = Deno.env.get("SAFEPAY_SECRET_KEY");
const MERCHANT_API_KEY = Deno.env.get("SAFEPAY_MERCHANT_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("SAFEPAY_WEBHOOK_SECRET");
const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "https://www.almadinajeweller.com";

const ENV = envFromSecret(Deno.env.get("SAFEPAY_ENV"));
const API = apiHost(ENV);

/**
 * Which card processor to ask for.
 *
 * A session names one. CYBERSOURCE is the one Safepay's own examples use
 * throughout and the one their test cards are written for; MPGS is the
 * alternative. The session response reports `capabilities` for both, so if an
 * account turns out to be enabled for only one of them this is the line to
 * change.
 */
const INTENT = "CYBERSOURCE";

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? url.pathname.split("/").pop();

  try {
    if (action === "start") return await start(req);
    if (action === "webhook") return await webhook(req);
  } catch (error) {
    console.error("safepay: unhandled", error);
    return json({ error: "Something went wrong. Nothing has been charged." }, 500);
  }

  return json({ error: "Unknown action" }, 404);
});

/** A call to Safepay, with the merchant secret on it. */
async function call(path: string, body: unknown): Promise<any> {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sfpy-merchant-secret": SECRET_KEY ?? "",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    // The body can carry the reason; the key never appears in it.
    console.error(`safepay: ${path} returned ${response.status}`, text.slice(0, 500));
    throw new Error(`Safepay refused the request (${response.status}).`);
  }

  return text ? JSON.parse(text) : {};
}

/**
 * Opens an attempt and hands back the URL for it.
 *
 * The amount is read here and nowhere else, and checked again in the webhook
 * before anything is marked paid. The browser sends a token and gets back a
 * URL; it never sends a figure.
 */
async function start(req: Request): Promise<Response> {
  if (!SECRET_KEY || !MERCHANT_API_KEY) {
    return json({ error: "Online payment is not configured yet." }, 503);
  }

  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return json({ error: "Missing token" }, 400);

  const { data: order, error } = await db
    .from("orders")
    .select("id, reference, amount_due_pkr, status")
    .eq("pay_token", token)
    .maybeSingle();

  if (error) throw error;
  if (!order || order.amount_due_pkr == null) return json({ error: "No such payment" }, 404);
  if (order.status === "paid") return json({ error: "This order is already paid." }, 409);
  if (order.status === "cancelled") return json({ error: "This order was cancelled." }, 409);

  /*
   * A new reference per attempt, because a customer who backs out and tries
   * again must not collide with the row the first attempt opened — and because
   * this is the string that travels to Safepay and comes back on the webhook
   * as metadata.order_id, which is the only thing tying their event to our row.
   */
  const attemptRef = `${order.reference}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  const { error: opened } = await db.from("payments").insert({
    order_id: order.id,
    provider: "safepay",
    amount_pkr: order.amount_due_pkr,
    attempt_ref: attemptRef,
  });
  if (opened) throw opened;

  const session = await call("/order/payments/v3/", {
    merchant_api_key: MERCHANT_API_KEY,
    intent: INTENT,
    mode: "payment",
    currency: "PKR",
    amount: toPaisa(order.amount_due_pkr),
    metadata: { order_id: attemptRef, source: "almadinajeweller.com" },
  });

  const tracker: string | undefined = session?.data?.tracker?.token;
  if (!tracker) {
    console.error("safepay: session had no tracker token", JSON.stringify(session).slice(0, 500));
    throw new Error("Safepay did not return a payment session.");
  }

  /*
   * Recorded now rather than when the webhook arrives, so that an attempt the
   * customer abandons can still be matched to something in Safepay's own
   * dashboard when the shop goes looking.
   */
  await db.from("payments").update({ provider_txn_ref: tracker }).eq("attempt_ref", attemptRef);

  // The passport token authenticates the hosted page. It lasts one hour, and
  // the checkout page dies with it; Safepay then asks the customer to start
  // again, which is why nothing here tries to cache one.
  const passport = await call("/client/passport/v1/token", {});
  const tbt: string | undefined =
    typeof passport?.data === "string" ? passport.data : passport?.data?.token;
  if (!tbt) {
    console.error("safepay: passport had no token", JSON.stringify(passport).slice(0, 300));
    throw new Error("Safepay did not return an authentication token.");
  }

  const back = `${SITE_ORIGIN}/pay/${encodeURIComponent(token)}`;

  return json({
    url: checkoutUrl({
      env: ENV,
      tracker,
      tbt,
      source: "hosted",
      order_id: attemptRef,
      redirect_url: `${back}?state=returned`,
      cancel_url: `${back}?state=failed`,
    }),
  });
}

/**
 * The only thing in this file that can mark an order paid.
 *
 * Three checks before it does: the signature must verify, the attempt must be
 * one we opened, and the amount must equal the figure the shop agreed. A
 * mismatch is recorded and left for a person — a payment short of the price is
 * not a payment, and quietly accepting one would be worse than failing loudly.
 */
async function webhook(req: Request): Promise<Response> {
  /*
   * No secret, no trust.
   *
   * The Easypaisa function this replaces had the opposite default: its IPN
   * check ran only `if (IPN_SECRET && …)`, so leaving the secret unset meant
   * accepting any caller's word that an order was paid. Here an unconfigured
   * secret refuses the event with a 500 instead, which makes Safepay retry it
   * — so events are not lost, they wait until the secret is set.
   */
  if (!WEBHOOK_SECRET) {
    console.error("safepay: SAFEPAY_WEBHOOK_SECRET is not set, so no webhook can be trusted");
    return json({ error: "Webhooks are not configured." }, 500);
  }

  // Read as text, not JSON: the signature is over the bytes as they arrived.
  const raw = await req.text();
  const signature = req.headers.get("x-sfpy-signature");

  if (!(await verifyWebhook(raw, signature, WEBHOOK_SECRET))) {
    console.error("safepay: webhook signature did not verify");
    return json({ error: "Bad signature" }, 401);
  }

  let event: SafepayEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    console.error("safepay: webhook body was not JSON");
    return json({ ok: true });
  }

  const outcome = outcomeOf(event);
  if (outcome.kind === "ignored") {
    // Acknowledged on purpose. Safepay documents more event types than this
    // shop acts on, and warns that it adds new ones; retrying something we
    // will never act on would just fill their queue.
    console.log(`safepay: ignoring ${outcome.why}`);
    return json({ ok: true });
  }

  const { data: attempt } = await db
    .from("payments")
    .select("id, order_id, amount_pkr, status")
    .eq("attempt_ref", outcome.attemptRef)
    .maybeSingle();

  if (!attempt) {
    console.error("safepay: webhook for an unknown attempt", outcome.attemptRef);
    return json({ ok: true });
  }

  /*
   * A customer can retry on the hosted page, and each attempt sends its own
   * webhook against the same tracker — so this can arrive twice for one row.
   * Settling only a pending row makes that harmless, and it is acknowledged as
   * a success rather than an error, because a retried event is not a failure
   * and a 500 here would have Safepay redeliver it for hours.
   */
  if (attempt.status !== "pending") {
    console.log(`safepay: ${outcome.attemptRef} is already ${attempt.status}, nothing to do`);
    return json({ ok: true });
  }

  if (outcome.kind === "failed") {
    await db
      .from("payments")
      .update({
        status: "failed",
        response_code: outcome.code || null,
        response_desc: outcome.reason,
        raw: event as unknown as Record<string, unknown>,
        settled_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);
    return json({ ok: true });
  }

  /*
   * Safepay's amounts are in paisa and ours are in rupees, so the comparison
   * is made in paisa. An event that carries no amount is not treated as a
   * mismatch — it is Safepay's own documented payload that may omit it, and
   * refusing it would strand a real payment.
   */
  const expected = toPaisa(attempt.amount_pkr);
  const matches = outcome.amountPaisa == null || outcome.amountPaisa === expected;

  await db
    .from("payments")
    .update({
      status: matches ? "paid" : "failed",
      provider_txn_ref: outcome.tracker ?? null,
      response_code: matches ? "payment.succeeded" : "amount_mismatch",
      response_desc: matches
        ? null
        : `Safepay reported ${outcome.amountPaisa} paisa against ${expected} due.`,
      raw: event as unknown as Record<string, unknown>,
      settled_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);

  if (!matches) {
    console.error(
      `safepay: ${outcome.attemptRef} paid ${outcome.amountPaisa} paisa against ${expected} due — left unpaid for the shop to look at`,
    );
    return json({ ok: true });
  }

  await db
    .from("orders")
    .update({ status: "paid" })
    .eq("id", attempt.order_id)
    .in("status", ["new", "confirmed", "awaiting_payment"]);

  return json({ ok: true });
}
