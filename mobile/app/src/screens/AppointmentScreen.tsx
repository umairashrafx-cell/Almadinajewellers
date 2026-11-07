import { CalendarCheck, Check, Clock, Loader2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  APPOINTMENT_REASONS,
  APPOINTMENT_SLOTS,
  appointmentDay,
  appointmentSchema,
  submitAppointment,
  type Appointment,
} from "@/lib/enquiries";
import { whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

import { AppButton, AppLink } from "../components/AppButton";

/**
 * Asking to come in at a particular time.
 *
 * A request, not a booking, and the screen says so three times — in the line
 * under the heading, on the button, and on the card that replaces the form.
 * That is not excessive caution. Nothing in this app can see the shop's diary,
 * so a slot shown as confirmed would be a slot nobody has looked at, and the
 * cost of getting that wrong is a customer on a bus to Sarafa Market for an
 * appointment that does not exist.
 *
 * What it does instead is make the callback short: the shop rings knowing the
 * day, the window and what it is about, so the call is a yes or a different
 * time rather than an interview.
 *
 * Friday is refused by the schema rather than by this screen, so the rule
 * lives with the rest of the validation and is tested without a browser. The
 * screen says the shop's hours up front so somebody meets the rule before the
 * rule meets them.
 */
export function AppointmentScreen() {
  return (
    <div className="px-4 pt-5 pb-10">
      <header>
        <p className="text-[10px] font-semibold tracking-[0.3em] text-gold-deep uppercase">
          Appointment
        </p>
        <h1 className="font-display mt-2.5 text-2xl leading-tight text-primary">
          Tell us when you are coming
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-warmgrey">
          We will call to confirm. Nothing is held until we have spoken &mdash; this tells us when
          to expect you and what to have ready on the tray.
        </p>
      </header>

      <Hours />
      <Form />
    </div>
  );
}

/** The shop's own hours, so the closed day is known before it is enforced. */
function Hours() {
  return (
    <section className="card-lift-sm mt-5 flex items-start gap-3 rounded-xl border border-gold/15 bg-champagne/30 px-4 py-3.5">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
      <p className="text-[12px] leading-relaxed text-ink">
        Open Saturday to Thursday, 11:00am to 8:00pm.{" "}
        <span className="text-warmgrey">Closed on Friday.</span>
      </p>
    </section>
  );
}

const field =
  "mt-2 w-full rounded-xl border border-gold/25 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-gold";

function Field({
  label,
  htmlFor,
  problem,
  note,
  children,
}: {
  label: string;
  htmlFor: string;
  problem?: string | undefined;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold tracking-[0.18em] text-warmgrey uppercase"
      >
        {label}
      </label>
      {children}
      {problem ? (
        <p className="mt-1.5 text-xs font-medium text-destructive">{problem}</p>
      ) : note ? (
        <p className="mt-1.5 text-[11px] text-warmgrey">{note}</p>
      ) : null}
    </div>
  );
}

type Fields = {
  name: string;
  phone: string;
  day: string;
  slot: string;
  reason: string;
  message: string;
};

const EMPTY: Fields = {
  name: "",
  phone: "",
  day: "",
  slot: "",
  reason: "",
  message: "",
};

/** Today as the date input wants it, for the `min` attribute. */
function todayValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function Form() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [problems, setProblems] = useState<Partial<Record<keyof Fields, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ day: string; slot: string } | null>(null);

  const today = useMemo(todayValue, []);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setProblems((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;

    setFailure(null);
    const parsed = appointmentSchema.safeParse(fields);

    if (!parsed.success) {
      const found: Partial<Record<keyof Fields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Fields | undefined;
        if (key && !found[key]) found[key] = issue.message;
      }
      setProblems(found);
      return;
    }

    setSending(true);
    try {
      await submitAppointment(parsed.data satisfies Appointment);
      setSent({ day: parsed.data.day, slot: parsed.data.slot });
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "That did not send. Please try again, or message us on WhatsApp.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-white p-5 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-champagne/60">
          <Check className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <h2 className="font-display mt-3 text-lg text-primary">Asked for</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink">
          {appointmentDay(sent.day)}, {sent.slot}
        </p>
        {/*
          Said again, at the one moment somebody might otherwise stop reading
          and write the day in their diary.
        */}
        <p className="mt-3 text-[13px] leading-relaxed text-warmgrey">
          This is not confirmed yet. Somebody from the shop will call to agree the time with you.
        </p>

        <AppLink
          href={whatsappLink(
            `Assalam o Alaikum, I have asked for an appointment on ${appointmentDay(sent.day)}, ${sent.slot}.`,
          )}
          className="mt-5 bg-[#25D366] text-white"
          variant="quiet"
        >
          <WhatsAppIcon className="h-4 w-4" aria-hidden />
          Confirm it on WhatsApp
        </AppLink>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="card-lift mt-6 rounded-xl border border-gold/15 bg-ivory p-5">
        <h2 className="font-display mb-4 text-lg text-primary">When suits you</h2>

        <Field label="Day" htmlFor="appt-day" problem={problems.day}>
          <input
            id="appt-day"
            type="date"
            min={today}
            value={fields.day}
            onChange={(e) => set("day", e.target.value)}
            className={cn(field, "nums")}
          />
        </Field>

        <Field label="Time" htmlFor="appt-slot" problem={problems.slot}>
          {/*
            Windows rather than an hour. The shop is a counter with one scale
            and a tray, not a clinic with a rota, and offering 3:15 would
            promise a precision nobody is keeping.
          */}
          <div id="appt-slot" className="mt-2 grid gap-2">
            {APPOINTMENT_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={fields.slot === slot}
                onClick={() => set("slot", slot)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  fields.slot === slot
                    ? "border-gold bg-champagne/50 font-semibold text-primary"
                    : "border-gold/25 bg-white text-ink",
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="card-lift mt-5 rounded-xl border border-gold/15 bg-ivory p-5">
        <h2 className="font-display mb-4 text-lg text-primary">Where to reach you</h2>

        <Field label="Your name" htmlFor="appt-name" problem={problems.name}>
          <input
            id="appt-name"
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            autoComplete="name"
            className={field}
          />
        </Field>

        <Field label="Phone" htmlFor="appt-phone" problem={problems.phone}>
          <input
            id="appt-phone"
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn(field, "nums")}
          />
        </Field>

        <Field
          label="What about?"
          htmlFor="appt-reason"
          problem={problems.reason}
          note="So the right pieces are on the tray when you arrive."
        >
          <select
            id="appt-reason"
            value={fields.reason}
            onChange={(e) => set("reason", e.target.value)}
            className={field}
          >
            <option value="">Not sure</option>
            {APPOINTMENT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Anything else (optional)" htmlFor="appt-message" problem={problems.message}>
          <textarea
            id="appt-message"
            value={fields.message}
            onChange={(e) => set("message", e.target.value)}
            rows={3}
            className={cn(field, "resize-none")}
          />
        </Field>
      </section>

      {failure ? (
        <p role="alert" className="mt-5 text-sm font-medium text-destructive">
          {failure}
        </p>
      ) : null}

      <AppButton type="submit" disabled={sending} className="mt-6">
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <CalendarCheck className="h-4 w-4" aria-hidden />
        )}
        {sending ? "Sending…" : "Ask for this time"}
      </AppButton>

      <p className="mt-4 text-[11px] leading-relaxed text-warmgrey">
        Nothing is charged and nothing is held. We will call to agree the time.
      </p>
    </form>
  );
}
