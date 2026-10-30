import { RefreshCcw, WifiOff } from "lucide-react";

/**
 * The line that admits the figures came off the phone, not the network.
 *
 * Shown only when that is true. A rate board is worth nothing if the person
 * reading it cannot tell whether it is this morning's, so the app never
 * presents kept figures as live ones — and never makes a fuss about live ones
 * either, which is why this renders nothing in the ordinary case.
 */
export function Kept({
  stale,
  loading,
  refresh,
}: {
  stale: boolean;
  loading: boolean;
  refresh: () => void;
}) {
  if (!stale) return null;

  return (
    <div className="mb-5 flex items-center justify-between gap-3 border border-gold/30 bg-champagne/25 px-4 py-3">
      <p className="flex items-center gap-2 text-xs leading-relaxed text-ink">
        <WifiOff className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
        <span>
          Kept on this phone.{" "}
          {loading ? "Looking for today's…" : "Connect to check for today's figures."}
        </span>
      </p>

      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        aria-label="Check again"
        className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/40 text-gold-deep transition-colors hover:bg-gold hover:text-primary disabled:opacity-50"
      >
        <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
      </button>
    </div>
  );
}
