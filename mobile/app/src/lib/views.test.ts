import { describe, expect, test } from "vitest";

import { HOME, VIEWS, viewFromHistory } from "./views";

/**
 * The back button, as arithmetic.
 *
 * Android's back press lands the app on a history entry and raises popstate
 * with whatever was stored on it. Everything the app then does follows from
 * reading that one value, so this is the whole of the back button that can be
 * got wrong.
 */
describe("the screen a history entry is for", () => {
  test("is home for the entry the app launched on", () => {
    // The WebView's first entry carries no state of ours. Back from here
    // leaves the app, which is what back from the board should do.
    expect(viewFromHistory(null)).toBe(HOME);
    expect(viewFromHistory(undefined)).toBe(HOME);
    expect(HOME).toBe("rate");
  });

  test("is the screen the entry names", () => {
    for (const view of VIEWS) {
      expect(viewFromHistory({ view })).toBe(view);
    }
  });

  test("reads a piece entry as the pieces screen", () => {
    // The shape PiecesScreen pushes when a piece is opened over the grid. Back
    // onto it closes the piece and must leave the grid where it was, not jump
    // the customer to the board.
    expect(viewFromHistory({ view: "pieces", piece: "AMJ-001" })).toBe("pieces");
  });

  test("is home for a screen this build does not have", () => {
    // An installed app can be opened on history an older version wrote. The
    // board is a better answer than a blank page.
    expect(viewFromHistory({ view: "offers" })).toBe(HOME);
  });

  test("is home for anything that is not an entry of ours", () => {
    for (const junk of [{}, { view: null }, { view: 2 }, "rate", 7, [], { View: "store" }]) {
      expect(viewFromHistory(junk)).toBe(HOME);
    }
  });

  test("covers every screen the app can show", () => {
    // The tab bar has four, and the heart in the header opens the fifth. A
    // screen missing from here is one the back button cannot return to.
    expect([...VIEWS]).toEqual(["rate", "pieces", "calculator", "store", "saved"]);
  });
});
