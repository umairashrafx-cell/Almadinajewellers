import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { alertState, disableRateAlerts, enableRateAlerts, type AlertState } from "@/lib/push";

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
 */
export function RateAlerts() {
  const [state, setState] = useState<AlertState>("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void alertState()
      .then((next) => {
        if (!cancelled) setState(next);
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
      setState(await run());
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
            {state === "on" ? "You will be told each morning" : "Know the rate before you ask"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-warmgrey">
            {state === "on" ? (
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
