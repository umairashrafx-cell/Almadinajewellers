/**
 * The parts of Safepay's protocol that can be reasoned about on their own.
 *
 * Kept apart from `index.ts` because everything here is a pure function over
 * strings and numbers, with no secrets, no database and no Deno in it — which
 * means it can be tested, and the three things most likely to be got wrong are
 * exactly the three things in this file: which host to send the customer to,
 * how an amount is written, and whether a webhook really came from Safepay.
 *
 * Nothing here is specific to this shop. It is Safepay's protocol, written
 * down.
 */

export type SafepayEnv = "sandbox" | "production" | "development";

/** Where the REST API lives. */
const API_HOSTS: Record<SafepayEnv, string> = {
  development: "https://dev.api.getsafepay.com",
  sandbox: "https://sandbox.api.getsafepay.com",
  production: "https://api.getsafepay.com",
};

/**
 * Where the hosted checkout page lives — and note that production is **not**
 * under `api.`, while sandbox is.
 *
 * This asymmetry is not a typo and is not derivable: sandbox checkout is
 * `sandbox.api.getsafepay.com/embedded/` but production checkout is
 * `getsafepay.com/embedded/`, with no `api.` at all. Safepay's integration
 * guide shows only the sandbox URL and leaves the reader to assume the live one
 * matches, which it does not. These three values are read from their own
 * `@sfpy/node-core` SDK (0.3.5, `cjs/Checkout.js`), which is the only place
 * they are written down.
 *
 * Getting this wrong fails in the worst possible way: it would work in testing
 * and send live customers to a host that is not the checkout.
 */
const CHECKOUT_HOSTS: Record<SafepayEnv, string> = {
  development: "https://dev.api.getsafepay.com/embedded/",
  sandbox: "https://sandbox.api.getsafepay.com/embedded/",
  production: "https://getsafepay.com/embedded/",
};

export function apiHost(env: SafepayEnv): string {
  return API_HOSTS[env];
}

/** Anything other than "live" means the sandbox, so a typo cannot charge. */
export function envFromSecret(raw: string | undefined): SafepayEnv {
  return raw === "live" || raw === "production" ? "production" : "sandbox";
}

export type CheckoutParams = {
  env: SafepayEnv;
  /** The `track_…` token from the payment session. */
  tracker: string;
  /** The passport token. One hour, then the page is dead. */
  tbt: string;
  source?: "hosted" | "mobile" | "popup";
  user_id?: string;
  order_id?: string;
  redirect_url?: string;
  cancel_url?: string;
};

/**
 * The URL to send the customer to.
 *
 * Built by hand rather than with Safepay's SDK, because the SDK is a Node
 * package and this runs on Deno, and because the whole of what it does for
 * this call is the twelve lines below. Deliberately identical to it, down to
 * the ordering: `environment` first, then the parameters as given, anything
 * undefined dropped, both halves of every pair percent-encoded.
 */
export function checkoutUrl({ env, ...params }: CheckoutParams): string {
  const query = Object.entries({ environment: env, ...params })
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `${CHECKOUT_HOSTS[env]}?${query}`;
}

/**
 * Rupees to paisa.
 *
 * Safepay takes amounts "in the lowest denomination", so PKR 6,000 is sent as
 * 600000. `orders.amount_due_pkr` is an integer column of whole rupees, so the
 * conversion is a multiplication — but it is worth a named function with a
 * guard, because the failure mode is silent and costs exactly a hundredfold.
 */
export function toPaisa(rupees: number): number {
  if (!Number.isInteger(rupees) || rupees <= 0) {
    throw new Error(`An amount of ${rupees} is not a whole number of rupees above zero.`);
  }
  return rupees * 100;
}

/**
 * Whether a webhook was really signed by Safepay.
 *
 * HMAC-SHA512 over the raw request body, hex encoded, in `X-SFPY-SIGNATURE`,
 * keyed with the endpoint's shared secret. Sandbox and live have different
 * secrets, which is worth knowing before wondering why every event is refused
 * after going live.
 *
 * The body must be the bytes as they arrived. Parsing the JSON and
 * re-serialising it would reorder keys and change spacing, and the signature is
 * over the original — Safepay's own Node library reads `req.body.raw` for this
 * reason.
 *
 * The comparison is constant-time. An attacker who can submit candidate
 * signatures and time the refusals can recover a correct one byte by byte
 * against `===`, and the thing on the other side of this check is an order
 * being marked paid.
 */
export async function verifyWebhook(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(expected, signature.trim().toLowerCase());
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let differences = 0;
  for (let i = 0; i < a.length; i += 1) differences |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return differences === 0;
}

/** A webhook, as much of it as we care about. */
export type SafepayEvent = {
  type?: string;
  data?: {
    tracker?: string;
    amount?: number;
    currency?: string;
    net?: number;
    fee?: number;
    state?: string;
    code?: number | string;
    message?: string;
    category?: string;
    metadata?: Record<string, string>;
  };
};

export type Outcome =
  | { kind: "paid"; attemptRef: string; amountPaisa: number | undefined; tracker?: string }
  | { kind: "failed"; attemptRef: string; reason: string; code: string; tracker?: string }
  | { kind: "ignored"; why: string };

/**
 * What an event means for an order, or that it means nothing.
 *
 * Only two of Safepay's events move an order: a capture and a failure.
 * Refunds, reversals, voids and the subscription events are acknowledged and
 * logged rather than acted on — the shop settles those at the counter, and a
 * refund that silently un-paid an order would be worse than one a person
 * notices.
 *
 * `metadata.order_id` is our own attempt reference travelling out and back
 * again; it is the only thing tying Safepay's event to a row of ours.
 */
export function outcomeOf(event: SafepayEvent): Outcome {
  const type = event.type ?? "";
  const data = event.data ?? {};
  const attemptRef = data.metadata?.["order_id"];

  if (type !== "payment.succeeded" && type !== "payment.failed") {
    return { kind: "ignored", why: type || "an event with no type" };
  }
  if (!attemptRef) {
    return { kind: "ignored", why: `${type} with no metadata.order_id` };
  }

  if (type === "payment.succeeded") {
    const paid: Outcome = { kind: "paid", attemptRef, amountPaisa: data.amount };
    return data.tracker === undefined ? paid : { ...paid, tracker: data.tracker };
  }

  const failed: Outcome = {
    kind: "failed",
    attemptRef,
    reason: data.message ?? data.category ?? "Safepay did not say why.",
    code: String(data.code ?? data.state ?? ""),
  };
  return data.tracker === undefined ? failed : { ...failed, tracker: data.tracker };
}
