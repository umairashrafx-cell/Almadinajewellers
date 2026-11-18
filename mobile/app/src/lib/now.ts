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
