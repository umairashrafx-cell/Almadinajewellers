/**
 * The one refusal worth repeating to the customer.
 *
 * Every form on this site answers a failure the same way: a short apology and
 * WhatsApp. That is right for a failure nobody can explain — a dropped
 * connection, a database that did not answer — where "please try again" is
 * both true and all there is to say.
 *
 * The throttle is the exception. It knows exactly what happened and when it
 * will stop, and telling somebody to try again when the next few minutes are
 * certain to fail is worse than saying nothing. So where a submission is
 * refused by the throttle, the server's own sentence is shown instead.
 *
 * See the request_throttle migration for where that sentence is written.
 */

type SupabaseError = { message?: string | null; code?: string | null } | null | undefined;

/**
 * The throttle's message, or undefined when this was some other failure.
 *
 * `code` is the real test; it is set deliberately on the server for this. The
 * sentence is checked too, and only as a second line — if PostgREST ever stops
 * carrying the code through, the fallback keeps the customer informed rather
 * than silently reverting them to "try again".
 */
export function throttleMessage(error: SupabaseError): string | undefined {
  if (!error) return undefined;

  const message = error.message ?? "";
  if (error.code === "throttled" || message.startsWith("Too many requests")) {
    return (
      message || "Too many requests just now. Please wait a few minutes, or send it on WhatsApp."
    );
  }

  return undefined;
}
