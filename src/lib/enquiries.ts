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
