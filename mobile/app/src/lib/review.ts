/**
 * Asking for a Play review, once, from somebody who has come back for the rate.
 *
 * The rate is why people keep this app, so a customer who has checked it on
 * three separate occasions is one who has found it useful — and that is who
 * Play's own guidance says to ask: after somebody has had the value, never on
 * first launch and never in the middle of something. Asked on the third
 * check; if that ask did not get through (no Play Store on the phone, no
 * connection), once more on the fourth. Then never again from this side,
 * whatever happened. Play keeps its own quota on top of this and may show
 * nothing at all; the API is designed not to say whether it did.
 *
 * A "check" is the rate screen showing a board for a few seconds — long
 * enough to have read the figure — and counts at most once an hour. Tapping between tabs to compare the board with the
 * calculator is one look at the rate, not four, and must not be what earns
 * somebody a prompt.
 *
 * The count lives in this origin's localStorage, like the settings beside it
 * (lib/settings.ts): it is for the bundled screens alone, and the website half
 * of the app never asks for a review.
 */
import { Capacitor } from "@capacitor/core";

/** The check that first asks. */
export const ASK_AT_CHECK = 3;

/** How many times the app will ever ask: the third check, and the fourth if that failed. */
export const MAX_ASKS = 2;

/** Checks closer together than this are one check. */
export const CHECK_GAP_MS = 60 * 60 * 1000;

export const REVIEW_KEY = "amj:review";

export type ReviewState = {
  /** Separate occasions the rate has been checked. */
  checks: number;
  /** When the last one was counted, in ms since the epoch. */
  lastCheckAt: number | undefined;
  /** Times the app has asked Play to show the review card. */
  asks: number;
  /** True once Play has run the flow, or the app has used up its asks. */
  done: boolean;
};

export const FRESH: ReviewState = { checks: 0, lastCheckAt: undefined, asks: 0, done: false };

function count(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

/**
 * Whatever was stored, as a state this build understands. Anything unreadable
 * starts the count again rather than throwing, which at worst delays a prompt.
 */
export function readReviewState(raw: string | null | undefined): ReviewState {
  if (!raw) return FRESH;

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return FRESH;
  }
  if (typeof stored !== "object" || stored === null) return FRESH;

  const fields = stored as Record<string, unknown>;
  const at = fields["lastCheckAt"];
  return {
    checks: count(fields["checks"]),
    lastCheckAt: typeof at === "number" && Number.isFinite(at) ? at : undefined,
    asks: count(fields["asks"]),
    done: fields["done"] === true,
  };
}

/**
 * One more look at the rate — or the same look, if the last was within the hour.
 *
 * A clock that has gone backwards (a phone correcting itself) counts as a new
 * check rather than freezing the count until it catches up; the same choice
 * recheck.ts makes.
 */
export function countCheck(state: ReviewState, now: number): ReviewState {
  if (state.done) return state;

  const last = state.lastCheckAt;
  const sameLook = last !== undefined && now >= last && now - last < CHECK_GAP_MS;
  if (sameLook) return state;

  return { ...state, checks: state.checks + 1, lastCheckAt: now };
}

/** Whether this check is the one to ask on: the third, or the fourth after a failed third. */
export function shouldAsk(state: ReviewState): boolean {
  return !state.done && state.asks < MAX_ASKS && state.checks >= ASK_AT_CHECK + state.asks;
}

/** The state after an ask, whichever way it went. */
export function afterAsk(state: ReviewState, shown: boolean): ReviewState {
  const asks = state.asks + 1;
  return { ...state, asks, done: shown || asks >= MAX_ASKS };
}

// ---------------------------------------------------------------------------
// The store and the plugin
// ---------------------------------------------------------------------------

export function loadReviewState(): ReviewState {
  try {
    return readReviewState(localStorage.getItem(REVIEW_KEY));
  } catch {
    return FRESH;
  }
}

export function saveReviewState(state: ReviewState): void {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(state));
  } catch {
    // Storage turned off: the count starts again next launch, and nobody is asked twice in one.
  }
}

/**
 * The review plugin, inside a plain object.
 *
 * A Capacitor plugin is a Proxy that turns every property read into a call to
 * a native method of that name, `then` among them. Returned bare from an async
 * function, it is resolved as a thenable: the promise machinery reads `.then`,
 * Android answers `"InAppReview.then()" is not implemented on android`, and
 * the lookup rejects — after this function has returned, where no try/catch in
 * it can see. That is the bug src/lib/push.ts and src/lib/wishlist.ts each
 * shipped once, and it never shows in a browser, because nothing gets this far
 * outside the app. A plain object is not thenable, so the plugin travels in one.
 */
async function reviewPlugin() {
  const { InAppReview } = await import("@capacitor-community/in-app-review");
  return { plugin: InAppReview };
}

/**
 * Asks Play for its review card. True when Play ran the flow — which is not
 * the same as the card having been shown, and nothing can tell the two apart.
 * False outside the app, and whenever Play could not be reached.
 */
export async function requestReview(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const { plugin } = await reviewPlugin();
    await plugin.requestReview();
    return true;
  } catch {
    return false;
  }
}

/**
 * Counts a check of the rate and, if this is the one, asks.
 *
 * Called by ReviewPrompt once the board has been on screen for a few seconds,
 * so the card lands over a rate somebody has just read and not over a screen
 * they were only passing through.
 */
export async function rateChecked(now: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const counted = countCheck(loadReviewState(), now);
  saveReviewState(counted);
  if (!shouldAsk(counted)) return;

  // Saved before the ask, so a crash or a killed app mid-flow cannot ask again for the same check.
  saveReviewState(afterAsk(counted, false));
  const shown = await requestReview();
  saveReviewState(afterAsk(counted, shown));
}
