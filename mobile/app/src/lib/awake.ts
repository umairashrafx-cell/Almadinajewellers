import { useEffect } from "react";

/**
 * Keeping the phone's screen on while somebody watches the world's prices.
 *
 * The International tab is a board people sit and watch -- gold ticking over,
 * the dollar moving -- and a phone that dims and locks after thirty seconds
 * makes them tap it awake again and again. The shop asked for the screen to
 * stay on for as long as somebody is on that tab, and only then: the moment
 * they go back to Local, or anywhere else, the phone's own timeout applies
 * again.
 *
 * On Android the plugin sets FLAG_KEEP_SCREEN_ON on the app's window. That
 * flag only counts while the window is in front, so pressing home or locking
 * the phone by hand still works exactly as it always did, and nothing has to
 * be released for the app sitting in the background. It needs no permission.
 * In a browser -- the preview -- the plugin uses the Screen Wake Lock API
 * where the browser has it, and does nothing where it does not.
 */

/**
 * The keep-awake plugin, inside a plain object.
 *
 * A Capacitor plugin is a Proxy that turns every property read into a native
 * call, `then` among them. Returned bare from an async function it is resolved
 * as a thenable, Android answers `"KeepAwake.then()" is not implemented`, and
 * the lookup rejects after this function has returned. A plain object is not
 * thenable, so the plugin travels in one. See lib/review.ts for the history.
 */
async function awakePlugin() {
  const { KeepAwake } = await import("@capacitor-community/keep-awake");
  return { plugin: KeepAwake };
}

/**
 * The calls, one after another.
 *
 * Opening the tab asks for the screen to stay on and leaving it asks for it
 * to sleep, and both are asynchronous. Somebody who taps International and
 * straight back to Local must not have the "stay on" land after the "sleep"
 * and leave the flag set with nobody watching, so every call waits for the
 * one before it. A call that fails does not stop the ones after it.
 */
let queue: Promise<unknown> = Promise.resolve();

function inTurn<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * Asks for the screen to stay on. True when it now will; false where the
 * platform cannot do it, which is never worth an error on a rate screen.
 */
export function keepScreenOn(): Promise<boolean> {
  return inTurn(async () => {
    try {
      const { plugin } = await awakePlugin();
      const { isSupported } = await plugin.isSupported();
      if (!isSupported) return false;
      await plugin.keepAwake();
      return true;
    } catch {
      return false;
    }
  });
}

/** Hands the screen back to the phone's own timeout. */
export function letScreenSleep(): Promise<void> {
  return inTurn(async () => {
    try {
      const { plugin } = await awakePlugin();
      const { isSupported } = await plugin.isSupported();
      if (isSupported) await plugin.allowSleep();
    } catch {
      // Nothing to undo: if the flag could not be cleared it could not have been set.
    }
  });
}

/** Keeps the screen on for as long as the component using this is on screen. */
export function useKeepScreenOn(): void {
  useEffect(() => {
    void keepScreenOn();
    return () => void letScreenSleep();
  }, []);
}
