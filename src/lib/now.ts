import { useEffect, useState } from "react";

/**
 * The time, re-read every `ms`.
 *
 * For anything on screen that turns over with the clock rather than with the
 * data — a countdown, a release that has just come due — so it moves on its
 * own even when the figures behind it have not changed.
 */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(timer);
  }, [ms]);

  return now;
}

/**
 * The same, but null until the browser has it.
 *
 * For the website, where the first render happens on a server and is then
 * replayed in the reader's browser a moment later. The clock has moved in
 * between, so anything drawn from it — "in 45 min", a release that has just
 * gone from due to out — comes out as one string in the HTML and a different
 * one on hydration. React calls that a mismatch, and it is a real one: the two
 * renders disagree.
 *
 * Returning null for the server's render settles it. A countdown is for
 * somebody sitting in front of the page, not for a crawler, so the parts that
 * depend on the clock simply wait for the browser while everything that comes
 * from the snapshot — the names, the times, the figures — is in the HTML from
 * the start.
 */
export function useMountedNow(ms = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(timer);
  }, [ms]);

  return now;
}
