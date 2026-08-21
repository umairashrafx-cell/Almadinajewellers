/**
 * Notifies the shop when an enquiry is submitted.
 *
 * Runs as a Supabase Edge Function (Deno), invoked by the AFTER INSERT trigger
 * on public.enquiries. Provider-agnostic: it sends to whichever channels are
 * configured through environment variables, and does nothing if none are.
 *
 *   NOTIFY_WEBHOOK_URL  POST the enquiry as JSON. Works with Zapier, Make, n8n,
 *                       a WhatsApp Cloud API relay, or anything that takes a
 *                       webhook. Simplest option.
 *   RESEND_API_KEY      Send an email through Resend. Requires NOTIFY_EMAIL_TO
 *   NOTIFY_EMAIL_TO     and NOTIFY_EMAIL_FROM (a domain verified with Resend).
 *   NOTIFY_EMAIL_FROM
 *   NOTIFY_SECRET       Optional shared secret. When set, requests must carry a
 *                       matching x-notify-secret header. Set this — the function
 *                       URL is otherwise callable by anyone who learns it.
 *
 * Deliberately always returns 200, even when a provider fails. The enquiry is
 * already safely in the database by the time this runs; answering with an error
 * would only make the caller retry and duplicate notifications. Failures are
 * logged instead, and visible in the function logs.
 */

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(key: string): string | undefined } };

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

const TYPE_LABELS: Record<string, string> = {
  bridal: "Bridal consultation request",
  contact: "Contact enquiry",
  callback: "Callback request",
  product: "Product enquiry",
};

/** Human-readable summary, used for the email body and the webhook text field.
 *  Exported so the formatting can be tested without a Deno runtime. */
export function summarise(record: EnquiryRecord): { subject: string; lines: string[] } {
  const label = TYPE_LABELS[record.type ?? ""] ?? "Website enquiry";

  const rows: Array<[string, string | null | undefined]> = [
    ["Name", record.name],
    ["Phone", record.phone],
    ["City", record.city],
    ["Email", record.email],
    ["About", record.subject],
    ["Wedding date", record.wedding_date],
    ["Budget", record.budget_range],
    ["Preferred time", record.preferred_time],
    ["Piece", record.product_sku],
  ];

  const lines = rows
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);

  if (record.message) lines.push("", record.message);

  return {
    subject: `${label}${record.name ? ` — ${record.name}` : ""}`,
    lines,
  };
}

async function sendWebhook(url: string, record: EnquiryRecord, text: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, enquiry: record }),
  });
  if (!response.ok) {
    throw new Error(`webhook responded ${response.status}: ${await response.text()}`);
  }
}

async function sendEmail(record: EnquiryRecord, subject: string, text: string) {
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

    let record: EnquiryRecord;
    try {
      const payload = await request.json();
      // Database webhooks wrap the row as { type, table, record }; a direct call
      // may pass the row itself.
      record = payload?.record ?? payload;
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { subject, lines } = summarise(record);
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
        await sendWebhook(webhookUrl, record, text);
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
