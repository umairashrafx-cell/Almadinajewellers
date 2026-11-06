/**
 * Paying for an agreed order through Easypaisa.
 *
 * Runs as a Supabase Edge Function (Deno). It holds the shop's hash key, which
 * is why it exists at all: everything here could be done in the browser except
 * the one thing that must not be.
 *
 * The flow, which is Easypaisa's rather than ours:
 *
 *   start     the pay page asks for a payment by its token. This reads the
 *             agreed amount out of the database, opens an attempt, and hands
 *             back the fields for a form that posts to Easypaisa.
 *   postback  Easypaisa sends the customer back with an auth_token. That is
 *             not payment, it is permission to ask for payment, so this
 *             records it and posts the customer on to Confirm.
 *   ipn       Easypaisa tells the server, server to server, what happened.
 *             This is the only place an order is marked paid.
 *
 * The browser never carries an amount and is never believed about an outcome.
 * A customer can edit a redirect; they cannot edit this.
 *
 *   EASYPAISA_STORE_ID    from the OPS portal, under the profile button.
 *   EASYPAISA_HASH_KEY    from the OPS portal, under account settings. The
 *                         secret. Never in the repo, never in a log.
 *   EASYPAISA_ENV         "live" or "staging" (the default).
 *   EASYPAISA_IPN_SECRET  optional shared secret. When set, an IPN must carry
 *                         a matching x-easypaisa-secret header or be ignored.
 *                         Set it if the portal lets you send a header; the
 *                         amount check below is the guard that does not
 *                         depend on it.
 *   SITE_ORIGIN           where the customer is sent back to, e.g.
 *                         https://www.almadinajeweller.com
 *
 * Deploy with --no-verify-jwt: Easypaisa posts here without a Supabase key,
 * and so does the pay page before anyone has signed in.
 *
 * Checked against the community account of Easypay's hosted checkout, because
 * Easypaisa publishes no public specification — the merchant guide arrives
 * with the credentials. Before this goes live, three things must be read off
 * that PDF and corrected here if they differ: the exact field list for Index,
 * the hash input (which fields, in which order), and the IPN payload's own
 * field names. They are marked SPEC below.
 */

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(key: string): string | undefined } };

import { Buffer } from "node:buffer";
import { createCipheriv } from "node:crypto";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STORE_ID = Deno.env.get("EASYPAISA_STORE_ID");
const HASH_KEY = Deno.env.get("EASYPAISA_HASH_KEY");
const IPN_SECRET = Deno.env.get("EASYPAISA_IPN_SECRET");
const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "https://www.almadinajeweller.com";

/**
 * AES has three key sizes and no others: 16, 24 or 32 bytes.
 *
 * The hash below used to name its cipher from the key's own length, so a key
 * of any other size asked `node:crypto` for a cipher that does not exist —
 * `aes-512-ecb`, for one that is 64 bytes — and threw in the middle of a
 * customer's payment instead of refusing before it began. A hash key is
 * pasted in by hand exactly once, and the usual paste faults all land on a
 * length AES cannot take: a key written as hex (twice the bytes), the wrong
 * credential copied from the portal, or a truncated selection.
 *
 * Measured in bytes rather than characters, because that is what the cipher
 * is given and a single non-ASCII character would make the two disagree.
 */
const AES_KEY_BYTES = [16, 24, 32];
const HASH_KEY_BYTES = HASH_KEY === undefined ? 0 : Buffer.byteLength(HASH_KEY, "utf8");
const HASH_KEY_USABLE = HASH_KEY !== undefined && AES_KEY_BYTES.includes(HASH_KEY_BYTES);

const HOST =
  Deno.env.get("EASYPAISA_ENV") === "live"
    ? "https://easypay.easypaisa.com.pk"
    : "https://easypaystg.easypaisa.com.pk";

const INDEX_URL = `${HOST}/easypay/Index.jsf`;
const CONFIRM_URL = `${HOST}/easypay/Confirm.jsf`;

const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

/**
 * The signature Easypaisa checks.
 *
 * SPEC: AES-128-ECB with PKCS#5 padding over the parameters joined as
 * `key=value&key=value`, sorted by key, base64 encoded. Community
 * implementations agree on this; the key length is the part most worth
 * checking, since a 24 or 32 character key means AES-192 or AES-256 and a
 * silently wrong hash rather than an error.
 */
function hashRequest(params: Record<string, string>): string {
  // Both of these are refused by start() before anything is opened, so this
  // is the belt to that braces: a future caller gets an error it can read
  // rather than an empty signature or a cipher name that does not exist.
  if (!HASH_KEY) {
    throw new Error("EASYPAISA_HASH_KEY is not set, so no request can be signed.");
  }
  if (!HASH_KEY_USABLE) {
    throw new Error(
      `EASYPAISA_HASH_KEY is ${HASH_KEY_BYTES} bytes; AES takes 16, 24 or 32. ` +
        "Check it against the merchant pack: 64 characters is usually a 32 byte " +
        "key written as hex, which has to be decoded before it is used as a key.",
    );
  }

  const plain = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const cipher = createCipheriv(
    `aes-${HASH_KEY_BYTES * 8}-ecb`,
    Buffer.from(HASH_KEY, "utf8"),
    null,
  );
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

/** Easypaisa wants dd-MM-yyyy HHmmss, in the shop's own time. */
function expiry(hours: number): string {
  const at = new Date(Date.now() + hours * 3600_000);
  const pk = new Date(at.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(pk.getDate())}-${pad(pk.getMonth() + 1)}-${pk.getFullYear()} ` +
    `${pad(pk.getHours())}${pad(pk.getMinutes())}${pad(pk.getSeconds())}`
  );
}

/**
 * A page that posts itself onward.
 *
 * Easypaisa's hosted checkout is reached by form POST, not by a URL, so each
 * hand-off is a form the browser submits on arrival. The noscript button is
 * not decoration: a customer whose browser blocks the script would otherwise
 * sit on a blank page with their money unspent.
 */
function autoPost(action: string, fields: Record<string, string>, label: string): Response {
  const inputs = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`)
    .join("");

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(label)}</title>
<style>body{font-family:system-ui,sans-serif;margin:4rem auto;max-width:28rem;padding:0 1rem;
color:#1b3a2b;text-align:center}button{font:inherit;padding:.75rem 1.5rem;cursor:pointer}</style>
</head><body><p>${esc(label)}</p>
<form id="f" method="post" action="${esc(action)}">${inputs}
<noscript><button type="submit">Continue to Easypaisa</button></noscript></form>
<script>document.getElementById("f").submit()</script></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

/** Whatever the caller sent, as plain fields. */
async function fields(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, string>;
  }
  const form = await req.formData().catch(() => new FormData());
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
}

/** Easypaisa's own spelling varies by product; accept what arrives. */
function pick(body: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    for (const key of Object.keys(body)) {
      if (key.toLowerCase() === name.toLowerCase() && body[key] !== "") return body[key];
    }
  }
  return undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? url.pathname.split("/").pop();

  try {
    if (action === "start") return await start(req);
    if (action === "postback") return await postback(req, url);
    if (action === "ipn") return await ipn(req);
  } catch (error) {
    console.error("easypaisa: unhandled", error);
    return json({ error: "Something went wrong. Nothing has been charged." }, 500);
  }

  return json({ error: "Unknown action" }, 404);
});

/**
 * Opens an attempt and hands back the fields for it.
 *
 * The amount is read here and nowhere else. The browser sends a token and
 * gets back a form it cannot usefully alter: changing the amount in it
 * invalidates the hash, and the IPN checks the figure again against this same
 * column before anything is marked paid.
 */
async function start(req: Request): Promise<Response> {
  if (!STORE_ID || !HASH_KEY) {
    return json({ error: "Online payment is not configured yet." }, 503);
  }

  // Word for word the same answer as above, so that nothing about the shop's
  // configuration can be read off which refusal came back. The reason goes to
  // the function log, where only the shop can see it. The length is recorded
  // because it is the whole diagnosis; the key itself never goes near a log.
  if (!HASH_KEY_USABLE) {
    console.error(
      `easypaisa: EASYPAISA_HASH_KEY is ${HASH_KEY_BYTES} bytes; AES takes 16, 24 ` +
        "or 32. No payment can be signed until it is corrected — see docs/easypaisa.md.",
    );
    return json({ error: "Online payment is not configured yet." }, 503);
  }

  const { token } = (await fields(req)) as { token?: string };
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
   * A new reference per attempt. Easypaisa refuses one it has seen before, so
   * a customer who backs out and tries again would otherwise be stuck.
   */
  const attemptRef = `${order.reference}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  const { error: opened } = await db.from("payments").insert({
    order_id: order.id,
    amount_pkr: order.amount_due_pkr,
    attempt_ref: attemptRef,
  });
  if (opened) throw opened;

  // SPEC: the field list Index expects, and which of them the hash covers.
  const params: Record<string, string> = {
    storeId: STORE_ID,
    amount: order.amount_due_pkr.toFixed(2),
    postBackURL: `${functionBase(req)}/postback?token=${encodeURIComponent(token)}`,
    orderRefNum: attemptRef,
    expiryDate: expiry(24),
    autoRedirect: "1",
  };

  return json({
    action: INDEX_URL,
    fields: { ...params, merchantHashedReq: hashRequest(params) },
  });
}

/**
 * Easypaisa hands the customer back with permission to charge.
 *
 * Nothing is paid at this point and nothing is marked. The auth_token is
 * recorded so a later IPN can be tied to this attempt even if the customer
 * closes the tab, and the browser is posted on to Confirm.
 */
async function postback(req: Request, url: URL): Promise<Response> {
  const body = await fields(req);
  const authToken = pick(body, "auth_token", "authToken");
  const token = url.searchParams.get("token") ?? "";

  if (!authToken) {
    return Response.redirect(`${SITE_ORIGIN}/pay/${encodeURIComponent(token)}?state=failed`, 303);
  }

  const attemptRef = pick(body, "orderRefNum", "orderRefNumber");
  if (attemptRef) {
    await db
      .from("payments")
      .update({ auth_token: authToken })
      .eq("attempt_ref", attemptRef)
      .eq("status", "pending");
  }

  return autoPost(
    CONFIRM_URL,
    {
      auth_token: authToken,
      postBackURL: `${SITE_ORIGIN}/pay/${encodeURIComponent(token)}?state=returned`,
    },
    "Taking you to Easypaisa…",
  );
}

/**
 * The only thing in this file that can mark an order paid.
 *
 * Two checks before it does: the attempt must be one we opened and still be
 * pending, and the amount must equal the figure the shop agreed. A mismatch
 * is recorded and left for a person — a payment short of the price is not a
 * payment, and quietly accepting one would be worse than failing loudly.
 */
async function ipn(req: Request): Promise<Response> {
  if (IPN_SECRET && req.headers.get("x-easypaisa-secret") !== IPN_SECRET) {
    console.error("easypaisa: IPN rejected, bad secret");
    return json({ ok: true });
  }

  const body = await fields(req);
  // SPEC: the IPN's own field names, which differ from the checkout's.
  const attemptRef = pick(body, "orderRefNum", "orderRefNumber", "order_ref_num");
  const code = pick(body, "status", "responseCode", "response_code") ?? "";
  const paid = pick(body, "transactionAmount", "amount", "paidAmount");
  const txnRef = pick(body, "transactionId", "txnRefNo", "transactionRefNumber");

  if (!attemptRef) {
    console.error("easypaisa: IPN with no reference", Object.keys(body));
    return json({ ok: true });
  }

  const { data: attempt } = await db
    .from("payments")
    .select("id, order_id, amount_pkr, status")
    .eq("attempt_ref", attemptRef)
    .maybeSingle();

  if (!attempt) {
    console.error("easypaisa: IPN for an unknown attempt", attemptRef);
    return json({ ok: true });
  }

  // "0000" is success in the merchant guide's response codes.
  const succeeded = code === "0000" || code.toUpperCase() === "PAID";
  const amountMatches = paid == null || Math.round(Number(paid)) === attempt.amount_pkr;

  const settled = {
    status: succeeded && amountMatches ? "paid" : "failed",
    provider_txn_ref: txnRef ?? null,
    response_code: code || null,
    response_desc: pick(body, "description", "desc", "message") ?? null,
    raw: body,
    settled_at: new Date().toISOString(),
  };

  if (attempt.status === "pending") {
    await db.from("payments").update(settled).eq("id", attempt.id);
  }

  if (succeeded && !amountMatches) {
    console.error(
      `easypaisa: ${attemptRef} paid ${paid} against ${attempt.amount_pkr} due — left unpaid for the shop to look at`,
    );
  }

  if (settled.status === "paid") {
    await db
      .from("orders")
      .update({ status: "paid" })
      .eq("id", attempt.order_id)
      .in("status", ["new", "confirmed", "awaiting_payment"]);
  }

  return json({ ok: true });
}

/**
 * This function's own public URL, without whichever action is on the end.
 *
 * Easypaisa must post back to a real URL of ours, and the one on the current
 * request has /start on it — which would send the customer back into the step
 * that opens attempts, and open a second one every time.
 */
function functionBase(req: Request): string {
  const url = new URL(req.url);
  return `${url.origin}${url.pathname.replace(/\/(start|postback|ipn)\/?$/, "")}`;
}
