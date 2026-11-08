import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { PHONE } from "@/lib/phone";
import { throttleMessage } from "@/lib/throttle";

/**
 * Appointments, end to end.
 *
 * One module for the whole feature rather than the usual split — the rules in
 * enquiries.ts, the shop's half in admin.ts — because an appointment is a
 * single small thing with a single small table, and the two halves have to
 * agree about every column in it. Kept apart they drift: a window renamed on
 * the customer's side and not on the shop's is a diary that disagrees with
 * the app, and nothing in either file would say so.
 *
 * WHAT A REQUEST IS. Not a booking. Nothing here reads a calendar, because
 * the shop does not keep one this code can see, and an app that answers
 * "confirmed" to a slot nobody has looked at sends a customer on a bus
 * journey to a closed door. The table records what was asked for, the shop
 * rings back, and the status moves to `confirmed` when a person has agreed
 * it. Every screen that collects one of these says so in those words, and
 * must go on saying so until a real calendar exists.
 *
 * The three rules below — a day that has not gone, a day inside six months,
 * and not a Friday — are also enforced in the database, in
 * `request_appointment`. The copy here is what puts a useful sentence under
 * the field; the copy there is what makes the rule true.
 */

/** `appointments` postdates the generated Database type, so it is read untyped. */
const untyped = supabase as unknown as SupabaseClient;

/* ------------------------------------------------------------ what is on offer */

/**
 * The windows, as a customer is shown them.
 *
 * Windows rather than an hour. The shop is a counter with one scale and a
 * tray, not a clinic with a rota, and offering 3:15 would promise a precision
 * nobody is keeping. Each is stored as this exact label, so keep them under
 * forty characters — that is the column's limit.
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

/* ---------------------------------------------------------------- reading days */

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

/** How far ahead a counter visit may be asked for. Matches the database. */
const MONTHS_AHEAD = 6;

function lastBookableDay(): Date {
  const today = startOfToday();
  return new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, today.getDate());
}

/** "Saturday 15 November", the way the shop would say it back on the phone. */
export function appointmentDay(value: string): string {
  const date = localDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/* ---------------------------------------------------------------- what is asked */

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
    .refine((value) => {
      const date = localDate(value);
      return date !== null && date <= lastBookableDay();
    }, "Please choose a day in the next six months.")
    .refine((value) => localDate(value)?.getDay() !== FRIDAY, "The shop is closed on Friday."),
  slot: z.string().min(1, "Please choose a time.").max(40),
  reason: z.string().max(60).optional(),
  message: z.string().trim().max(1000, "Please keep it under 1000 characters.").optional(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

/**
 * Asks for a time. Returns the reference to quote, and throws readably.
 *
 * Through a definer function rather than a plain insert, for the reason
 * custom orders use one: the customer is handed back a reference, and
 * returning it from an insert would need SELECT on a table holding other
 * people's names, numbers and whereabouts on a given afternoon.
 */
export async function requestAppointment(values: Appointment): Promise<string | null> {
  const { data, error } = await untyped.rpc("request_appointment", {
    p_name: values.name.trim(),
    p_phone: values.phone.trim(),
    p_day: values.day,
    p_slot: values.slot.slice(0, 40),
    p_reason: values.reason ?? null,
    p_message: values.message?.trim() ?? null,
  });

  if (!error) return typeof data === "string" ? data : null;

  /*
   * A deploy that lands before the migration does must not cost the shop a
   * customer. Until the function exists, the request goes where it has always
   * gone — the enquiries list, as a callback — and the shop sees it there.
   * Nothing is lost but the reference and the diary.
   */
  if (missingFunction(error)) return fileAsCallbackEnquiry(values);

  /*
   * The database raises the day rules as plain sentences, written to be read
   * by whoever is holding the phone. Passing one straight through is right:
   * rewording it here would mean two places to change the wording of one
   * rule. Anything else gets the general line.
   */
  throw new Error(
    throttleMessage(error) ??
      (isDayRule(error.message)
        ? error.message
        : error.message.includes("violates")
          ? "Please check the details and try again."
          : "We could not send that just now. Please try again, or reach us on WhatsApp."),
  );
}

/** PostgREST's "no such function", by code and by the message it prints. */
function missingFunction(error: { code?: string; message: string }): boolean {
  return error.code === "PGRST202" || /could not find the function/i.test(error.message);
}

/** The sentences `request_appointment` raises, which are safe to show. */
function isDayRule(message: string): boolean {
  return /closed on Friday|choose a day|choose today/i.test(message);
}

/**
 * The old path: an appointment as a callback enquiry.
 *
 * Kept only as the landing ground for the window between a deploy and its
 * migration. It writes the day and the window into the message as well as the
 * subject, because the subject column stops at eighty characters and a
 * truncated subject must never be the only record of when somebody said they
 * were coming.
 */
async function fileAsCallbackEnquiry(values: Appointment): Promise<null> {
  const when = `${appointmentDay(values.day)}, ${values.slot}`;

  const note = [
    `Appointment requested: ${when}`,
    values.reason ? `About: ${values.reason}` : null,
    values.message?.trim() ? `\n${values.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase.from("enquiries").insert({
    type: "callback",
    name: values.name.trim(),
    phone: values.phone.trim(),
    subject: `Appointment: ${when}`.slice(0, 80),
    message: note.slice(0, 1000),
    preferred_time: values.slot.slice(0, 40),
    handled: false,
  });

  if (error) {
    throw new Error(
      throttleMessage(error) ??
        "We could not send that just now. Please try again, or reach us on WhatsApp.",
    );
  }

  return null;
}

/* --------------------------------------------------------------- the shop's half */

/**
 * Where a booking has got to.
 *
 * `came` and `missed` are the two that earn their place after the visit. A
 * shop that can see who did not turn up can decide whether to keep taking
 * requests from that number, and neither fact is recoverable later from a
 * confirmed booking that simply sits there.
 */
export type AppointmentStatus = "requested" | "confirmed" | "cancelled" | "came" | "missed";

export type AdminAppointment = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  /** What the customer asked for. Never rewritten. */
  day: string;
  slot: string;
  reason: string | null;
  message: string | null;
  status: AppointmentStatus;
  /** What was settled on the phone, when it differs from what was asked. */
  agreed_day: string | null;
  agreed_slot: string | null;
  note: string | null;
  created_at: string;
};

/** The day and window a booking actually stands at. */
export function settledDay(row: AdminAppointment): string {
  return row.agreed_day ?? row.day;
}

export function settledSlot(row: AdminAppointment): string {
  return row.agreed_slot ?? row.slot;
}

/** True when the shop moved it, which is worth showing beside the new time. */
export function wasMoved(row: AdminAppointment): boolean {
  return (
    (row.agreed_day !== null && row.agreed_day !== row.day) ||
    (row.agreed_slot !== null && row.agreed_slot !== row.slot)
  );
}

function adminError(error: { code?: string; message: string }, context: string): Error {
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return new Error(
      "This account is not allowed to make that change. Sign out and back in, and check it is listed as an administrator.",
    );
  }
  return new Error(`${context}: ${error.message}`);
}

/**
 * Everything from yesterday onwards, plus whatever is still unanswered.
 *
 * Not the whole table. A diary is about the days ahead, and a year of past
 * visits downloaded on every page load would be slower every month. Yesterday
 * is included because a shop opening up at eleven still wants to see who was
 * expected at closing time the night before.
 */
export async function fetchAppointments(): Promise<AdminAppointment[]> {
  const from = new Date();
  from.setDate(from.getDate() - 1);
  const since = from.toISOString().slice(0, 10);

  const { data, error } = await untyped
    .from("appointments")
    .select("*")
    .or(`day.gte.${since},agreed_day.gte.${since},status.eq.requested`)
    .order("created_at", { ascending: false });

  if (error) throw adminError(error, "Could not load appointments");
  return (data ?? []) as AdminAppointment[];
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await untyped.from("appointments").update({ status }).eq("id", id);
  if (error) throw adminError(error, "Could not update that appointment");
}

/**
 * Moves a booking to the time the shop agreed on the phone.
 *
 * Writes `agreed_*` and leaves `day` and `slot` alone, so what the customer
 * asked for survives the move. A customer who rings back saying "but I said
 * Tuesday" is then right or wrong on the record rather than on memory.
 */
export async function moveAppointment(id: string, day: string, slot: string): Promise<void> {
  const { error } = await untyped
    .from("appointments")
    .update({ agreed_day: day, agreed_slot: slot, status: "confirmed" })
    .eq("id", id);

  if (error) throw adminError(error, "Could not move that appointment");
}

/** The shop's own line about a visit. Empty clears it. */
export async function setAppointmentNote(id: string, note: string): Promise<void> {
  const trimmed = note.trim();
  const { error } = await untyped
    .from("appointments")
    .update({ note: trimmed === "" ? null : trimmed.slice(0, 500) })
    .eq("id", id);

  if (error) throw adminError(error, "Could not save that note");
}
