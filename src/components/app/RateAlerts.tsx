import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import {
  disableRateAlerts,
  enableRateAlerts,
  pushStatus,
  type AlertState,
  type PushStatus,
} from "@/lib/push";

/**
 * Asks, inside the app, whether to send the day's rate.
 *
 * Renders nothing anywhere else. On the website this is a card offering
 * something the browser cannot do, and in a browser it would be a dead end —
 * so it waits until it knows it is in the app, which is only ever after the
 * page has mounted, and stays invisible until then.
 *
 * It is on the rate page on purpose. Someone reading today's figure is exactly
 * the person who would like tomorrow's without having to come and look, and
 * asking here means the reason is on the screen while Android's own permission
 * prompt is being answered.
 *
 * The card offers one thing, the morning's rate, and turns it on or off. The
 * app's Settings screen is where somebody chooses to be told of every change
 * instead — and once they have, this card has to stop promising "never more
 * than once a day", because for that phone it is no longer true. So it reads
 * which of the two is in force and says that one.
 */
export function RateAlerts() {
  const [state, setState] = useState<AlertState>("unsupported");
  /** Told of every change, not only the morning's. Chosen in the app's Settings. */
  const [every, setEvery] = useState(false);
  const [busy, setBusy] = useState(false);

  const show = ({ state: next, prefs }: PushStatus) => {
    setState(next !== "ready" ? next : prefs.rate === "off" ? "off" : "on");
    setEvery(prefs.rate === "every");
  };

  useEffect(() => {
    let cancelled = false;
    void pushStatus()
      .then((next) => {
        if (!cancelled) show(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "unsupported") return null;

  const act = (run: () => Promise<AlertState>) => async () => {
    setBusy(true);
    try {
      const next = await run();
      // Blocked is the phone's answer and there is nothing further to read.
      // Anything else, ask again: the answer also says which kind is on.
      if (next === "blocked") setState(next);
      else show(await pushStatus());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 border border-gold/35 bg-champagne/20 p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-light tracking-wide text-primary">
            {state !== "on"
              ? "Know the rate before you ask"
              : every
                ? "You will be told when the rate changes"
                : "You will be told each morning"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-warmgrey">
            {state === "on" && every ? (
              <>
                We send a notification the morning the board is set, and again whenever the shop
                changes a gold rate during the day. Nothing else — no offers. You can go back to
                once a day in the app's Settings.
              </>
            ) : state === "on" ? (
              <>
                We send one notification the morning the board is set, with the day's 24K and 22K
                rates on it. Nothing else — no offers, and never more than once a day.
              </>
            ) : state === "blocked" ? (
              <>
                Notifications are turned off for this app on your phone. Open Settings → Apps →
                Al-Madina Jewellers → Notifications to allow them, and then come back here.
              </>
            ) : (
              <>
                We will send you one notification the morning the shop sets the board, with the
                day's 24K and 22K rates on it. Nothing else — no offers, and never more than once a
                day. You can turn it off here whenever you like.
              </>
            )}
          </p>

          {state !== "blocked" && (
            <div className="mt-6">
              {state === "on" ? (
                <ActionButton variant="outline" disabled={busy} onClick={act(disableRateAlerts)}>
                  {busy ? "Just a moment" : "Turn off rate alerts"}
                </ActionButton>
              ) : (
                <ActionButton disabled={busy} onClick={act(enableRateAlerts)}>
                  {busy ? "Just a moment" : "Tell me the day's rate"}
                </ActionButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
