import { useEffect, useRef } from "react";

import {
  NEW_PIECES_PATH,
  RATE_ALERT_PATH,
  onNotificationTap,
  refreshRegistration,
} from "@/lib/push";

import { openShop } from "../lib/shop";

/**
 * What rate alerts need on every launch, done where the app actually opens.
 *
 * The website half of the app does this in PushBridge, which hangs off the
 * site's router — and the app does not open on the website. It opens here, on
 * the bundled screens, which is where a customer who installed this to read
 * the board will spend all of their time. So for them the housekeeping was
 * never done at all: Firebase reissues a token whenever it likes, the shop
 * went on sending to the old one, and the morning notification stopped with
 * nothing anywhere to say that it had.
 *
 * Renders nothing, and does nothing outside the app — both calls behind it
 * return as soon as they find they are not in it.
 */
export function PushHousekeeping({
  showRates,
  showPieces,
}: {
  showRates: () => void;
  showPieces: () => void;
}) {
  /*
   * Held in a ref, and read only when a notification is actually tapped.
   *
   * The listener goes on once, at launch, and has to stay on: registering it
   * again whenever the screen changes would drop a tap that arrived in
   * between. But showing the board is a move from wherever somebody is now,
   * so the handler cannot be the one that was passed at launch — it has to be
   * the current one.
   */
  const show = useRef({ showRates, showPieces });
  show.current = { showRates, showPieces };

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    void onNotificationTap((path) => {
      /*
       * The rate — the morning's board or a change to it — and the app has a
       * screen for exactly that which opens with no connection. Leaving for
       * the website to read the same figures would be slower and would need a
       * signal, so the tap just shows the board.
       *
       * New pieces are answered the same way and for the same reason: the
       * app's own catalogue, which asks the shop for what is new as it opens
       * and shows what it last had if the answer does not come.
       *
       * Anything else the shop may send one day is a page on the website, and
       * goes there.
       */
      if (path === RATE_ALERT_PATH) show.current.showRates();
      else if (path === NEW_PIECES_PATH) show.current.showPieces();
      else openShop(path);
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
  }, []);

  return null;
}
