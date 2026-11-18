import { Landmark } from "lucide-react";

import { formatRange, meetingOdds, nextMeeting, wholePercents } from "@/lib/fed";
import type { FedOdds, FedSnapshot, FomcMeeting } from "@/lib/fed";
import { dayName, pktDay, pktTime, timeUntil } from "@/lib/pkt";
import { cn } from "@/lib/utils";

import { useNow } from "../lib/now";

/**
 * The American interest rate, and what the market expects the Fed to do with
 * it next.
 *
 * A jeweller's customer does not need a rates terminal, but the Fed's decision
 * is the biggest scheduled thing that happens to gold, and "is the Fed cutting
 * next month?" is a question the shop gets asked. So: the rate as it stands,
 * the date of the next decision in Pakistan time, and the market's own odds —
 * worked out from Fed Funds futures, never typed in.
 *
 * Each part is drawn only when it is real. Without the server's Fed figures
 * (an older deployment, or a source that would not answer) the card still
 * shows the next meeting, which comes from the Fed's published calendar.
 */
export function FedOutlook({ fed }: { fed: FedSnapshot | undefined }) {
  const now = useNow();
  const meeting = nextMeeting(now);
  const target = fed?.target;
  const odds = meeting && fed ? meetingOdds(meeting, fed, now) : null;

  if (!meeting && !target) return null;

  return (
    <section className="card-lift mt-7 rounded-xl border border-rate-gold/35 bg-white/70 p-4">
      <header className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rate-gold/60 bg-gradient-to-br from-white to-rate-ivory"
          aria-hidden
        >
          <Landmark className="h-5 w-5 text-rate-gold-deep" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
            US Federal Reserve
          </p>
          <h3 className="font-display text-[20px] leading-tight font-semibold text-rate-emerald">
            Interest rate
          </h3>
        </div>
      </header>

      {target ? (
        <div className="mt-3">
          <p className="nums text-[28px] leading-none font-bold tracking-tight text-rate-emerald">
            {formatRange(target.from, target.to)}
          </p>
          <p className="mt-1.5 text-[11px] text-rate-ink/70">
            Fed funds target range
            {typeof target.effr === "number" ? (
              <>
                {" "}
                · effective <span className="nums font-semibold">{target.effr.toFixed(2)}%</span>
                {target.day ? <> on {dayName(target.day)}</> : null}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {meeting ? <Meeting meeting={meeting} now={now} /> : null}

      {odds && target ? <Odds odds={odds} /> : null}

      <p className="mt-3 border-t border-rate-gold/20 pt-3 text-[10.5px] leading-relaxed text-warmgrey">
        {target ? "Rate from the Federal Reserve Bank of New York. " : null}
        Meeting dates from the Fed&rsquo;s published calendar.
        {odds ? (
          <>
            {" "}
            Odds are the market&rsquo;s, worked out from CBOT 30-Day Fed Funds futures by the method
            CME&rsquo;s FedWatch uses. A cut usually helps gold and a hike usually weighs on it.
            This is the market&rsquo;s pricing, not our forecast or advice.
          </>
        ) : null}
      </p>
    </section>
  );
}

/** When the next decision lands, in Pakistan. */
function Meeting({ meeting, now }: { meeting: FomcMeeting; now: Date }) {
  const countdown = timeUntil(meeting.statementAt, now);
  const startDay = Number(meeting.start.slice(8, 10));
  const endName = dayName(meeting.end).split(" ");
  // "8–9 Dec": the meeting's own two days, as Washington has them.
  const span = `${startDay}–${endName[1]} ${endName[2]}`;

  return (
    <div className="mt-4 rounded-lg border border-rate-gold/30 bg-rate-gold/5 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
          Next decision
        </p>
        {countdown ? (
          <p className="nums text-[11px] font-semibold text-rate-emerald">{countdown}</p>
        ) : null}
      </div>
      <p className="nums mt-1 text-[15px] font-bold text-rate-emerald">
        {dayName(pktDay(meeting.statementAt))}, {pktTime(meeting.statementAt)}{" "}
        <span className="text-[11px] font-semibold text-rate-ink/60">PKT</span>
      </p>
      <p className="mt-0.5 text-[11px] text-rate-ink/65">
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
    <div className="mt-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-rate-gold-deep uppercase">
        Market odds for this meeting
      </p>

      <div
        className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-rate-gold/15"
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

      <dl className="mt-2.5 grid grid-cols-3 gap-2 text-center">
        {BUCKETS.map((bucket, index) => (
          <div
            key={bucket.key}
            className={cn(
              "rounded-lg border px-1 py-1.5",
              pct(index) === Math.max(...percents)
                ? "border-rate-gold/60 bg-white"
                : "border-rate-gold/20",
            )}
          >
            <dt className="text-[10px] font-semibold tracking-wide text-rate-ink/65 uppercase">
              {bucket.label}
            </dt>
            <dd className={cn("nums text-[17px] leading-tight font-bold", bucket.text)}>
              {pct(index)}%
            </dd>
          </div>
        ))}
      </dl>

      {likely ? (
        <p className="mt-2.5 text-[11px] leading-snug text-rate-ink/75">
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
