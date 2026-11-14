import { describe, expect, test } from "vitest";

import { SHORTCUT_VIEWS, shortcutView } from "./shortcuts";
import { VIEWS } from "./views";

describe("the screen a long-press shortcut opens", () => {
  test("is each of the four the shortcuts name", () => {
    for (const view of ["rate", "calculator", "pieces", "saved"]) {
      expect(shortcutView(view)).toBe(view);
    }
  });

  test("is always a screen the app has", () => {
    // A shortcut naming a screen that was removed would be a dead button on
    // the home screen. This fails first.
    for (const view of SHORTCUT_VIEWS) expect(VIEWS).toContain(view);
  });

  test("is nothing for anything else", () => {
    // Other apps can send the activity any extra they like.
    for (const junk of [null, undefined, "", "home", "settings", "RATE", 7, {}, ["rate"]]) {
      expect(shortcutView(junk)).toBeNull();
    }
  });
});
