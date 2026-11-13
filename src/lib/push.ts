import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * What the shop may send this phone: the day's rate, a change to it, and word
 * that new pieces have arrived.
 *
 * It began as one notification — the morning the board is set — and that is
 * still what a customer gets who simply says yes on the rate screen. The app's
 * Settings screen is where the other two are chosen: being told every time the
 * board changes rather than once a day, and being told when the shop adds
 * pieces to the cases.
 *
 * This is website code that only ever runs inside the Android app. The app is
 * a Capacitor shell around these same pages (see mobile/README.md), so the
 * screen a customer taps is this one, and the bridge to Android sits behind a
 * dynamic import — a browser downloads none of it, and the server renders
 * nothing of it.
 *
 * The shop's side is supabase/functions/notify-enquiry, reached by the
 * triggers in 20261030090000_rate_alerts.sql and
 * 20261113120000_push_preferences.sql. The channel ids and the pages a tap
 * opens are agreed with that function; changing one means changing the other.
 */

/** Agreed with RATE_CHANNEL in the Edge Function. */
const RATE_CHANNEL = "rates";

/** Agreed with PIECES_CHANNEL in the Edge Function. */
const PIECES_CHANNEL = "pieces";

/**
 * The page a tapped notification is about. Agreed with RATE_PATH in that
 * same function, and exported because the app's own screens answer the tap
 * too — they have the board already, and going to the website to read the
 * same figures would be slower and would need a signal.
 */
export const RATE_ALERT_PATH = "/gold-rate-in-mandi-bahauddin-today";

/**
 * Where a new-pieces notification points. Agreed with PIECES_PATH in the Edge
 * Function. A page of the website, so a build of the app that has never heard
 * of this notification still opens somewhere sensible; the app's own screens
 * answer it with their catalogue instead.
 */
export const NEW_PIECES_PATH = "/new-arrivals";

/**
 * Remembered on the phone, so a screen knows what to show before asking.
 *
 * WANTED_KEY is the oldest of these and still means what it always did to a
 * build that knows nothing else: "yes" while the shop holds this phone's
 * token. What the token is subscribed to is PREFS_KEY, beside it.
 */
const WANTED_KEY = "amj:rate-alerts";
const TOKEN_KEY = "amj:push-token";
const PREFS_KEY = "amj:push-prefs";

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
 * How often the rate is announced to this phone.
 *
 * "daily" is the first publish of a day and nothing after it. "every" is that
 * and each later save that actually moves a gold figure — a correction, or a
 * rate that changed at noon. The words are the ones the database stores, in
 * push_devices.rate_alerts.
 */
export const RATE_ALERT_MODES = ["off", "daily", "every"] as const;
export type RateAlertMode = (typeof RATE_ALERT_MODES)[number];

export type PushPrefs = {
  rate: RateAlertMode;
  /** Told when the shop adds pieces — at most once a day. */
  pieces: boolean;
};

/** A phone the shop sends nothing to. */
export const NO_PUSH: PushPrefs = { rate: "off", pieces: false };

/**
 * What was stored, as preferences this build understands.
 *
 * `legacyWanted` is WANTED_KEY, which is all a build before the Settings
 * screen ever wrote: somebody who turned rate alerts on with that build has no
 * preferences stored at all, and what they agreed to was one a day. Read that
 * way, an update changes nothing about what they are sent.
 */
export function readPushPrefs(stored: string | null, legacyWanted: string | null): PushPrefs {
  if (stored) {
    try {
      const fields = JSON.parse(stored) as { rate?: unknown; pieces?: unknown } | null;
      if (typeof fields === "object" && fields !== null) {
        const rate = (RATE_ALERT_MODES as readonly unknown[]).includes(fields.rate)
          ? (fields.rate as RateAlertMode)
          : "off";
        return { rate, pieces: fields.pieces === true };
      }
    } catch {
      // Not JSON. Whatever the older flag says is the best answer left.
    }
  }

  return legacyWanted === "yes" ? { rate: "daily", pieces: false } : NO_PUSH;
}

/** Whether there is anything at all for the shop to send. */
function wantsAnything(prefs: PushPrefs): boolean {
  return prefs.rate !== "off" || prefs.pieces;
}

/**
 * The push functions are newer than the generated
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
  /*
   * Caught here, not just inside appStore(). The lookup's own try/catch cannot
   * see a rejection raised while its promise is being resolved — which is what
   * the proxy above did — and a throw on this line would carry straight past
   * the localStorage fallback below, storing the value nowhere at all. null is
   * the answer this function is written to handle.
   */
  const prefs = await appStore().catch(() => null);

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
  // As in remember(): a rejection here would skip the only other place the
  // value could be, and answer nothing instead of answering localStorage.
  const prefs = await appStore().catch(() => null);
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

export type PushStatus = {
  /**
   * "ready" is every case where a choice can be made: permission granted, or
   * not yet asked for. It says nothing about what is switched on — that is
   * `prefs`.
   */
  state: "unsupported" | "blocked" | "ready";
  /** What the shop is sending this phone right now. */
  prefs: PushPrefs;
};

/** What this phone has stored about its own subscription. */
async function storedPrefs(): Promise<PushPrefs> {
  return readPushPrefs(await recalled(PREFS_KEY), await recalled(WANTED_KEY));
}

/**
 * Where this phone stands, as far as it can tell without asking anyone.
 *
 * The Settings screen's question. The rate card asks the narrower one below.
 */
export async function pushStatus(): Promise<PushStatus> {
  if (!(await inApp())) return { state: "unsupported", prefs: NO_PUSH };

  const { plugin: PushNotifications } = await pushNotifications();

  let receive: string;
  try {
    ({ receive } = await PushNotifications.checkPermissions());
  } catch (error) {
    // A phone with no Play Services, or a WebView that cannot reach the
    // plugin. Nothing can be offered, so nothing is: the card stays away
    // rather than showing a button that would fail.
    console.error("push: could not read the notification permission", error);
    return { state: "unsupported", prefs: NO_PUSH };
  }

  // Turned off in Android's settings after being turned on here. The phone's
  // answer wins over ours: whatever was chosen, nothing is arriving.
  if (receive === "denied") return { state: "blocked", prefs: NO_PUSH };
  if (receive !== "granted") return { state: "ready", prefs: NO_PUSH };

  return { state: "ready", prefs: await storedPrefs() };
}

/** The rate card's question: is this phone being told the rate? */
export async function alertState(): Promise<AlertState> {
  const { state, prefs } = await pushStatus();
  if (state !== "ready") return state;
  return prefs.rate === "off" ? "off" : "on";
}

/**
 * The channels a notification can arrive on.
 *
 * A channel has to exist before a message for it arrives, or Android drops the
 * notification for belonging to a channel it does not know. Made here, which
 * is always before the shop can have been told this phone wants them. Creating
 * one that already exists changes nothing, so this is safe to repeat.
 *
 * Two channels rather than one, because Android's own settings list them: a
 * customer who wants the rate but has had enough of new pieces can silence one
 * there without losing the other, even if they never find this app's screen.
 */
async function ensureChannels(prefs: PushPrefs): Promise<void> {
  const { plugin: PushNotifications } = await pushNotifications();

  try {
    if (prefs.rate !== "off") {
      await PushNotifications.createChannel({
        id: RATE_CHANNEL,
        name: "Gold rate",
        description: "The day's rates when the shop publishes them, and changes if you ask.",
        importance: 4,
        visibility: 1,
      });
    }

    if (prefs.pieces) {
      await PushNotifications.createChannel({
        id: PIECES_CHANNEL,
        name: "New pieces",
        description: "When the shop adds new pieces. Never more than once a day.",
        // One step quieter than the rate: news, not a figure somebody is
        // waiting on. It arrives without a heads-up banner.
        importance: 3,
        visibility: 1,
      });
    }
  } catch (error) {
    console.error("push: could not create a notification channel", error);
  }
}

/**
 * Tells the shop what this phone wants.
 *
 * set_push_preferences came with the Settings screen. The website is deployed
 * the moment a change is merged and the database is migrated by hand, so there
 * can be a stretch where this code is live and that function is not — and the
 * rate card on the website's own page has to go on working through it. So the
 * one thing a phone could always ask for, the daily rate and nothing else,
 * falls back to the function that has always granted it. Anything newer than
 * that honestly fails until the database can store it.
 */
async function sendPreferences(token: string, prefs: PushPrefs): Promise<boolean> {
  const { error } = await untyped.rpc("set_push_preferences", {
    p_token: token,
    p_platform: "android",
    p_rate_alerts: prefs.rate,
    p_new_pieces: prefs.pieces,
  });

  if (!error) return true;

  // PGRST202: PostgREST could not find a function of that name and shape.
  const missing = (error as { code?: string }).code === "PGRST202";
  if (missing && prefs.rate === "daily" && !prefs.pieces) {
    const { error: older } = await untyped.rpc("register_push_device", {
      p_token: token,
      p_platform: "android",
    });
    if (!older) return true;
    console.error("push: could not register this device", older);
    return false;
  }

  console.error("push: could not save the notification preferences", error);
  return false;
}

/**
 * Stops everything: the shop forgets this phone.
 *
 * The token is deleted on the shop's side, which is what actually stops the
 * notifications, and then on the phone's. Android keeps the permission —
 * nothing here can hand that back — but nothing will be sent to it again.
 */
async function forgetThisPhone(): Promise<boolean> {
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
    return false;
  }

  const { error } = await untyped.rpc("forget_push_device", { p_token: token });
  if (error) {
    console.error("push: could not forget this device", error);
    return false;
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
  await remember(PREFS_KEY, null);
  return true;
}

export type PushChange = PushStatus & {
  /**
   * Whether what was asked for is now what the shop holds. When it is false,
   * `prefs` is what is still in force — the screen shows that, and says the
   * change did not take.
   */
  saved: boolean;
};

/**
 * Sets what the shop sends, asking Android for permission as it goes.
 *
 * Only ever called from a tap, never on launch: Android 13 and later show the
 * system prompt once, and an app that spends it before saying what the
 * notifications are for gets a no it cannot ask again about.
 */
export async function setPushPreferences(next: PushPrefs): Promise<PushChange> {
  if (!(await inApp())) return { state: "unsupported", prefs: NO_PUSH, saved: false };

  const before = await storedPrefs();

  if (!wantsAnything(next)) {
    const forgotten = await forgetThisPhone();
    return { state: "ready", prefs: forgotten ? NO_PUSH : before, saved: forgotten };
  }

  const { plugin: PushNotifications } = await pushNotifications();

  let { receive } = await PushNotifications.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    ({ receive } = await PushNotifications.requestPermissions());
  }
  if (receive !== "granted") return { state: "blocked", prefs: NO_PUSH, saved: false };

  await ensureChannels(next);

  const token = await registrationToken();
  if (!token) return { state: "ready", prefs: before, saved: false };

  if (!(await sendPreferences(token, next))) {
    return { state: "ready", prefs: before, saved: false };
  }

  await remember(TOKEN_KEY, token);
  await remember(WANTED_KEY, "yes");
  await remember(PREFS_KEY, JSON.stringify(next));
  return { state: "ready", prefs: next, saved: true };
}

/**
 * The rate card's yes.
 *
 * One notification a day, unless this phone had already chosen to be told of
 * every change — a card that says "tell me the day's rate" must not quietly
 * turn that down. Whatever was chosen about new pieces is left as it was.
 */
export async function enableRateAlerts(): Promise<AlertState> {
  if (!(await inApp())) return "unsupported";

  const before = await storedPrefs();
  const { state, prefs } = await setPushPreferences({
    rate: before.rate === "off" ? "daily" : before.rate,
    pieces: before.pieces,
  });

  if (state !== "ready") return state;
  return prefs.rate === "off" ? "off" : "on";
}

/**
 * The rate card's no.
 *
 * Turns the rate off and leaves new pieces as they were. With nothing left to
 * send, the shop forgets the phone altogether.
 */
export async function disableRateAlerts(): Promise<AlertState> {
  if (!(await inApp())) return "unsupported";

  const before = await storedPrefs();
  const { state, prefs } = await setPushPreferences({ rate: "off", pieces: before.pieces });

  if (state !== "ready") return state;
  return prefs.rate === "off" ? "off" : "on";
}

/**
 * Says hello again on each launch, while anything is switched on.
 *
 * Firebase reissues tokens — after a restore to a new phone, or when it simply
 * decides to — and the old one stops delivering without telling anybody. The
 * upsert on the shop's side is what makes the new one replace it.
 *
 * It registers every time, not only when the token has changed. A row can go
 * missing for reasons this phone cannot see — a restored backup, a notifier
 * that pruned it wrongly — and a phone that only spoke up when its token
 * changed would wait for ever, showing a screen that says it is subscribed.
 * The preferences travel with it for the same reason: a row made again from
 * nothing would otherwise come back as the daily rate alone, whatever this
 * phone had asked for. The upsert costs one call a launch and moves
 * last_seen_at either way.
 */
export async function refreshRegistration(): Promise<void> {
  if ((await recalled(WANTED_KEY)) !== "yes") return;

  const { state, prefs } = await pushStatus();
  if (state !== "ready" || !wantsAnything(prefs)) return;

  const token = await registrationToken();
  if (!token) return;

  if (await sendPreferences(token, prefs)) await remember(TOKEN_KEY, token);
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
