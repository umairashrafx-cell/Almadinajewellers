import { describe, expect, test } from "vitest";

import { summarisePieces, summariseRates } from "./index.ts";

/**
 * What a customer reads on their lock screen.
 *
 * The function around these is network and secrets, and is not run here. The
 * wording is plain functions over what a trigger posted, and it is the part a
 * customer sees — so it is the part worth pinning.
 */
describe("the rate notification", () => {
  const record = {
    rate_date: "2026-11-13",
    rates: [
      { karat: "22K", per_tola_pkr: 372000, per_gram_pkr: 31893 },
      { karat: "23.65K", per_tola_pkr: 406000, per_gram_pkr: 34809 },
      { karat: "24K", per_tola_pkr: 412000, per_gram_pkr: 35323 },
      { karat: "Silver", per_tola_pkr: 4200, per_gram_pkr: 360 },
    ],
  };

  test("quotes 24K and 22K per tola, in that order, and never the silver", () => {
    const { body } = summariseRates(record);
    expect(body).toBe("24K Rs. 412,000  ·  22K Rs. 372,000 per tola");
  });

  test("says it is the morning's board on the first publish", () => {
    expect(summariseRates(record).title).toBe("Today's gold rate is in");
  });

  test("says it is a change on a later save, with the same figures set out the same way", () => {
    const first = summariseRates(record);
    const changed = summariseRates(record, true);

    expect(changed.title).toBe("The gold rate has changed");
    expect(changed.body).toBe(first.body);
  });

  test("falls back to whatever gold was published when neither headline karat was", () => {
    const { body } = summariseRates({ rates: [{ karat: "23.65K", per_tola_pkr: 406000 }] });
    expect(body).toBe("23.65K Rs. 406,000 per tola");
  });

  test("invents no figure when none arrived", () => {
    expect(summariseRates({}).body).toBe("Tap to see the day's rates.");
    expect(summariseRates({ rates: [] }, true).body).toBe("Tap to see the new rates.");
  });
});

describe("the new-pieces notification", () => {
  test("names one piece and the collection the shop filed it under", () => {
    expect(summarisePieces({ count: 1, name: "Amna Polki Set", category: "Bridal Sets" })).toEqual({
      title: "New at Al-Madina Jewellers",
      body: "Amna Polki Set · Bridal Sets. Tap to see it.",
    });
  });

  test("names the first and counts the rest", () => {
    expect(summarisePieces({ count: 2, name: "Amna Polki Set" }).body).toBe(
      "Amna Polki Set and 1 more piece. Tap to see them.",
    );
    expect(
      summarisePieces({ count: 12, name: "Amna Polki Set", category: "Bridal Sets" }).body,
    ).toBe("Amna Polki Set and 11 more pieces. Tap to see them.");
  });

  test("leaves the collection out when there is none to name", () => {
    expect(summarisePieces({ count: 1, name: "Amna Polki Set", category: null }).body).toBe(
      "Amna Polki Set. Tap to see it.",
    );
  });

  test("says only that pieces arrived when it was not told which", () => {
    // No name is no description: nothing is made up to fill the line.
    for (const record of [{}, { count: 3 }, { name: "   " }, { name: null }]) {
      expect(summarisePieces(record).body).toBe("New pieces have arrived. Tap to see them.");
    }
  });
});
