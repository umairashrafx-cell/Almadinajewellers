import { Landmark } from "lucide-react";

import { InfoNote } from "@/components/ui/InfoNote";

import { formatRange, meetingOdds, nextMeeting, wholePercents } from "@/lib/fed";
import type { FedOdds, FedSnapshot, FomcMeeting } from "@/lib/fed";
import { useMountedNow } from "@/lib/now";
import { dayName, pktDay, pktTime, timeUntil } from "@/lib/pkt";
import { cn } from "@/lib/utils";

/**
 * The American interest rate, and what the market expects the Fed to do with
 * it next.
 *
 * A jeweller's customer does not need a rates terminal, but the Fed's decision
 * is the biggest scheduled thing that happens to gold, and "is the Fed cutting
 * next month?" is a question the shop gets asked across the counter. So: the
 * rate as it stands, the date of the next decision in Pakistan time, and the
 * market's own odds — worked out from Fed Funds futures, never typed in.
 *
 * Each part is drawn only when it is real. Without the server's Fed figures
 * (an older deployment of the edge function, or a source that would not
 * answer) the card still shows the next meeting, which comes from the Fed's
 * published calendar and needs nothing fetched at all.
 */
export function InternationalFed({ fed }: { fed: FedSnapshot | undefined }) {
  const now = useMountedNow();
  /*
   * The meeting is chosen against a date either way: the next FOMC is weeks
   * out, so the server and the browser pick the same one and it is in the
   * HTML. Only the countdown beside it waits for the browser.
   */
  const meeting = nextMeeting(now ?? new Date());
  const target = fed?.target;
  const odds = meeting && fed ? meetingOdds(meeting, fed, now ?? new Date()) : null;

  if (!meeting && !target) return null;

  return (
    <div className="mt-16">
      <div className="rounded-xl border border-rate-gold/35 bg-white/70 p-5 shadow-[0_1px_2px_rgb(22_61_52/0.04)] sm:p-7">
        <header className="flex items-start gap-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-rate-gold/60 bg-gradient-to-br from-white to-rate-ivory"
            aria-hidden
          >
            <Landmark className="h-6 w-6 text-rate-gold-deep" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-rate-gold-deep uppercase">
              US Federal Reserve
            </p>
            <h3 className="mt-1 font-display text-[26px] leading-tight font-light tracking-wide text-rate-emerald sm:text-3xl">
              Interest rate
            </h3>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            {target ? (
              <>
                <p className="nums text-4xl leading-none font-bold tracking-tight text-rate-emerald">
                  {formatRange(target.from, target.to)}
                </p>
                <p className="mt-2 text-sm text-rate-ink/70">
                  Fed funds target range
                  {typeof target.effr === "number" ? (
                    <>
                      {" "}
                      · effective{" "}
                      <span className="nums font-semibold">{target.effr.toFixed(2)}%</span>
                      {target.day ? <> on {dayName(target.day)}</> : null}
                    </>
                  ) : null}
                </p>
              </>
            ) : null}

            {meeting ? <Meeting meeting={meeting} now={now} /> : null}
          </div>

          {odds && target ? <Odds odds={odds} /> : null}
        </div>

        <InfoNote size="md" className="mt-6 border-t border-rate-gold/20 pt-3" label="Sources">
          {target ? "Rate from the Federal Reserve Bank of New York. " : null}
          Meeting dates from the Fed&rsquo;s published calendar.
          {odds ? (
            <>
              {" "}
              Odds are the market&rsquo;s, worked out from CBOT 30-Day Fed Funds futures by the
              method CME&rsquo;s FedWatch uses. A cut usually helps gold and a hike usually weighs
              on it. This is the market&rsquo;s pricing, not our forecast or advice.
            </>
          ) : null}
        </InfoNote>
      </div>
    </div>
  );
}

/** When the next decision lands, in Pakistan. */
function Meeting({ meeting, now }: { meeting: FomcMeeting; now: Date | null }) {
  const countdown = now ? timeUntil(meeting.statementAt, now) : null;
  const startDay = Number(meeting.start.slice(8, 10));
  const endName = dayName(meeting.end).split(" ");
  // "8–9 Dec": the meeting's own two days, as Washington has them.
  const span = `${startDay}–${endName[1]} ${endName[2]}`;

  return (
    <div className="mt-5 rounded-xl border border-rate-gold/30 bg-rate-gold/5 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
          Next decision
        </p>
        {countdown ? (
          <p className="nums text-xs font-semibold text-rate-emerald">{countdown}</p>
        ) : null}
      </div>
      <p className="nums mt-1.5 text-lg font-bold text-rate-emerald">
        {dayName(pktDay(meeting.statementAt))}, {pktTime(meeting.statementAt)}{" "}
        <span className="text-xs font-semibold text-rate-ink/60">PKT</span>
      </p>
      <p className="mt-1 text-xs text-rate-ink/65">
        FOMC meeting {span}
        {meeting.projections ? " · with the Fed's projections" : ""}
      </p>
    </div>
  );
}

const BUCKETS = [
  { key: "cut", label: "Cut", bar: "bg-success", text: "text-success" },
  { key: "hold", label: "Hold", bar: "bg-rate-gold", text: "text-rate-gold-deep" },
  { key: "hike", label: "Hike", bar: "bg-red-700", text: "text-red-700" },
] as const;

/** The market's odds, as one bar and three figures. */
function Odds({ odds }: { odds: FedOdds }) {
  const percents = wholePercents([odds.cut, odds.hold, odds.hike]);
  const pct = (index: number) => percents[index] ?? 0;
  const likely = odds.outcomes[0];
  const likelyPct = wholePercents(odds.outcomes.map((outcome) => outcome.probability))[0];

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
        Market odds for this meeting
      </p>

      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-rate-gold/15"
        role="img"
        aria-label={BUCKETS.map((b, i) => `${b.label} ${pct(i)}%`).join(", ")}
      >
        {BUCKETS.map((bucket, index) =>
          pct(index) > 0 ? (
            <span
              key={bucket.key}
              className={cn("h-full", bucket.bar)}
              style={{ width: `${pct(index)}%` }}
            />
          ) : null,
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {BUCKETS.map((bucket, index) => (
          <div
            key={bucket.key}
            className={cn(
              "rounded-xl border px-2 py-2",
              pct(index) === Math.max(...percents)
                ? "border-rate-gold/60 bg-white"
                : "border-rate-gold/20",
            )}
          >
            <dt className="text-[10px] font-semibold tracking-wide text-rate-ink/65 uppercase">
              {bucket.label}
            </dt>
            <dd className={cn("nums text-xl leading-tight font-bold", bucket.text)}>
              {pct(index)}%
            </dd>
          </div>
        ))}
      </dl>

      {likely ? (
        <p className="mt-3 text-xs leading-snug text-rate-ink/75">
          Most likely:{" "}
          <span className="nums font-semibold text-rate-emerald">
            {formatRange(likely.from, likely.to)}
          </span>{" "}
          ({likely.bp === 0 ? "no change" : `${likely.bp > 0 ? "+" : "−"}${Math.abs(likely.bp)} bp`}
          , {likelyPct}%)
        </p>
      ) : null}
    </div>
  );
}
