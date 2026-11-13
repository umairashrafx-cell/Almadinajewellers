import { useSyncExternalStore } from "react";

/**
 * What a customer has chosen about the app itself: how it looks, and which
 * money its figures are read in.
 *
 * Two choices and no more. Which notifications to send is a third, but it is
 * not kept here — it is an agreement with the shop's server about a device
 * token, and lives with the rest of that agreement in src/lib/push.ts.
 *
 * localStorage, where everything else the app keeps goes through Capacitor
 * Preferences, and for the opposite of the reason given in cache.ts. That
 * file's point is that the app is two origins and Preferences is the one place
 * both can see. Nothing here is for the other origin: the website's pages have
 * one appearance and price in one currency, whatever is set on this screen.
 * These two settings belong to the bundled screens alone, which are a single
 * origin — and localStorage can be read before the first paint, where
 * Preferences answers through the bridge a few frames later. For a theme that
 * difference is a white flash on every launch of a dark app.
 */

export const THEMES = ["light", "dark", "phone"] as const;
export type Theme = (typeof THEMES)[number];

export const CURRENCIES = ["PKR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Settings = { theme: Theme; currency: Currency };

/**
 * What an app that has never been asked looks like.
 *
 * Light, not the phone's own setting: this app was light for everybody before
 * the choice existed, and an update that turned it dark for half its customers
 * overnight — the half whose phones happen to be — would be a change nobody
 * asked for. Rupees, because that is what the shop prices and bills in.
 */
export const DEFAULTS: Settings = { theme: "light", currency: "PKR" };

export const SETTINGS_KEY = "amj:settings";

/**
 * The theme on its own, as a bare word.
 *
 * Read by the few lines of script at the top of index.html, which run before
 * any of this module has loaded and have to stay small enough to read at a
 * glance. Written here whenever the settings are, so the two cannot disagree.
 */
export const THEME_KEY = "amj:theme";

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Whatever was stored, as settings this build understands.
 *
 * An installed app is upgraded over what the last build wrote, and may one day
 * be downgraded over what a later one did. Each field is read on its own and
 * anything unrecognised falls back to its default, so a theme this build has
 * never heard of costs somebody their theme and nothing else.
 */
export function readSettings(raw: string | null | undefined): Settings {
  if (!raw) return DEFAULTS;

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return DEFAULTS;
  }

  if (typeof stored !== "object" || stored === null) return DEFAULTS;
  const fields = stored as { theme?: unknown; currency?: unknown };

  return {
    theme: oneOf(THEMES, fields.theme, DEFAULTS.theme),
    currency: oneOf(CURRENCIES, fields.currency, DEFAULTS.currency),
  };
}

/** Whether the screens should be drawn dark, given what the phone itself says. */
export function wantsDark(theme: Theme, phoneIsDark: boolean): boolean {
  return theme === "dark" || (theme === "phone" && phoneIsDark);
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

function load(): Settings {
  try {
    return readSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    // Storage turned off. The app still works; it just cannot remember.
    return DEFAULTS;
  }
}

let current: Settings | undefined;
const listeners = new Set<() => void>();

function snapshot(): Settings {
  current ??= load();
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function phoneIsDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/**
 * Puts the theme on the page.
 *
 * One class on the root element, which is all the stylesheet looks for — see
 * the dark block in index.css. The same class the script in index.html sets
 * before React exists, so this is a correction on launch far more often than
 * it is a change.
 */
export function applyTheme(theme: Theme = snapshot().theme): void {
  document.documentElement.classList.toggle("dark", wantsDark(theme, phoneIsDark()));
}

/**
 * Follows the phone, for as long as that is what was asked for.
 *
 * Android switches to dark at sunset on a phone set to, and an app left open
 * across that moment should go with it rather than wait to be closed. Called
 * once, at launch; the listener reads the setting each time rather than
 * capturing it, so it changes nothing while the theme is a fixed one.
 */
export function followPhoneTheme(): void {
  try {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => applyTheme());
  } catch {
    // A WebView old enough to lack this simply keeps the theme it launched in.
  }
}

export function updateSettings(patch: Partial<Settings>): void {
  const next = { ...snapshot(), ...patch };
  current = next;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    localStorage.setItem(THEME_KEY, next.theme);
  } catch {
    // Not kept, but still in force until the app is closed.
  }

  applyTheme(next.theme);
  listeners.forEach((listener) => listener());
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
