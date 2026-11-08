import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Loader2, Phone } from "lucide-react";

import { Banner, Card, Chip, PageHeading, StatCard, toneBar } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Skeleton } from "@/components/ui/skeleton";

import { formatEnquiryDate, whatsappNumber } from "@/lib/admin";
import {
  APPOINTMENT_SLOTS,
  appointmentDay,
  fetchAppointments,
  moveAppointment,
  setAppointmentNote,
  setAppointmentStatus,
  settledDay,
  settledSlot,
  wasMoved,
  type AdminAppointment,
  type AppointmentStatus,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/appointments")({
  component: AppointmentsScreen,
});

/**
 * The diary.
 *
 * Laid out as days rather than as a list of submissions, because the question
 * the shop has in the morning is "who is coming today", not "what arrived
 * overnight". The submissions view is still here as a filter — To call back —
 * and it is the one the day starts on.
 *
 * Under each window is a count of how many people are expected in it. That is
 * the whole of the availability story and it is deliberate: nobody has said
 * how many customers the counter can take at once, and a cap invented here
 * would start refusing real people on a Saturday. A number the shop can see
 * lets it decide, which is what it was doing before any of this existed.
 */

const STATUSES: { key: AppointmentStatus; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "came", label: "Came in" },
  { key: "missed", label: "Did not come" },
];

function toneFor(status: AppointmentStatus) {
  if (status === "requested") return "bridal" as const;
  if (status === "confirmed") return "settled" as const;
  if (status === "came") return "product" as const;
  return "neutral" as const;
}

/** Today, in the browser's own terms, to compare date columns against. */
function todayValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Still expected: not cancelled, and not already seen. */
function pending(row: AdminAppointment): boolean {
  return row.status === "requested" || row.status === "confirmed";
}

type Filter = "diary" | "requested" | "past";

function AppointmentsScreen() {
  const [filter, setFilter] = useState<Filter>("requested");
  const queryClient = useQueryClient();
  const today = useMemo(todayValue, []);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "appointments"],
    queryFn: fetchAppointments,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "appointments"] });

  const status = useMutation({
    mutationFn: ({ id, status: next }: { id: string; status: AppointmentStatus }) =>
      setAppointmentStatus(id, next),
    onSuccess: refresh,
  });

  const move = useMutation({
    mutationFn: ({ id, day, slot }: { id: string; day: string; slot: string }) =>
      moveAppointment(id, day, slot),
    onSuccess: refresh,
  });

  const note = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => setAppointmentNote(id, text),
    onSuccess: refresh,
  });

  const all = useMemo(() => data ?? [], [data]);
  const toCall = all.filter((a) => a.status === "requested");
  const comingToday = all.filter((a) => pending(a) && settledDay(a) === today);

  const shown = useMemo(() => {
    if (filter === "requested") return toCall;
    if (filter === "past") return all.filter((a) => settledDay(a) < today);
    return all.filter((a) => settledDay(a) >= today && pending(a));
  }, [all, filter, toCall, today]);

  /* Days, soonest first, each holding its visits in window order. */
  const days = useMemo(() => {
    const byDay = new Map<string, AdminAppointment[]>();
    for (const row of shown) {
      const key = settledDay(row);
      const list = byDay.get(key);
      if (list) list.push(row);
      else byDay.set(key, [row]);
    }

    const order = (row: AdminAppointment) => {
      const i = (APPOINTMENT_SLOTS as readonly string[]).indexOf(settledSlot(row));
      // A window the shop no longer offers sorts to the end rather than to
      // the top, which is where -1 would have put it.
      return i === -1 ? APPOINTMENT_SLOTS.length : i;
    };

    return [...byDay.entries()]
      .sort((a, b) => (filter === "past" ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])))
      .map(([day, rows]) => ({ day, rows: [...rows].sort((a, b) => order(a) - order(b)) }));
  }, [shown, filter]);

  const busy = status.error ?? move.error ?? note.error;

  return (
    <>
      <PageHeading
        title="Appointments"
        hint="People who have said when they are coming. None of them is confirmed until somebody rings and agrees it — the app tells them so. Call back, agree a time, and the day fills in below."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="To call back"
          value={toCall.length}
          tone={toCall.length > 0 ? "bridal" : "settled"}
          hint={toCall.length > 0 ? "Nobody has agreed a time yet" : "All caught up"}
          icon={CalendarCheck}
        />
        <StatCard
          label="Coming today"
          value={comingToday.length}
          tone="contact"
          hint="Asked for or agreed"
        />
        <StatCard label="On the books" value={all.filter(pending).length} tone="neutral" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { key: "requested", label: "To call back", count: toCall.length },
            {
              key: "diary",
              label: "The diary",
              count: all.filter((a) => settledDay(a) >= today && pending(a)).length,
            },
            {
              key: "past",
              label: "Been and gone",
              count: all.filter((a) => settledDay(a) < today).length,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-ivory"
                : "border-gold/30 bg-card text-warmgrey hover:border-gold hover:text-primary",
            )}
          >
            {f.label}
            <span className="nums ml-2 text-xs opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {error ? <Banner tone="error">{(error as Error).message}</Banner> : null}
      {busy ? <Banner tone="error">{(busy as Error).message}</Banner> : null}

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <p className="font-display text-2xl font-light text-primary">Nothing here</p>
          <p className="mt-2 text-sm text-warmgrey">
            These arrive from Book an appointment in the phone app.
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {days.map(({ day, rows }) => (
            <section key={day}>
              <h2 className="font-display text-xl text-primary">
                {appointmentDay(day)}
                {day === today ? <span className="ml-2 text-sm text-gold-deep">today</span> : null}
              </h2>

              <div className="mt-4 space-y-6">
                {windowsOf(rows).map(({ slot, visits }) => (
                  <div key={slot}>
                    <p className="mb-2 text-xs font-semibold tracking-widest text-warmgrey uppercase">
                      {slot}
                      <span className="nums ml-2 normal-case">
                        · {visits.length} {visits.length === 1 ? "person" : "people"}
                      </span>
                    </p>

                    <ul className="space-y-3">
                      {visits.map((row) => (
                        <VisitCard
                          key={row.id}
                          row={row}
                          working={
                            (status.isPending && status.variables?.id === row.id) ||
                            (move.isPending && move.variables?.id === row.id) ||
                            (note.isPending && note.variables?.id === row.id)
                          }
                          onStatus={(next) => status.mutate({ id: row.id, status: next })}
                          onMove={(d, s) => move.mutate({ id: row.id, day: d, slot: s })}
                          onNote={(text) => note.mutate({ id: row.id, text })}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/** A day's visits, bundled under the window each one stands in. */
function windowsOf(rows: AdminAppointment[]): { slot: string; visits: AdminAppointment[] }[] {
  const out: { slot: string; visits: AdminAppointment[] }[] = [];
  for (const row of rows) {
    const slot = settledSlot(row);
    const last = out[out.length - 1];
    if (last && last.slot === slot) last.visits.push(row);
    else out.push({ slot, visits: [row] });
  }
  return out;
}

const input =
  "h-9 rounded-lg border border-input bg-card px-3 text-sm text-ink outline-none focus:border-gold";

function VisitCard({
  row,
  working,
  onStatus,
  onMove,
  onNote,
}: {
  row: AdminAppointment;
  working: boolean;
  onStatus: (status: AppointmentStatus) => void;
  onMove: (day: string, slot: string) => void;
  onNote: (text: string) => void;
}) {
  const tone = toneFor(row.status);
  const wa = whatsappNumber(row.phone);

  const [day, setDay] = useState(settledDay(row));
  const [slot, setSlot] = useState(settledSlot(row));
  const [text, setText] = useState(row.note ?? "");

  const changed = day !== settledDay(row) || slot !== settledSlot(row);

  return (
    <li>
      <Card className="relative overflow-hidden">
        <span className={cn("absolute inset-y-0 left-0 w-1", toneBar(tone))} aria-hidden="true" />

        <div className="p-5 pl-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex flex-wrap items-center gap-2">
                <span className="nums font-semibold tracking-widest text-primary">
                  {row.reference}
                </span>
                <Chip tone={tone}>{STATUSES.find((s) => s.key === row.status)?.label}</Chip>
                {wasMoved(row) ? <Chip tone="callback">moved</Chip> : null}
              </p>
              <p className="mt-1 text-sm text-ink">{row.name}</p>
              <p className="nums mt-1 text-xs text-warmgrey">
                Asked {formatEnquiryDate(row.created_at)}
              </p>
            </div>

            {row.reason ? <Chip tone="product">{row.reason}</Chip> : null}
          </div>

          {/*
            What they originally asked for, shown only once it is no longer
            what is happening. A customer who rings up about "my Tuesday
            appointment" is then answered from the record.
          */}
          {wasMoved(row) ? (
            <p className="mt-3 text-xs text-warmgrey">
              Originally asked for {appointmentDay(row.day)}, {row.slot}
            </p>
          ) : null}

          {row.message ? (
            <p className="mt-3 rounded-lg bg-champagne/25 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink">
              {row.message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={`tel:${row.phone.replace(/\s/g, "")}`}
              className="nums inline-flex items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-sm text-ink transition-colors hover:border-gold hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {row.phone}
            </a>
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-settled px-3 py-2 text-sm font-medium text-ivory transition-opacity hover:opacity-90"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}

            <span className="ml-auto inline-flex items-center gap-2">
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin text-warmgrey" aria-hidden="true" />
              ) : null}
              <label className="sr-only" htmlFor={`status-${row.id}`}>
                Appointment status
              </label>
              <select
                id={`status-${row.id}`}
                value={row.status}
                disabled={working}
                onChange={(e) => onStatus(e.target.value as AppointmentStatus)}
                className={input}
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </span>
          </div>

          {/*
            Agreeing the time. The button is the common action and does both
            things at once — it sets the day and window and marks the booking
            confirmed — because on the phone those are one act, and leaving
            them as two is how a booking ends up agreed but still showing as
            waiting for a call.
          */}
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-gold/15 pt-4">
            <div>
              <label
                className="block text-[10px] font-semibold tracking-widest text-warmgrey uppercase"
                htmlFor={`day-${row.id}`}
              >
                Day
              </label>
              <input
                id={`day-${row.id}`}
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={cn(input, "nums mt-1")}
              />
            </div>

            <div>
              <label
                className="block text-[10px] font-semibold tracking-widest text-warmgrey uppercase"
                htmlFor={`slot-${row.id}`}
              >
                Window
              </label>
              <select
                id={`slot-${row.id}`}
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className={cn(input, "mt-1")}
              >
                {/* The stored window first, so one the shop has since stopped
                    offering is still shown rather than silently rewritten. */}
                {[
                  ...new Set<string>([
                    settledSlot(row),
                    ...(APPOINTMENT_SLOTS as readonly string[]),
                  ]),
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={working}
              onClick={() => onMove(day, slot)}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {changed ? "Move and confirm" : "Confirm this time"}
            </button>
          </div>

          <div className="mt-3">
            <label className="sr-only" htmlFor={`note-${row.id}`}>
              Note for the shop
            </label>
            <input
              id={`note-${row.id}`}
              value={text}
              placeholder="A note for whoever is at the counter"
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                if (text.trim() !== (row.note ?? "").trim()) onNote(text);
              }}
              className={cn(input, "w-full")}
            />
          </div>
        </div>
      </Card>
    </li>
  );
}
