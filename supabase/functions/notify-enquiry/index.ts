/**
 * Notifies the shop when a customer submits something.
 *
 * Runs as a Supabase Edge Function (Deno), invoked by AFTER INSERT triggers on
 * public.enquiries, public.orders and public.custom_orders. Provider-agnostic:
 * it sends to whichever channels are configured through environment variables,
 * and does nothing if none are.
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

/** Which table the row came from. Absent when an older trigger posts the bare row. */
export type Source = "enquiries" | "orders" | "custom_orders";

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

async function sendWebhook(url: string, record: AnyRecord, source: string | undefined, text: string) {
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
