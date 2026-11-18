import { useState } from "react";

import { CalendarClock, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";

import { goldVerdict, isReleased, metalsWeek, nextRelease } from "@/lib/econ-calendar";
import type { CalendarDay, GoldVerdict } from "@/lib/econ-calendar";
import type { MarketCalendar, MarketEvent } from "@/lib/markets";
import { dayName, pktTime, timeUntil } from "@/lib/pkt";
import { cn } from "@/lib/utils";

import { useNow } from "../lib/now";

/**
 * The week's American releases that move gold and silver, laid out for a
 * phone.
 *
 * It used to live inside the gold and silver rows, one tap down, as a line of
 * small grey text per release. Read at arm's length in a shop that did not
 * work: the time, the name and three figures ran together. So it has its own
 * section now: each release a card, its time in Pakistan set large on the
 * left, and the three figures a dealer judges it by — actual, forecast,
 * previous — in labelled columns underneath.
 *
 * Once a release is out and the source has published its actual figure, a
 * label says which way that figure usually pushes gold. The rule behind it is
 * goldVerdict's, stated in the footnote, and it never appears before the
 * figure does.
 */
export function GoldCalendar({ calendar }: { calendar: MarketCalendar | undefined }) {
  const now = useNow();
  const [showEarlier, setShowEarlier] = useState(false);

  const week = metalsWeek(calendar, now);
  if (!week) return null;

  const next = nextRelease(week, now);
  const earlierCount = week.earlier.reduce((sum, day) => sum + day.events.length, 0);

  return (
    <section className="mt-8">
      <header className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-rate-gold-deep uppercase">
            Gold &amp; silver movers
          </p>
          <h2 className="mt-0.5 font-display text-[26px] leading-tight font-semibold text-rate-emerald">
            Economic calendar
          </h2>
        </div>
        <span className="mb-1 rounded-full border border-rate-gold/40 px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
          PKT
        </span>
      </header>
      <p className="mt-1 px-1 text-[11.5px] leading-snug text-rate-ink/70">
        High and medium impact US releases this week. Every time is Pakistan time.
      </p>

      {next ? <NextUp event={next} now={now} /> : null}

      {earlierCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowEarlier((open) => !open)}
          aria-expanded={showEarlier}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-rate-gold/30 py-2 text-[11px] font-semibold text-rate-gold-deep active:bg-rate-gold/10"
        >
          {showEarlier ? "Hide" : "Show"} earlier this week ({earlierCount})
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", showEarlier && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : null}

      <div className="mt-2">
        {(showEarlier ? [...week.earlier, ...week.coming] : week.coming).map((day) => (
          <Day key={day.day} day={day} now={now} nextKey={next ? keyOf(next) : null} />
        ))}
      </div>

      <p className="mt-5 px-2 text-[10.5px] leading-relaxed text-warmgrey">
        From the metals calendar at metalsmine.com. Once a release is out and its actual figure is
        published, it is labelled: US data <strong className="font-semibold">stronger</strong> than
        forecast (more jobs, hotter inflation, faster growth or spending) usually weighs on gold,
        and <strong className="font-semibold">weaker</strong> usually lifts it — for unemployment
        and jobless claims, a higher figure is the weaker one. That is the market&rsquo;s usual
        first reaction, not a forecast or advice. Actual figures for jobs, unemployment, CPI and PPI
        come from the US Bureau of Labor Statistics shortly after release; a dash means we have no
        actual for that release.
      </p>
    </section>
  );
}

function keyOf(event: MarketEvent): string {
  return `${event.at}-${event.currency}-${event.title}`;
}

/** The release everyone is waiting for, with how long there is to wait. */
function NextUp({ event, now }: { event: MarketEvent; now: Date }) {
  const countdown = timeUntil(event.at, now);

  return (
    <div className="card-lift mt-4 flex items-center gap-3 rounded-xl border border-rate-gold/50 bg-rate-emerald px-4 py-3">
      <CalendarClock className="h-5 w-5 shrink-0 text-rate-gold" strokeWidth={1.8} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-semibold tracking-[0.2em] text-rate-gold uppercase">
          Next up{countdown ? ` · ${countdown}` : ""}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-rate-ivory">{event.title}</p>
      </div>
      <p className="nums shrink-0 text-right text-[14px] font-bold text-rate-ivory">
        {pktTime(event.at)}
      </p>
    </div>
  );
}

function Day({ day, now, nextKey }: { day: CalendarDay; now: Date; nextKey: string | null }) {
  const named = dayName(day.day);
  const heading = day.label === named ? named : `${day.label} · ${named}`;

  return (
    <div className="mt-4">
      <h3 className="px-1 text-[10.5px] font-semibold tracking-[0.18em] text-rate-gold-deep uppercase">
        {heading}
      </h3>

      {day.events.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-rate-gold/30 px-4 py-3 text-[12px] text-rate-ink/65">
          No gold-moving US releases today.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2.5">
          {day.events.map((event) => (
            <Release key={keyOf(event)} event={event} now={now} isNext={keyOf(event) === nextKey} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Release({ event, now, isNext }: { event: MarketEvent; now: Date; isNext: boolean }) {
  const released = isReleased(event, now);
  const verdict = goldVerdict(event);
  const hasFigures = Boolean(event.forecast || event.previous || event.actual);

  return (
    <li
      className={cn(
        "card-lift-sm rounded-xl border bg-white/70 px-3 py-3",
        isNext ? "border-rate-gold/70" : "border-rate-gold/30",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-[70px] shrink-0">
          <p
            className={cn(
              "nums text-[14px] leading-tight font-bold whitespace-nowrap",
              released ? "text-rate-ink/60" : "text-rate-emerald",
            )}
          >
            {pktTime(event.at)}
          </p>
          <p className="mt-0.5 text-[9.5px] font-semibold tracking-wide text-rate-ink/50 uppercase">
            {released ? "Out" : "PKT"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] leading-snug font-semibold text-ink">{event.title}</p>
          <p className="mt-1 flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-px text-[9.5px] font-bold tracking-wide uppercase",
                event.impact === "High"
                  ? "bg-red-700/10 text-red-700"
                  : "bg-rate-gold/15 text-rate-gold-deep",
              )}
            >
              {event.impact === "High" ? "High impact" : "Medium impact"}
            </span>
            <span className="text-[10px] font-semibold text-rate-ink/50">{event.currency}</span>
          </p>
        </div>
      </div>

      {hasFigures ? (
        <dl className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-rate-gold/20 pt-2.5">
          <Figure
            label="Actual"
            value={released ? (event.actual ?? "—") : "Due"}
            strong={released}
          />
          <Figure label="Forecast" value={event.forecast ?? "—"} />
          <Figure label="Previous" value={event.previous ?? "—"} />
        </dl>
      ) : null}

      {released && verdict ? <Verdict verdict={verdict} /> : null}
    </li>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[9px] font-semibold tracking-[0.14em] text-rate-ink/55 uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "nums mt-0.5 text-[13px] leading-tight",
          strong ? "font-bold text-rate-emerald" : "font-semibold text-ink",
          value === "Due" && "font-semibold text-rate-ink/50",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

const VERDICTS: Record<GoldVerdict, { label: string; why: string; className: string }> = {
  good: {
    label: "Usually good for gold",
    why: "weaker than forecast",
    className: "bg-success/10 text-success",
  },
  bad: {
    label: "Usually bad for gold",
    why: "stronger than forecast",
    className: "bg-red-700/10 text-red-700",
  },
  inline: {
    label: "As expected",
    why: "in line with forecast",
    className: "bg-rate-gold/15 text-rate-gold-deep",
  },
};

function Verdict({ verdict }: { verdict: GoldVerdict }) {
  const { label, why, className } = VERDICTS[verdict];

  return (
    <p className={cn("mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2", className)}>
      {verdict === "good" ? <TrendingUp className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {verdict === "bad" ? <TrendingDown className="h-4 w-4 shrink-0" aria-hidden /> : null}
      <span className="min-w-0">
        <span className="block text-[12px] leading-tight font-bold">{label}</span>
        <span className="mt-0.5 block text-[10.5px] leading-tight opacity-85">US data {why}</span>
      </span>
    </p>
  );
}
