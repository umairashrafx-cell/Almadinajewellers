import { describe, expect, test } from "vitest";

import { APPOINTMENT_SLOTS, appointmentDay, appointmentSchema, localDate } from "@/lib/enquiries";

/**
 * Asking to come in on a particular day.
 *
 * Three things here can send a customer on a bus journey for nothing, and all
 * three are tested: a day in the past getting through, a Friday getting
 * through, and a date read in the wrong timezone turning a Saturday into one.
 *
 * The last is the subtle one. `new Date("2026-11-14")` is parsed as UTC, and
 * Pakistan is five hours ahead of it, so in a browser in Mandi Bahauddin that
 * value is the evening of the 13th — a Friday. Reading the day that way would
 * refuse Saturdays and accept Fridays, which is exactly backwards.
 */
const DAY = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd for a date, in local terms, as an <input type="date"> gives it. */
function iso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The next date after today whose weekday is `want`. */
function next(want: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  do {
    date.setTime(date.getTime() + DAY);
  } while (date.getDay() !== want);
  return date;
}

const GOOD = {
  name: "Ayesha",
  phone: "0321-7759959",
  slot: APPOINTMENT_SLOTS[0],
};

function problemFor(field: string, values: Record<string, unknown>): string | undefined {
  const parsed = appointmentSchema.safeParse(values);
  if (parsed.success) return undefined;
  return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("localDate", () => {
  test("reads a date field as the day it says, not the day before", () => {
    // The whole point: field by field, in local terms, never through UTC.
    const date = localDate("2026-11-14");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(10);
    expect(date?.getDate()).toBe(14);
  });

  test("is nothing for anything that is not a date field", () => {
    for (const junk of ["", "tomorrow", "14-11-2026", "2026-13-01", "2026-11-1"]) {
      expect(localDate(junk)).toBeNull();
    }
  });
});

describe("an appointment request", () => {
  test("takes a day the shop is open", () => {
    // Saturday: the first day of the shop's week.
    const parsed = appointmentSchema.safeParse({ ...GOOD, day: iso(next(6)) });
    expect(parsed.success).toBe(true);
  });

  test("refuses Friday, which is the shop's closed day", () => {
    expect(problemFor("day", { ...GOOD, day: iso(next(5)) })).toBe("The shop is closed on Friday.");
  });

  test("refuses a day that has already gone", () => {
    const yesterday = new Date(Date.now() - DAY);
    expect(problemFor("day", { ...GOOD, day: iso(yesterday) })).toBe(
      "Please choose today or a day after it.",
    );
  });

  test("asks for a day and a time before anything else can be wrong with them", () => {
    expect(problemFor("day", { ...GOOD, day: "" })).toBe("Please choose a day.");
    expect(problemFor("slot", { ...GOOD, day: iso(next(6)), slot: "" })).toBe(
      "Please choose a time.",
    );
  });

  test("still checks the name and the number", () => {
    const day = iso(next(6));
    expect(problemFor("name", { ...GOOD, day, name: "A" })).toBe("Please enter your name.");
    expect(problemFor("phone", { ...GOOD, day, phone: "12" })).toBe(
      "Please enter a phone number we can reach you on.",
    );
  });

  test("keeps every window inside what the enquiries table will store", () => {
    // preferred_time is capped at 40 characters by a CHECK constraint, and a
    // row refused by the database is a customer told to try again for no
    // reason they can see.
    for (const slot of APPOINTMENT_SLOTS) {
      expect(slot.length).toBeLessThanOrEqual(40);
    }
  });
});

describe("appointmentDay", () => {
  test("says the day back the way the shop would on the phone", () => {
    expect(appointmentDay("2026-11-14")).toBe("Saturday 14 November");
  });

  test("hands back anything it cannot read rather than inventing a date", () => {
    expect(appointmentDay("not a day")).toBe("not a day");
  });
});
