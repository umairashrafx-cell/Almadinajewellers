import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * Rate alerts: one notification the morning the shop sets the board.
 *
 * This is website code that only ever runs inside the Android app. The app is
 * a Capacitor shell around these same pages (see mobile/README.md), so the
 * screen a customer taps is this one, and the bridge to Android sits behind a
 * dynamic import — a browser downloads none of it, and the server renders
 * nothing of it.
 *
 * The shop's side is supabase/functions/notify-enquiry, reached by the trigger
 * in 20261030090000_rate_alerts.sql. The channel id and the page a tap opens
 * are agreed with that function; changing one means changing the other.
 */

/** Agreed with RATE_CHANNEL in the Edge Function. */
const CHANNEL_ID = "rates";

/**
 * The page a tapped notification is about. Agreed with RATE_PATH in that
 * same function, and exported because the app's own screens answer the tap
 * too — they have the board already, and going to the website to read the
 * same figures would be slower and would need a signal.
 */
export const RATE_ALERT_PATH = "/gold-rate-in-mandi-bahauddin-today";

/** Remembered on the phone, so the card knows what to show before asking. */
const WANTED_KEY = "amj:rate-alerts";
const TOKEN_KEY = "amj:push-token";

export type AlertState =
  /** Not in the app. The card renders nothing at all. */
  | "unsupported"
  /** In the app, not subscribed. */
  | "off"
  /** Subscribed: the shop has this phone's token. */
  | "on"
  /** Notifications are refused for the whole app; only Settings can undo it. */
  | "blocked";

/**
 * register_push_device and forget_push_device are newer than the generated
 * Database type, which the platform regenerates and which must not be
 * hand-edited. Calling them through an untyped handle keeps the rest of this
 * module typed, the same arrangement rates.ts uses for gold_rates.updated_at.
 */
const untyped = supabase as unknown as SupabaseClient;

/**
 * Where the phone keeps what it knows about its own subscription.
 *
 * localStorage is the obvious place, and was the first one, until what that
 * means here became clear: the app is two halves — its own screens, bundled
 * and served from https://localhost, and the website at
 * www.almadinajeweller.com — and those are separate origins with separate
 * localStorage. Alerts turned on from the app's rate tab were invisible to the
 * website's pages and to the launch housekeeping that runs on them, which is
 * how a reissued token could quietly end a subscription the card still called
 * on.
 *
 * Capacitor Preferences belongs to the app rather than to an origin, so both
 * halves read one answer. The same reasoning as mobile/app/src/lib/cache.ts.
 * In a browser there is no plugin and no second half, and localStorage is
 * still exactly right.
 */
async function appStore() {
  if (!(await inApp())) return null;

  try {
    const { Preferences } = await import("@capacitor/preferences");

    /*
     * Wrapped, for the reason written out at the same wrapper in wishlist.ts.
     *
     * A Capacitor plugin is a Proxy that answers every property read with a
     * method of that name, `then` among them. Returning one from an async
     * function therefore hands a thenable to the promise machinery, which
     * calls it, and Android answers
     *
     *     "Preferences.then()" is not implemented on android
     *
     * so this lookup rejected. Both readers below catch and carry on with
     * localStorage, which is per-origin — so the token and the wanted flag
     * went back to being invisible to the app's other half, which is the one
     * thing Preferences was chosen to prevent. A plain object is not
     * thenable, so the plugin travels inside one.
     */
    return { plugin: Preferences };
  } catch {
    return null;
  }
}

function localRecalled(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function remember(key: string, value: string | null): Promise<void> {
  const prefs = await appStore();

  if (prefs) {
    try {
      if (value === null) await prefs.plugin.remove({ key });
      else await prefs.plugin.set({ key, value });
      return;
    } catch {
      // Fall through. This origin's own storage is better than nowhere.
    }
  }

  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode, or storage turned off. The subscription still stands on
    // the shop's side; this phone just has to ask again what it already knows.
  }
}

async function recalled(key: string): Promise<string | null> {
  const prefs = await appStore();
  if (!prefs) return localRecalled(key);

  try {
    const { value } = await prefs.plugin.get({ key });
    if (value !== null) return value;
  } catch {
    // Unreadable. The lines below are the only other place it could be.
  }

  /*
   * Written by a build that kept this in localStorage, on whichever half of
   * the app happened to be open at the time. Moved across on the way past, so
   * somebody who turned alerts on before this change is not shown a card
   * offering them what they already have.
   */
  const old = localRecalled(key);
  if (old !== null) await remember(key, old);
  return old;
}

/** True only inside the app. Everything below returns early without it. */
export async function inApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * The push plugin, inside a plain object.
 *
 * The same hazard as appStore() above, and the same wrapper. This proxy was
 * returned bare from an async function too, so every caller below rejected
 * with "PushNotifications.then()" is not implemented on android — which is to
 * say that on a phone the rate alert card could not read its state, turn
 * alerts on, or turn them off. A browser never reached it: inApp() answers
 * false first, which is why nothing here showed up in a test or a preview.
 */
async function pushNotifications() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return { plugin: PushNotifications };
}

/**
 * The token Firebase gives this phone.
 *
 * register() answers through an event rather than a promise, so the listener
 * goes on first and the whole thing is raced against a timeout: a phone with
 * no Play Services, or no connection, would otherwise leave the button
 * spinning for ever.
 */
async function registrationToken(): Promise<string | null> {
  const { plugin: PushNotifications } = await pushNotifications();

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handles.forEach((handle) => void handle.remove().catch(() => {}));
      resolve(token);
    };

    const timer = setTimeout(() => finish(null), 15_000);

    void (async () => {
      handles.push(
        await PushNotifications.addListener("registration", (token) => finish(token.value)),
      );
      handles.push(
        await PushNotifications.addListener("registrationError", (error) => {
          console.error("push: registration failed", error);
          finish(null);
        }),
      );

      try {
        await PushNotifications.register();
      } catch (error) {
        console.error("push: register() failed", error);
        finish(null);
      }
    })();
  });
}

/** Where this phone stands, as far as it can tell without asking anyone. */
export async function alertState(): Promise<AlertState> {
  if (!(await inApp())) return "unsupported";

  const { plugin: PushNotifications } = await pushNotifications();

  let receive: string;
  try {
    ({ receive } = await PushNotifications.checkPermissions());
  } catch (error) {
    // A phone with no Play Services, or a WebView that cannot reach the
    // plugin. Nothing can be offered, so nothing is: the card stays away
    // rather than showing a button that would fail.
    console.error("push: could not read the notification permission", error);
    return "unsupported";
  }

  // Turned off in Android's settings after being turned on here. The phone's
  // answer wins over ours.
  if (receive === "denied") return "blocked";
  if (receive !== "granted") return "off";

  return (await recalled(WANTED_KEY)) === "yes" ? "on" : "off";
}

/**
 * Turns them on, asking Android for permission as it goes.
 *
 * Only ever called from a tap on the card, never on launch: Android 13 and
 * later show the system prompt once, and an app that spends it before saying
 * what the notifications are for gets a no it cannot ask again about.
 */
export async function enableRateAlerts(): Promise<AlertState> {
  if (!(await inApp())) return "unsupported";

  const { plugin: PushNotifications } = await pushNotifications();

  let { receive } = await PushNotifications.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    ({ receive } = await PushNotifications.requestPermissions());
  }
  if (receive !== "granted") return "blocked";

  /*
   * The channel has to exist before a message arrives, or Android drops the
   * notification for belonging to a channel it does not know. Made here, which
   * is always before the shop can have this phone's token.
   */
  try {
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Gold rate",
      description: "One notification each morning, when the day's rates are published.",
      importance: 4,
      visibility: 1,
    });
  } catch (error) {
    console.error("push: could not create the rate channel", error);
  }

  const token = await registrationToken();
  if (!token) return "off";

  const { error } = await untyped.rpc("register_push_device", {
    p_token: token,
    p_platform: "android",
  });

  if (error) {
    console.error("push: could not register this device", error);
    return "off";
  }

  await remember(TOKEN_KEY, token);
  await remember(WANTED_KEY, "yes");
  return "on";
}

/**
 * Turns them off.
 *
 * The token is deleted on the shop's side, which is what actually stops the
 * notifications, and then on the phone's. Android keeps the permission —
 * nothing here can hand that back — but nothing will be sent to it again.
 */
export async function disableRateAlerts(): Promise<AlertState> {
  if (!(await inApp())) return "unsupported";

  /*
   * The stored token is the usual answer, but it is not the one that matters:
   * what stops the notifications is the row on the shop's side. If this phone
   * has forgotten its token — storage cleared, or a write that silently failed
   * when it was turned on — asking Firebase again gives back the same one, and
   * it can still be deleted. Saying "off" while the row lives on would leave
   * somebody with notifications they have no way to stop.
   */
  const token = (await recalled(TOKEN_KEY)) ?? (await registrationToken());

  if (!token) {
    console.error("push: no token to forget, so the subscription is still live");
    return "on";
  }

  const { error } = await untyped.rpc("forget_push_device", { p_token: token });
  if (error) {
    console.error("push: could not forget this device", error);
    return "on";
  }

  try {
    const { plugin: PushNotifications } = await pushNotifications();
    await PushNotifications.unregister();
  } catch (error) {
    // The row is gone, so nothing can be sent either way.
    console.error("push: unregister failed", error);
  }

  await remember(TOKEN_KEY, null);
  await remember(WANTED_KEY, null);
  return "off";
}

/**
 * Says hello again on each launch, while alerts are on.
 *
 * Firebase reissues tokens — after a restore to a new phone, or when it simply
 * decides to — and the old one stops delivering without telling anybody. The
 * upsert behind register_push_device is what makes the new one replace it.
 *
 * It registers every time, not only when the token has changed. A row can go
 * missing for reasons this phone cannot see — a restored backup, a notifier
 * that pruned it wrongly — and a phone that only spoke up when its token
 * changed would wait for ever, showing a card that says it is subscribed. The
 * upsert costs one call a launch and moves last_seen_at either way.
 */
export async function refreshRegistration(): Promise<void> {
  if ((await recalled(WANTED_KEY)) !== "yes") return;
  if ((await alertState()) !== "on") return;

  const token = await registrationToken();
  if (!token) return;

  const { error } = await untyped.rpc("register_push_device", {
    p_token: token,
    p_platform: "android",
  });

  if (!error) await remember(TOKEN_KEY, token);
}

/**
 * Opens the page a notification points at when it is tapped.
 *
 * The payload carries a path rather than a URL, so a notification can never
 * send the app somewhere that is not this website, however it was built.
 */
export async function onNotificationTap(open: (path: string) => void): Promise<() => void> {
  if (!(await inApp())) return () => {};

  const { plugin: PushNotifications } = await pushNotifications();
  const handle = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const path = action.notification.data?.path;
      if (typeof path === "string" && path.startsWith("/")) open(path);
    },
  );

  return () => void handle.remove().catch(() => {});
}
