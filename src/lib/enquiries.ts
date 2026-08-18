import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enquiry submission. The enquiries table is insert-only for the public, so
 * nothing here reads a submission back — a successful insert is the whole
 * result. Validation is duplicated as CHECK constraints in the database, since
 * the anon key means anyone can post directly at the API.
 */

/** Pakistani mobile and landline formats, with or without +92 / 0 prefix. */
const PHONE = /^(\+?92|0)?[\s-]?\d{2,4}[\s-]?\d{6,8}$/;

export const BUDGET_RANGES = [
  "Under Rs. 500,000",
  "Rs. 500,000 – 1,000,000",
  "Rs. 1,000,000 – 2,000,000",
  "Rs. 2,000,000 – 4,000,000",
  "Above Rs. 4,000,000",
  "Not sure yet",
] as const;

export const PREFERRED_TIMES = [
  "Weekday morning",
  "Weekday afternoon",
  "Weekday evening",
  "Weekend",
  "Any time",
] as const;

export const bridalEnquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(25, "That number is too long.")
    .regex(PHONE, "Please check the phone number."),
  city: z.string().trim().max(60, "That city name is too long.").optional(),
  weddingDate: z.string().optional(),
  budgetRange: z.string().max(40).optional(),
  preferredTime: z.string().max(40).optional(),
  message: z.string().trim().max(1000, "Please keep notes under 1000 characters.").optional(),
});

export type BridalEnquiry = z.infer<typeof bridalEnquirySchema>;

export type EnquiryType = "product" | "callback" | "bridal" | "contact";

/** Inserts a bridal consultation request. Throws with a readable message. */
export async function submitBridalEnquiry(values: BridalEnquiry): Promise<void> {
  const { error } = await supabase.from("enquiries").insert({
    type: "bridal" satisfies EnquiryType,
    name: values.name.trim(),
    phone: values.phone.trim(),
    // Empty optional fields are stored as NULL rather than "".
    city: values.city?.trim() || null,
    wedding_date: values.weddingDate || null,
    budget_range: values.budgetRange || null,
    preferred_time: values.preferredTime || null,
    message: values.message?.trim() || null,
    handled: false,
  });

  if (error) {
    throw new Error(
      error.message.includes("violates")
        ? "Please check the details and try again."
        : "We could not save that just now. Please try again, or send us a message on WhatsApp.",
    );
  }
}

export const CONTACT_SUBJECTS = [
  "A piece I saw on the website",
  "Bridal jewellery",
  "Custom order",
  "Gold rate and pricing",
  "Buy-back or exchange",
  "Delivery",
  "Something else",
] as const;

export const contactEnquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(25, "That number is too long.")
    .regex(PHONE, "Please check the phone number."),
  // Optional: most enquiries here arrive by phone or WhatsApp, not email.
  email: z
    .string()
    .trim()
    .max(120, "That email address is too long.")
    .email("Please check the email address.")
    .optional()
    .or(z.literal("")),
  subject: z.string().max(80).optional(),
  message: z
    .string()
    .trim()
    .min(4, "Please tell us how we can help.")
    .max(1000, "Please keep it under 1000 characters."),
});

export type ContactEnquiry = z.infer<typeof contactEnquirySchema>;

/** Inserts a general contact enquiry. Throws with a readable message. */
export async function submitContactEnquiry(values: ContactEnquiry): Promise<void> {
  const base = {
    type: "contact" satisfies EnquiryType,
    name: values.name.trim(),
    phone: values.phone.trim(),
    message: values.message.trim(),
    handled: false,
  };

  const email = values.email?.trim() || null;
  const subject = values.subject || null;

  const { error } = await supabase.from("enquiries").insert({ ...base, email, subject });

  if (!error) return;

  // The email and subject columns arrive in a later migration than this code.
  // Rather than lose an enquiry in that window, fold both into the message and
  // insert without them. Losing a lead is far worse than losing a column.
  // PGRST204 is Postgrest's "column not in the schema cache", which is what a
  // missing column looks like on insert — it is not a Postgres "does not exist".
  if (
    error.code === "PGRST204" ||
    /could not find the '(email|subject)' column/i.test(error.message)
  ) {
    const prefix = [subject ? `Subject: ${subject}` : null, email ? `Email: ${email}` : null]
      .filter(Boolean)
      .join("\n");

    const { error: retryError } = await supabase.from("enquiries").insert({
      ...base,
      message: prefix ? `${prefix}\n\n${base.message}`.slice(0, 1000) : base.message,
    });

    if (!retryError) return;
  }

  throw new Error(
    error.message.includes("violates")
      ? "Please check the details and try again."
      : "We could not send that just now. Please try again, or reach us on WhatsApp.",
  );
}

/** Summary of a submitted booking, for the WhatsApp handoff after submit. */
export function bridalHandoffMessage(values: BridalEnquiry): string {
  const parts = [
    `Assalam-o-Alaikum, I have just requested a bridal consultation on your website.`,
    `Name: ${values.name.trim()}`,
    values.city?.trim() ? `City: ${values.city.trim()}` : null,
    values.weddingDate ? `Wedding date: ${values.weddingDate}` : null,
    values.budgetRange ? `Budget: ${values.budgetRange}` : null,
    values.preferredTime ? `Preferred time: ${values.preferredTime}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}
