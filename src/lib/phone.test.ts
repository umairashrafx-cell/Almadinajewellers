import { describe, expect, it } from "vitest";

import { PHONE, whatsappNumber } from "@/lib/phone";

/**
 * The validator and the normaliser, tested as the pair they are.
 *
 * The bug this file exists for was not in either half on its own. The forms
 * accept a number with no +92 and no leading zero, and the normaliser used to
 * return exactly those digits, so a customer who left the zero off got a wa.me
 * link pointing at another country entirely. Nobody was ever sent there,
 * because a person reads the link before pressing send — but an order-status
 * sender would not.
 *
 * So the last test is the one that matters, and it is a property rather than an
 * example: whatever PHONE lets through, whatsappNumber has to place in
 * Pakistan. Adding a shape to the list below is how a future change to either
 * half gets checked against the other.
 */

/** Every shape the forms accept, with what it has to become. */
const ACCEPTED: ReadonlyArray<readonly [string, string]> = [
  // The four shapes actually sitting in the production tables.
  ["+923217759959", "923217759959"],
  ["03217759959", "923217759959"],
  ["+92 321 7759959", "923217759959"],

  // The same number, written the other ways people write it.
  ["923217759959", "923217759959"],
  ["0321-7759959", "923217759959"],
  ["0321 7759959", "923217759959"],

  // The hole. A national number with the trunk zero left off, which the forms
  // allow on purpose and which used to come back untouched.
  ["3217759959", "923217759959"],

  // The shop's own landline, and the form it is printed in on the site.
  ["0546502244", "92546502244"],
  ["054 6502244", "92546502244"],
  ["+92546502244", "92546502244"],

  // Both the country code and the trunk zero. One number, written twice over.
  ["+92 0321 7759959", "923217759959"],
];

describe("PHONE", () => {
  it.each(ACCEPTED.map(([input]) => input))("accepts %j", (input) => {
    expect(PHONE.test(input)).toBe(true);
  });

  it.each(["", "not a number", "0321 775 99 59 59 59", "+1 555 0100", "0321775995x"])(
    "rejects %j",
    (input) => {
      expect(PHONE.test(input)).toBe(false);
    },
  );
});

describe("whatsappNumber", () => {
  it.each(ACCEPTED)("turns %j into %j", (input, expected) => {
    expect(whatsappNumber(input)).toBe(expected);
  });

  it("drops the trunk zero rather than leaving a number nobody can call", () => {
    // Left in, this is thirteen digits and WhatsApp cannot deliver to it.
    expect(whatsappNumber("+92 0321 7759959")).not.toContain("920");
  });

  /**
   * The invariant. Not an example — the thing that was actually broken.
   */
  it("places every number the forms accept in Pakistan", () => {
    for (const [input] of ACCEPTED) {
      const placed = whatsappNumber(input);
      expect(placed, input).toMatch(/^92\d{8,12}$/);
    }
  });
});
