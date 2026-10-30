import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { onNotificationTap, refreshRegistration } from "@/lib/push";

/**
 * The two things rate alerts need on every page, not just the one that offers
 * them: somewhere for a tapped notification to land, and a fresh token.
 *
 * Renders nothing, and in a browser it does nothing — the module behind it is
 * only imported once the app has said it is the app. It sits in the root so a
 * notification tapped while the app was closed is still caught, whichever page
 * the app happens to open on.
 */
export function PushBridge() {
  const router = useRouter();

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    void onNotificationTap((path) => {
      void router.navigate({ to: path });
    }).then((remove) => {
      if (cancelled) remove();
      else stop = remove;
    });

    // Not on the tap path: this is the launch doing its housekeeping.
    void refreshRegistration();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [router]);

  return null;
}
