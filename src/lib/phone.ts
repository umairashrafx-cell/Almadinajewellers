/**
 * The phone number a customer types, and the WhatsApp number it becomes.
 *
 * These two belong together and used to live apart: the pattern was copied into
 * orders.ts, enquiries.ts and custom-orders.ts, and the normaliser sat in
 * admin.ts. That is how they came to disagree. The forms accept a number with
 * no prefix at all — deliberately, because somebody typing their own mobile
 * into a Pakistani shop's website leaves the zero off as often as not — and the
 * normaliser handed that straight back untouched, producing a wa.me link to
 * whatever country the bare digits happened to name.
 *
 * It has never sent anyone anywhere wrong, because a person in the admin panel
 * reads the link before pressing send. An automated sender removes that person,
 * and one customer's order details arriving at a stranger's phone is worse than
 * no message at all. So the invariant the test file pins down is the one that
 * matters: every number PHONE accepts, whatsappNumber turns into a Pakistani
 * number. Not most of them.
 */

/**
 * Pakistani mobile and landline formats, with or without the +92 / 0 prefix.
 *
 * Forgiving on purpose, and the matching CHECK constraints in the database say
 * the same thing — the anon key means anyone can post at the API directly, so
 * the rule has to exist in both places. What is NOT optional is that whatever
 * this accepts, whatsappNumber() can place.
 */
export const PHONE = /^(\+?92|0)?[\s-]?\d{2,4}[\s-]?\d{6,8}$/;

/**
 * The digits of a submitted number, in the form wa.me and the WhatsApp API
 * both want: country code first, no plus, no spaces.
 */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("92")) {
    /*
     * Country code present. Somebody who writes both the code and the trunk
     * zero — "+92 0321 7759959" — means the same number as somebody who writes
     * either one, so the zero comes off. Left in, it makes a thirteen-digit
     * number that WhatsApp cannot deliver to.
     */
    const national = digits.slice(2);
    return `92${national.startsWith("0") ? national.slice(1) : national}`;
  }

  // The trunk form, which is what most people type.
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;

  /*
   * Neither prefix. The forms allow this and should: it is a national number
   * with the trunk zero left off, and Pakistan is the only country this shop's
   * forms claim to serve, so the code is the documented rule rather than a
   * guess. A national number here cannot itself begin with 92 — no Pakistani
   * mobile prefix or area code does — so the branch above cannot swallow one.
   */
  return `92${digits}`;
}
