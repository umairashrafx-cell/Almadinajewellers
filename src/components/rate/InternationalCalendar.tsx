import { CalendarClock, TrendingDown, TrendingUp } from "lucide-react";

import { InfoNote } from "@/components/ui/InfoNote";

import {
  goldVerdict,
  isReleased,
  metalsWeek,
  nextRelease,
  releaseWatch,
} from "@/lib/econ-calendar";
import type { CalendarDay, GoldVerdict, ReleaseWatch } from "@/lib/econ-calendar";
import type { MarketCalendar, MarketEvent } from "@/lib/markets";
import { useMountedNow } from "@/lib/now";
import { dayName, pktTime, timeUntil } from "@/lib/pkt";
import { cn } from "@/lib/utils";

/**
 * The week's American releases that move gold and silver.
 *
 * The same section the app's International tab carries, and the same logic:
 * metalsWeek decides which week, goldVerdict decides what a figure means once
 * it is out. What differs is the shape. The app stacks a card per release down
 * a phone; the page has room to set a day's releases side by side, and sets
 * the three figures a dealer judges a release by — actual, forecast, previous —
 * in labelled columns under its name.
 *
 * This is also the part of the international section most worth having in the
 * server's HTML. "When is the next US jobs report" is a question people put
 * into a search engine, and the answer sitting on the shop's rate page in
 * Pakistan time is the kind of thing no national rate aggregator publishes.
 */
export function InternationalCalendar({ calendar }: { calendar: MarketCalendar | undefined }) {
  /*
   * The week is worked out against the server's clock on the first render and
   * the browser's after that. Both land on the same week — it is a seven-day
   * window, not a countdown — so the list in the HTML is the list the reader
   * ends up with. Only the two things that genuinely turn over with the clock
   * wait for the browser: how long there is until the next release, and
   * whether a release has already happened. See useMountedNow.
   */
  const now = useMountedNow();
  const week = metalsWeek(calendar, now ?? new Date());
  if (!week) return null;

  const next = now ? nextRelease(week, now) : null;
  const days = [...week.earlier, ...week.coming];

  return (
    <div className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-rate-gold-deep uppercase">
            Gold &amp; silver movers
          </p>
          <h3 className="mt-1 font-display text-[26px] leading-tight font-light tracking-wide text-rate-emerald sm:text-3xl">
            This week&rsquo;s economic calendar
          </h3>
        </div>
        <span className="mb-1 rounded-[2px] border border-rate-gold/40 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
          Pakistan time
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-warmgrey">
        High and medium impact US releases this week. These are the scheduled figures that move the
        dollar price of gold, and with it the rate on the board above.
      </p>

      {next ? <NextUp event={next} now={now} /> : null}

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => (
          <Day key={day.day} day={day} now={now} nextKey={next ? keyOf(next) : null} />
        ))}
      </div>

      <InfoNote size="md" className="mt-8" label="How to read these">
        From the metals calendar at metalsmine.com. Once a release is out and its actual figure is
        published, it is labelled: US data <strong className="font-semibold">stronger</strong> than
        forecast (more jobs, hotter inflation, faster growth or spending) usually weighs on gold,
        and <strong className="font-semibold">weaker</strong> usually lifts it — for unemployment
        and jobless claims, a higher figure is the weaker one. That is the market&rsquo;s usual
        first reaction, not a forecast or advice. Actual figures come from the agencies that publish
        them — jobs, CPI and PPI from the Bureau of Labor Statistics, retail sales from the Census
        Bureau, GDP and PCE from the Bureau of Economic Analysis — shortly after release; a dash
        means we have no actual for that release. Some entries are words rather than figures — the
        FOMC minutes, the Fed&rsquo;s statement, a policymaker&rsquo;s speech. There is nothing to
        compare, so no label is claimed for them; instead the card says what the release is and what
        a dovish or a hawkish tone would look like, and you take the tone from what was actually
        said.
      </InfoNote>
    </div>
  );
}

function keyOf(event: MarketEvent): string {
  return `${event.at}-${event.currency}-${event.title}`;
}

/** The release everyone is waiting for, with how long there is to wait. */
function NextUp({ event, now }: { event: MarketEvent; now: Date | null }) {
  const countdown = now ? timeUntil(event.at, now) : null;

  return (
    <div className="mt-6 flex items-center gap-4 rounded-xl border border-rate-gold/50 bg-rate-emerald px-5 py-4">
      <CalendarClock className="h-6 w-6 shrink-0 text-rate-gold" strokeWidth={1.6} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-rate-gold uppercase">
          Next up{countdown ? ` · ${countdown}` : ""}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-rate-ivory sm:text-base">
          {event.title}
        </p>
      </div>
      <p className="nums shrink-0 text-right text-base font-bold text-rate-ivory sm:text-lg">
        {pktTime(event.at)}
      </p>
    </div>
  );
}

function Day({
  day,
  now,
  nextKey,
}: {
  day: CalendarDay;
  now: Date | null;
  nextKey: string | null;
}) {
  const named = dayName(day.day);
  const heading = day.label === named ? named : `${day.label} · ${named}`;

  return (
    <div>
      <h4 className="text-[11px] font-semibold tracking-[0.18em] text-rate-gold-deep uppercase">
        {heading}
      </h4>

      {day.events.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-rate-gold/30 px-4 py-3 text-sm text-rate-ink/65">
          No gold-moving US releases.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {day.events.map((event) => (
            <Release key={keyOf(event)} event={event} now={now} isNext={keyOf(event) === nextKey} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Release({
  event,
  now,
  isNext,
}: {
  event: MarketEvent;
  now: Date | null;
  isNext: boolean;
}) {
  /*
   * Until the browser's clock arrives nothing is called out or past: the
   * figures and the time are still printed, which is what the page is for, and
   * the "Out" stamp and the verdict appear a moment later. Guessing either on
   * the server would mean printing one answer and then correcting it.
   */
  const released = now ? isReleased(event, now) : false;
  const verdict = goldVerdict(event);
  const watch = releaseWatch(event);
  const hasFigures = Boolean(event.forecast || event.previous || event.actual);

  return (
    <li
      className={cn(
        "rounded-xl border bg-white/70 px-4 py-3.5 shadow-[0_1px_2px_rgb(22_61_52/0.04)]",
        isNext ? "border-rate-gold/70" : "border-rate-gold/30",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-[68px] shrink-0">
          <p
            className={cn(
              "nums text-base leading-tight font-bold whitespace-nowrap",
              released ? "text-rate-ink/60" : "text-rate-emerald",
            )}
          >
            {pktTime(event.at)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-rate-ink/50 uppercase">
            {released ? "Out" : "PKT"}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold text-ink">{event.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-[2px] px-2 py-px text-[10px] font-bold tracking-wide uppercase",
                event.impact === "High"
                  ? "bg-red-700/10 text-red-700"
                  : "bg-rate-gold/15 text-rate-gold-deep",
              )}
            >
              {event.impact === "High" ? "High impact" : "Medium impact"}
            </span>
            <span className="text-[11px] font-semibold text-rate-ink/50">{event.currency}</span>
          </p>
        </div>
      </div>

      {hasFigures ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-rate-gold/20 pt-3">
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
      {watch ? <Watch watch={watch} /> : null}
    </li>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[9.5px] font-semibold tracking-[0.14em] text-rate-ink/55 uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "nums mt-0.5 text-sm leading-tight",
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
    <p className={cn("mt-3 flex items-center gap-2 rounded-[2px] px-2.5 py-2", className)}>
      {verdict === "good" ? <TrendingUp className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {verdict === "bad" ? <TrendingDown className="h-4 w-4 shrink-0" aria-hidden /> : null}
      <span className="min-w-0">
        <span className="block text-xs leading-tight font-bold">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-tight opacity-85">US data {why}</span>
      </span>
    </p>
  );
}

const TONES = {
  dovish: {
    label: "Dovish",
    effect: "usually good for gold",
    className: "text-success",
    Icon: TrendingUp,
  },
  hawkish: {
    label: "Hawkish",
    effect: "usually bad for gold",
    className: "text-red-700",
    Icon: TrendingDown,
  },
} as const;

/**
 * What to watch for in a release that has no figure.
 *
 * The minutes, the statement and a policymaker's speech are words, not
 * numbers. Nobody can know before they are out whether the tone will be
 * dovish or hawkish, so there is no "good for gold" or "bad for gold" to be
 * had here, and printing one would be inventing it. What is well established
 * is the other half: which way each tone usually pushes the price. So the card
 * gives the key rather than a verdict — what the release is, and what each
 * tone looks like — and the reader supplies the tone from what was said.
 *
 * This is a key, not a judgement, so unlike Verdict it shows before the
 * release as well as after. Before is when it is most use.
 */
function Watch({ watch }: { watch: ReleaseWatch }) {
  return (
    <div className="mt-3 border-t border-rate-gold/20 pt-3">
      <p className="text-[9.5px] font-semibold tracking-[0.14em] text-rate-ink/55 uppercase">
        No figure &mdash; what to watch
      </p>
      <p className="mt-1 text-xs leading-snug text-rate-ink/75">{watch.what}</p>
      <dl className="mt-2.5 grid gap-2">
        <Tone tone="dovish" text={watch.dovish} />
        <Tone tone="hawkish" text={watch.hawkish} />
      </dl>
    </div>
  );
}

function Tone({ tone, text }: { tone: keyof typeof TONES; text: string }) {
  const { label, effect, className, Icon } = TONES[tone];

  return (
    <div className="flex gap-2">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", className)} aria-hidden />
      <div className="min-w-0">
        <dt className={cn("text-[11px] leading-tight font-bold", className)}>
          {label} &mdash; {effect}
        </dt>
        <dd className="mt-0.5 text-[11px] leading-snug text-rate-ink/70">{text}</dd>
      </div>
    </div>
  );
}
