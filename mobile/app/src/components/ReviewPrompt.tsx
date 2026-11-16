import { useEffect } from "react";

import { rateChecked } from "../lib/review";

/** How long the board has to be on screen before the look counts. */
const READ_FOR_MS = 4000;

/**
 * Counts a check of the rate, and on the third asks for a Play review.
 *
 * Renders nothing, like PushHousekeeping and ShortcutHousekeeping beside it,
 * and sits in the shell for the same reason: the rate screen is reached from
 * the tab bar, the front door, a long press on the icon and a tapped
 * notification, and every one of those passes through the shell's `view`.
 *
 * The timer is what makes it a check. Leaving the screen inside it — a thumb
 * passing through on the way to the calculator — cancels it and counts
 * nothing. Everything about whether to ask, and the plugin itself, is in
 * lib/review.ts.
 */
export function ReviewPrompt({ onRates, hasBoard }: { onRates: boolean; hasBoard: boolean }) {
  useEffect(() => {
    if (!onRates || !hasBoard) return;

    const timer = window.setTimeout(() => {
      void rateChecked(Date.now()).catch(() => {
        // Never worth an error on screen: at worst nobody is asked for a review.
      });
    }, READ_FOR_MS);

    return () => window.clearTimeout(timer);
  }, [onRates, hasBoard]);

  return null;
}
