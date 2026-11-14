import type { View } from "./views";

/**
 * The screens a long press on the app's icon can open.
 *
 * Agreed with res/xml/shortcuts.xml and with the list in AppShortcutsPlugin,
 * which already refuses anything else. Checked again here because this is
 * the side that moves the screen, and a name it does not know is a reason to
 * stay where it is rather than to guess.
 */
export const SHORTCUT_VIEWS = [
  "rate",
  "calculator",
  "pieces",
  "saved",
] as const satisfies readonly View[];

export type ShortcutView = (typeof SHORTCUT_VIEWS)[number];

/** The screen a shortcut asked for, or null for anything that is not one. */
export function shortcutView(value: unknown): ShortcutView | null {
  return typeof value === "string" && (SHORTCUT_VIEWS as readonly string[]).includes(value)
    ? (value as ShortcutView)
    : null;
}
