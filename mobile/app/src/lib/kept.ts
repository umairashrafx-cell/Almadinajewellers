/**
 * How old the figures on screen are, in words.
 *
 * "Kept on this phone" told somebody the board was not live. It did not tell
 * them whether that meant ten minutes or three days, which is the whole of
 * what they needed to know: a rate ten minutes old is the rate, and one three
 * days old is a number to ring the shop about. The strip says both now.
 *
 * Deliberately coarse. A jeweller's customer wants "this morning" or "two days
 * ago", not a duration to the second, and rounding down is the honest
 * direction to round — it never claims the figures are fresher than they are.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now", "12 minutes ago", "3 hours ago", "2 days ago".
 *
 * A stamp from the future — a phone whose clock has been corrected backwards,
 * a timezone crossed — reads as "just now" rather than as a negative count.
 * The same decision recheck.ts makes about a clock that moved, for the same
 * reason: an impossible figure must not become a frightening one.
 */
export function agoPhrase(savedAt: number, now: number): string {
  if (!Number.isFinite(savedAt) || !Number.isFinite(now)) return "just now";

  const elapsed = now - savedAt;
  if (elapsed < MINUTE) return "just now";

  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(elapsed / DAY);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * The sentence the offline strip shows.
 *
 * Without a stamp — an app upgraded over a cache written before this existed —
 * it says the shorter true thing rather than guessing an age.
 */
export function keptNote(savedAt: number | undefined, now: number): string {
  if (savedAt === undefined) return "Kept on this phone.";
  return `Kept on this phone, from ${agoPhrase(savedAt, now)}.`;
}
