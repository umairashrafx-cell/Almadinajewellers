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
 * nothing. It is four strings and a comparison, kept in their own file so the
 * back-button arithmetic can be tested without a DOM.
 */
export const VIEWS = ["rate", "pieces", "calculator", "store", "saved"] as const;

export type View = (typeof VIEWS)[number];

/** Where the app opens, and where an entry with nothing to say lands. */
export const HOME: View = "rate";

function isView(value: unknown): value is View {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value);
}

/**
 * The screen a history entry is for.
 *
 * An entry with no screen named is the one the WebView started with — the
 * launch, which is home. So is an entry naming a screen this build does not
 * have: an installed app can be opened on history that an older version
 * wrote, and the board is a better answer there than a blank page.
 */
export function viewFromHistory(state: unknown): View {
  const named = (state as { view?: unknown } | null | undefined)?.view;
  return isView(named) ? named : HOME;
}
