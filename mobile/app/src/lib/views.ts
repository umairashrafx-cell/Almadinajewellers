/**
 * The app's screens, and which one a history entry belongs to.
 *
 * Android's back button is the WebView's history: Capacitor goes back a page
 * if it can and leaves the app if it cannot. An app whose screens are React
 * state and nothing else therefore has exactly one back press in it — the one
 * that closes the app — however deep somebody has gone. So each change of
 * screen pushes an entry that names the screen, and going back is a matter of
 * reading the entry landed on rather than keeping a stack of our own.
 *
 * Still not a router. A router decides what to render from a URL; this decides
 * nothing. It is six strings and a comparison, kept in their own file so the
 * back-button arithmetic can be tested without a DOM.
 */
export const VIEWS = ["home", "rate", "pieces", "calculator", "store", "saved"] as const;

export type View = (typeof VIEWS)[number];

/**
 * Where the app opens, and where an entry with nothing to say lands.
 *
 * The board until the app had a front door; now the front door. Somebody who
 * taps the icon is as likely to be looking for a piece as for a figure, and a
 * screen that offers both is a truer answer to "open the shop" than either
 * one of them on its own. The board is one tap away and is still the first
 * thing on this screen.
 */
export const HOME: View = "home";

function isView(value: unknown): value is View {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value);
}

/**
 * The screen a history entry is for.
 *
 * An entry with no screen named is the one the WebView started with — the
 * launch, which is home. So is an entry naming a screen this build does not
 * have: an installed app can be opened on history that an older version
 * wrote, and home is a better answer there than a blank page.
 */
export function viewFromHistory(state: unknown): View {
  const named = (state as { view?: unknown } | null | undefined)?.view;
  return isView(named) ? named : HOME;
}
