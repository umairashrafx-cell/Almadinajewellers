/**
 * Whether what is on screen has had time to go out of date.
 *
 * The app fetched once, when it was opened, and then held whatever it got.
 * A phone opened at nine in the morning and picked up again at six in the
 * evening showed the morning's board as the live one: nothing had failed, so
 * nothing said the figures were old, and the shop had published twice since.
 *
 * So the screens ask again when the app comes back. Not every time — walking
 * out of the app to read a WhatsApp message and straight back in is not a
 * reason to spend a request — which is the one decision this file makes.
 */

/** Long enough that flicking between apps costs nothing, short enough to matter. */
export const RECHECK_AFTER_MS = 60_000;

export function shouldRecheck(
  /** When the last successful fetch landed, or undefined if none has. */
  freshAt: number | undefined,
  now: number,
  afterMs: number = RECHECK_AFTER_MS,
): boolean {
  // Nothing has ever arrived from the network. Always worth asking.
  if (freshAt === undefined) return true;

  // A clock that moved backwards — a phone correcting itself, a timezone
  // crossed — must not freeze the cache until it catches up. Anything stamped
  // in the future is treated as due rather than as freshly fetched.
  if (freshAt > now) return true;

  return now - freshAt >= afterMs;
}
