/**
 * Notifies the shop when a customer submits something — and, once a day, the
 * customers when the shop publishes its rates.
 *
 * Runs as a Supabase Edge Function (Deno), invoked by AFTER INSERT triggers on
 * public.enquiries, public.orders and public.custom_orders, and by the
 * statement trigger on public.gold_rates. Provider-agnostic: it sends to
 * whichever channels are configured through environment variables, and does
 * nothing if none are.
 *
 * The rates are the one case that travels in the other direction: nothing is
 * sent to the shop, and the notification goes out to every phone in
 * public.push_devices through Firebase. It lives here rather than in a second
 * function because it is the same trigger plumbing, the same URL and the same
 * shared secret — one notifier to deploy, one secret to keep.
 *
 *   FCM_SERVICE_ACCOUNT_JSON  The service account file from the Firebase
 *                             project, as one secret. Without it the rate
 *                             notification is skipped and everything else
 *                             carries on.
 *
 *   NOTIFY_WEBHOOK_URL  POST the submission as JSON. Works with Zapier, Make,
 *                       n8n, a WhatsApp Cloud API relay, or anything that takes
 *                       a webhook. This is the route to WhatsApp.
 *   RESEND_API_KEY      Send an email through Resend. Requires NOTIFY_EMAIL_TO
 *   NOTIFY_EMAIL_TO     and NOTIFY_EMAIL_FROM (a domain verified with Resend).
 *   NOTIFY_EMAIL_FROM
 *   NOTIFY_SECRET       Optional shared secret. When set, requests must carry a
 *                       matching x-notify-secret header. Set this — the function
 *                       URL is otherwise callable by anyone who learns it.
 *
 * Both channels can run at once, and that is the recommended setup: email is
 * the one that still arrives when a relay's free tier runs out.
 *
 * The directory is still called notify-enquiry although it now handles orders
 * too. The name is the deployed function's URL, and that URL is stored in
 * app_config on the live database — renaming it would mean redeploying and
 * updating that row in the right order, for a cosmetic gain. Rename it only if
 * you are certain it was never configured.
 *
 * Deliberately always returns 200, even when a provider fails. The submission
 * is already safely in the database by the time this runs; answering with an
 * error would only make the caller retry and duplicate notifications. Failures
 * are logged instead, and visible in the function logs.
 */

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(key: string): string | undefined } };

import { readServiceAccount, send as sendToPhone } from "./fcm.ts";

/** Which table the row came from. Absent when an older trigger posts the bare row. */
export type Source = "enquiries" | "orders" | "custom_orders" | "gold_rates";

type EnquiryRecord = {
  id?: string;
  type?: string;
  name?: string;
  phone?: string;
  city?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  wedding_date?: string | null;
  budget_range?: string | null;
  preferred_time?: string | null;
  product_sku?: string | null;
  created_at?: string;
};

type OrderItem = {
  sku?: string;
  name?: string;
  karat?: string;
  grossWeightG?: number;
  unitPricePkr?: number;
  quantity?: number;
};

type OrderRecord = {
  id?: string;
  reference?: string;
  name?: string;
  phone?: string;
  city?: string | null;
  notes?: string | null;
  items?: OrderItem[];
  item_count?: number;
  total_pkr?: number;
  created_at?: string;
};

type CustomOrderRecord = {
  id?: string;
  reference?: string;
  name?: string;
  phone?: string;
  city?: string | null;
  category_slug?: string | null;
  size?: string | null;
  description?: string | null;
  image_path?: string | null;
  voice_path?: string | null;
  created_at?: string;
};

type AnyRecord = EnquiryRecord & OrderRecord & CustomOrderRecord;

const TYPE_LABELS: Record<string, string> = {
  bridal: "Bridal consultation request",
  contact: "Contact enquiry",
  callback: "Callback request",
  product: "Product enquiry",
};

/** Rupees as the shop writes them, so the figure reads the same as the bill. */
function pkr(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `Rs. ${Math.round(value).toLocaleString("en-PK")}`;
}

/** Drops the empty rows, so a short enquiry produces a short message. */
function rowsToLines(rows: Array<[string, string | null | undefined]>): string[] {
  return rows.filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`);
}

function summariseEnquiry(record: EnquiryRecord) {
  const label = TYPE_LABELS[record.type ?? ""] ?? "Website enquiry";

  const lines = rowsToLines([
    ["Name", record.name],
    ["Phone", record.phone],
    ["City", record.city],
    ["Email", record.email],
    ["About", record.subject],
    ["Wedding date", record.wedding_date],
    ["Budget", record.budget_range],
    ["Preferred time", record.preferred_time],
    ["Piece", record.product_sku],
  ]);

  if (record.message) lines.push("", record.message);

  return {
    subject: `${label}${record.name ? ` — ${record.name}` : ""}`,
    lines,
  };
}

function summariseOrder(record: OrderRecord) {
  const lines = rowsToLines([
    ["Reference", record.reference],
    ["Name", record.name],
    ["Phone", record.phone],
    ["City", record.city],
    ["Total", pkr(record.total_pkr)],
  ]);

  /*
   * The pieces themselves, because the first thing the shop does with an order
   * is find them in the tray. A notification that says "3 items" sends someone
   * to the dashboard to learn what they are.
   */
  const items = Array.isArray(record.items) ? record.items : [];
  if (items.length > 0) {
    lines.push("", `Pieces (${record.item_count ?? items.length}):`);
    for (const item of items) {
      // The quantity belongs to the name, not beside it as its own column.
      const named = item.name ?? item.sku ?? "Piece";
      const parts = [
        item.quantity && item.quantity > 1 ? `${item.quantity} x ${named}` : named,
        item.karat,
        typeof item.grossWeightG === "number" ? `${item.grossWeightG} g` : null,
        pkr(item.unitPricePkr),
      ].filter(Boolean);
      lines.push(`  - ${parts.join(" · ")}`);
    }
  }

  if (record.notes) lines.push("", `Notes: ${record.notes}`);

  return {
    subject: `New order${record.reference ? ` ${record.reference}` : ""}${
      record.name ? ` — ${record.name}` : ""
    }`,
    lines,
  };
}

function summariseCustomOrder(record: CustomOrderRecord) {
  const lines = rowsToLines([
    ["Reference", record.reference],
    ["Name", record.name],
    ["Phone", record.phone],
    ["City", record.city],
    ["Category", record.category_slug],
    ["Size", record.size],
  ]);

  /*
   * The bucket is private, so a link here would not open. Saying an attachment
   * exists is the useful part — it tells whoever reads this on their phone that
   * the dashboard is worth opening rather than replying blind.
   */
  const attachments = [
    record.image_path ? "photograph" : null,
    record.voice_path ? "voice note" : null,
  ].filter(Boolean);
  if (attachments.length > 0) {
    lines.push("", `Attached: ${attachments.join(" and ")} — open the admin panel to see it.`);
  }

  if (record.description) lines.push("", record.description);

  return {
    subject: `Custom order${record.reference ? ` ${record.reference}` : ""}${
      record.name ? ` — ${record.name}` : ""
    }`,
    lines,
  };
}

/**
 * Human-readable summary, used for the email body and the webhook text field.
 * Exported so the formatting can be tested without a Deno runtime.
 *
 * `source` is the table the row came from. It is optional because an older
 * trigger posts the bare row with no wrapper; in that case this falls back to
 * the enquiry shape, which is what that trigger was installed for.
 */
export function summarise(
  record: AnyRecord,
  source?: string,
): { subject: string; lines: string[] } {
  if (source === "orders") return summariseOrder(record);
  if (source === "custom_orders") return summariseCustomOrder(record);
  return summariseEnquiry(record);
}

// ---------------------------------------------------------------------------
// The day's rates, out to the phones that asked
// ---------------------------------------------------------------------------

/** What the gold_rates trigger posts: the day, and the figures as published. */
type RateRecord = {
  rate_date?: string;
  rates?: Array<{ karat?: string; per_tola_pkr?: number; per_gram_pkr?: number }>;
};

/**
 * The channel the app creates, and the page a tap opens. Both are agreed with
 * src/lib/push.ts on the website side; changing one means changing the other.
 */
const RATE_CHANNEL = "rates";
const RATE_PATH = "/gold-rate-in-mandi-bahauddin-today";

/**
 * What the notification says.
 *
 * 24K and 22K, per tola, because those are the two figures people ask for at
 * the counter — 24K is what the market quotes and 22K is what jewellery is
 * sold at. Anything else the shop published is a tap away on the rate page.
 * If neither is there, whatever gold was published stands in.
 */
export function summariseRates(record: RateRecord): { title: string; body: string } {
  // The day's rows carry silver as well; this notification is about the gold.
  // The same three karats as GOLD_KARATS in src/lib/rates.ts.
  const gold = (Array.isArray(record.rates) ? record.rates : []).filter(
    (rate) => rate.per_tola_pkr && ["24K", "23.65K", "22K"].includes(rate.karat ?? ""),
  );

  const quoted = ["24K", "22K"]
    .map((karat) => gold.find((rate) => rate.karat === karat))
    .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate));

  const shown = quoted.length > 0 ? quoted : gold;

  const figures = shown.map((rate) => `${rate.karat} ${pkr(rate.per_tola_pkr)}`).join("  ·  ");

  return {
    title: "Today's gold rate is in",
    body: figures ? `${figures} per tola` : "Tap to see the day's rates.",
  };
}

/** The tokens we hold, read with the service role — the table is shut to anon. */
async function listDeviceTokens(url: string, key: string): Promise<string[]> {
  const response = await fetch(`${url}/rest/v1/push_devices?select=token`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    throw new Error(`could not read push_devices: ${response.status} ${await response.text()}`);
  }

  const rows = (await response.json()) as Array<{ token?: string }>;
  return rows.map((row) => row.token).filter((token): token is string => Boolean(token));
}

/** Forgets the phones Google says are gone, so tomorrow's send is smaller. */
async function forgetDeviceTokens(url: string, key: string, tokens: string[]) {
  if (tokens.length === 0) return;

  const list = tokens.map((token) => `"${token}"`).join(",");
  const response = await fetch(
    `${url}/rest/v1/push_devices?token=in.(${encodeURIComponent(list)})`,
    { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  if (!response.ok) {
    console.error(`notify-enquiry: could not forget dead tokens: ${response.status}`);
  }
}

/**
 * Sends the day's rate to every registered phone.
 *
 * Deliberately quiet about failure, like the rest of this function: the rates
 * are already on the board, and the trigger that called this is not waiting for
 * an answer it could do anything with.
 */
async function pushRates(record: RateRecord): Promise<Record<string, string>> {
  const account = readServiceAccount();
  if (!account) {
    console.warn("notify-enquiry: FCM_SERVICE_ACCOUNT_JSON is not set; no rate alert sent.");
    return { push: "not configured" };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("notify-enquiry: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
    return { push: "no database credentials" };
  }

  const tokens = await listDeviceTokens(url, key);
  if (tokens.length === 0) return { push: "nobody is subscribed" };

  const { title, body } = summariseRates(record);
  const notification = { title, body, path: RATE_PATH, channelId: RATE_CHANNEL };

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  // In handfuls: a few hundred phones should not be a few hundred round trips
  // one after another, nor one burst that FCM reads as a flood.
  const BATCH = 8;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const outcomes = await Promise.all(
      batch.map(async (token) => {
        try {
          return await sendToPhone(account, token, notification);
        } catch (error) {
          console.error("notify-enquiry: rate alert failed:", error);
          return "failed" as const;
        }
      }),
    );

    outcomes.forEach((outcome, index) => {
      if (outcome === "sent") sent += 1;
      else if (outcome === "dead") dead.push(batch[index]!);
      else failed += 1;
    });
  }

  await forgetDeviceTokens(url, key, dead);

  return {
    push: `sent ${sent} of ${tokens.length}`,
    ...(failed > 0 ? { failed: String(failed) } : {}),
    ...(dead.length > 0 ? { forgotten: String(dead.length) } : {}),
  };
}

async function sendWebhook(
  url: string,
  record: AnyRecord,
  source: string | undefined,
  text: string,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `enquiry` is kept alongside `record` so a relay built against the older
    // payload keeps working after this deploys.
    body: JSON.stringify({ text, source: source ?? "enquiries", record, enquiry: record }),
  });
  if (!response.ok) {
    throw new Error(`webhook responded ${response.status}: ${await response.text()}`);
  }
}

async function sendEmail(record: AnyRecord, subject: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY")!;
  const to = Deno.env.get("NOTIFY_EMAIL_TO");
  const from = Deno.env.get("NOTIFY_EMAIL_FROM");

  if (!to || !from) {
    throw new Error("RESEND_API_KEY is set but NOTIFY_EMAIL_TO or NOTIFY_EMAIL_FROM is missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map((address) => address.trim()),
      subject,
      text,
      // Only an enquiry carries an email address; an order is answered by phone.
      reply_to: record.email || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`resend responded ${response.status}: ${await response.text()}`);
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const expectedSecret = Deno.env.get("NOTIFY_SECRET");
    if (expectedSecret && request.headers.get("x-notify-secret") !== expectedSecret) {
      // The only case worth refusing outright: an unauthenticated caller.
      return new Response("Forbidden", { status: 403 });
    }

    let record: AnyRecord;
    let source: string | undefined;
    try {
      const payload = await request.json();
      /*
       * Three shapes reach here: this repo's triggers post
       * { source, record }; a Supabase database webhook posts
       * { type, table, record }; and a direct call may pass the row itself.
       */
      record = payload?.record ?? payload;
      source = payload?.source ?? payload?.table;
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    /*
     * The rates go the other way: out to the customers, and never to the
     * shop's own webhook or inbox. The shop just published them; it does not
     * need an email saying so.
     */
    if (source === "gold_rates") {
      let results: Record<string, string>;
      try {
        results = await pushRates(record as RateRecord);
      } catch (error) {
        console.error("notify-enquiry: rate alert failed:", error);
        results = { push: `failed: ${(error as Error).message}` };
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { subject, lines } = summarise(record, source);
    const text = [subject, "", ...lines].join("\n");

    const webhookUrl = Deno.env.get("NOTIFY_WEBHOOK_URL");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const results: Record<string, string> = {};

    if (!webhookUrl && !resendKey) {
      console.warn(
        "notify-enquiry: no channel configured. Set NOTIFY_WEBHOOK_URL or RESEND_API_KEY.",
      );
      results.channels = "none configured";
    }

    if (webhookUrl) {
      try {
        await sendWebhook(webhookUrl, record, source, text);
        results.webhook = "sent";
      } catch (error) {
        console.error("notify-enquiry webhook failed:", error);
        results.webhook = `failed: ${(error as Error).message}`;
      }
    }

    if (resendKey) {
      try {
        await sendEmail(record, subject, text);
        results.email = "sent";
      } catch (error) {
        console.error("notify-enquiry email failed:", error);
        results.email = `failed: ${(error as Error).message}`;
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
