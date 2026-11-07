import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PHONE } from "@/lib/phone";
import { throttleMessage } from "@/lib/throttle";

/**
 * Enquiry submission. The enquiries table is insert-only for the public, so
 * nothing here reads a submission back — a successful insert is the whole
 * result. Validation is duplicated as CHECK constraints in the database, since
 * the anon key means anyone can post directly at the API.
 */

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
      throttleMessage(error) ??
        (error.message.includes("violates")
          ? "Please check the details and try again."
          : "We could not save that just now. Please try again, or send us a message on WhatsApp."),
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
    throttleMessage(error) ??
      (error.message.includes("violates")
        ? "Please check the details and try again."
        : "We could not send that just now. Please try again, or reach us on WhatsApp."),
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

/* ------------------------------------------------------------- appointments */

/**
 * Asking to come in at a particular time.
 *
 * Deliberately a request and not a booking. Nothing here checks a calendar,
 * because the shop does not keep one this code can read, and an app that
 * answers "confirmed" to a slot nobody has looked at is an app that sends a
 * customer on a bus journey to a closed door. So this lands in the same
 * enquiries list as everything else, the shop rings back, and every screen
 * that collects it says so in those words.
 *
 * It rides `callback` rather than a type of its own: the four allowed types
 * are a CHECK constraint on the table, a fifth would be a migration, and
 * "please ring me back" is an honest description of what the shop has to do
 * with one of these. The subject line carries the day and the window so the
 * row is scannable in the admin list, and `preferred_time` carries the window
 * on its own, where that list already has a field for it.
 */
export const APPOINTMENT_SLOTS = [
  "Morning (11am – 1pm)",
  "Afternoon (1pm – 5pm)",
  "Evening (5pm – 8pm)",
] as const;

export const APPOINTMENT_REASONS = [
  "Seeing a piece",
  "Bridal jewellery",
  "Custom order",
  "Selling gold",
  "Buy-back or exchange",
  "Something else",
] as const;

/** Friday, as Date#getDay counts it. The shop is closed. */
const FRIDAY = 5;

/** Midnight today, local, for comparing a chosen day against. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * A yyyy-mm-dd string as a local date.
 *
 * Built field by field rather than handed to `new Date(string)`, which reads a
 * bare date as UTC: in Pakistan that lands the previous evening and can make a
 * Saturday test as a Friday, which would refuse a day the shop is open.
 */
export function localDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  /*
   * Read back, because the Date constructor rolls over instead of refusing:
   * month 13 becomes next January and the 30th of February becomes March.
   * Neither is NaN, so only comparing the parts catches them.
   */
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export const appointmentSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "That name is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(25, "That number is too long.")
    .regex(PHONE, "Please check the phone number."),
  day: z
    .string()
    .min(1, "Please choose a day.")
    .refine((value) => localDate(value) !== null, "Please choose a day.")
    .refine((value) => {
      const date = localDate(value);
      return date !== null && date >= startOfToday();
    }, "Please choose today or a day after it.")
    .refine((value) => localDate(value)?.getDay() !== FRIDAY, "The shop is closed on Friday."),
  slot: z.string().min(1, "Please choose a time.").max(40),
  reason: z.string().max(60).optional(),
  message: z.string().trim().max(1000, "Please keep it under 1000 characters.").optional(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

/** "Saturday 15 November", the way the shop would say it back on the phone. */
export function appointmentDay(value: string): string {
  const date = localDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Inserts an appointment request. Throws with a readable message.
 *
 * The day and the window go into the message as well as the subject, because
 * the subject column is capped at eighty characters and a truncated subject
 * must never be the only record of when somebody said they were coming.
 */
export async function submitAppointment(values: Appointment): Promise<void> {
  const when = `${appointmentDay(values.day)}, ${values.slot}`;

  const note = [
    `Appointment requested: ${when}`,
    values.reason ? `About: ${values.reason}` : null,
    values.message?.trim() ? `\n${values.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const base = {
    type: "callback" satisfies EnquiryType,
    name: values.name.trim(),
    phone: values.phone.trim(),
    message: note.slice(0, 1000),
    preferred_time: values.slot.slice(0, 40),
    handled: false,
  };

  const subject = `Appointment: ${when}`.slice(0, 80);

  const { error } = await supabase.from("enquiries").insert({ ...base, subject });
  if (!error) return;

  // As with contact enquiries: an older database without the subject column
  // must not cost the shop a lead. The message already carries the day and
  // the window, so dropping the subject loses nothing but the scannability.
  if (error.code === "PGRST204" || /could not find the 'subject' column/i.test(error.message)) {
    const { error: retryError } = await supabase.from("enquiries").insert(base);
    if (!retryError) return;
  }

  throw new Error(
    throttleMessage(error) ??
      (error.message.includes("violates")
        ? "Please check the details and try again."
        : "We could not send that just now. Please try again, or reach us on WhatsApp."),
  );
}
