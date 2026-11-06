import { RefreshCcw, WifiOff } from "lucide-react";

import { keptNote } from "../lib/kept";

/**
 * The line that admits the figures came off the phone, not the network.
 *
 * Shown only when that is true. A rate board is worth nothing if the person
 * reading it cannot tell whether it is this morning's, so the app never
 * presents kept figures as live ones — and never makes a fuss about live ones
 * either, which is why this renders nothing in the ordinary case.
 *
 * Two states, not one, because the old single state cried wolf. Every launch
 * paints from the phone first and then goes to the network, so `stale` is true
 * for as long as that request is in flight — which meant a phone with five
 * bars opened to a struck-through wifi symbol and an offline warning for the
 * second or so before today's board landed. Nothing had failed. Now the
 * in-flight second says it is checking, in the quiet voice that belongs to a
 * thing that is going fine, and the alarm is kept for the attempt that
 * actually came back empty-handed.
 *
 * The failed state carries the age as well as the fact. "Kept on this phone"
 * told somebody the figures were not live without telling them whether that
 * meant ten minutes or three days, and that is the whole of the difference
 * between reading the number and ringing the shop about it.
 */
export function Kept({
  stale,
  loading,
  savedAt,
  refresh,
}: {
  stale: boolean;
  loading: boolean;
  /** When what is on screen was fetched, if the phone knows. */
  savedAt?: number | undefined;
  refresh: () => void;
}) {
  if (!stale) return null;

  if (loading) {
    return (
      <p className="mb-5 flex items-center gap-2 text-[11px] tracking-widest text-warmgrey uppercase">
        <RefreshCcw className="h-3.5 w-3.5 shrink-0 animate-spin text-gold-deep" aria-hidden />
        Checking for today&rsquo;s figures
      </p>
    );
  }

  return (
    <div className="mb-5 flex items-center justify-between gap-3 border border-gold/30 bg-champagne/25 px-4 py-3">
      <p className="flex items-center gap-2 text-xs leading-relaxed text-ink">
        <WifiOff className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
        <span>{keptNote(savedAt, Date.now())} Connect to check for today&rsquo;s figures.</span>
      </p>

      {/*
        44px rather than 36. It is the one control on an offline screen, found
        with a thumb at the top of a phone, and Android asks for 48dp.
      */}
      <button
        type="button"
        onClick={refresh}
        aria-label="Check again"
        className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 text-gold-deep transition-colors hover:bg-gold hover:text-primary"
      >
        <RefreshCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
