import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rate alerts, exercised against plugins that behave like the real ones.
 *
 * This file exists because of a bug that reached a device twice. Capacitor's
 * plugin objects are Proxies that turn any property read into a call to a
 * native method of that name, so returning one straight out of an `async`
 * function hands a thenable to the promise machinery: it probes the resolved
 * value for `.then`, Android answers that `Preferences.then()` is not
 * implemented, and the lookup rejects. Both of this module's plugin lookups
 * did exactly that.
 *
 * On a phone that took the whole feature down without a sound — `alertState()`
 * rejected, the card read "unsupported" and never rendered, so alerts could
 * not be turned on at all, and `refreshRegistration()` died as an unhandled
 * rejection at every launch. Nothing caught it: a browser answers `inApp()`
 * false before there is any proxy to touch, so every unit test and every
 * preview stayed green.
 *
 * So the mocks below are Proxies that throw on anything they do not implement,
 * like the real plugins, and the tests only use this module's exported
 * surface. A plain-object mock is silent about this entire class of bug, and
 * asserting on how the lookups wrap their plugin would pin the shape of the
 * fix rather than the behaviour that matters. Please don't simplify either.
 *
 * The keys are spelled out rather than imported: they are a contract with
 * whatever the app's other half reads, so a test that took them from the
 * source could not notice them changing.
 */
const WANTED_KEY = "amj:rate-alerts";

/** Whether the code under test believes it is inside the app. */
let native = false;

/** What Capacitor Preferences holds — the app's store, outside any origin. */
let preferences = new Map<string, string>();

/** What Android says when asked about the notification permission. */
let permission = "granted";

/**
 * The token Firebase hands this phone. The table's own check wants at least
 * sixty-four characters, and a real one is about a hundred and sixty.
 */
const TOKEN = "t".repeat(160);

/** Every call made to the shop, in order. */
const calls: Array<{ name: string; args: unknown }> = [];

/** Calls the shop refuses, by function name, and what it says when it does. */
const failing = new Map<string, { code: string; message: string }>();

/** The notification channels the code under test asked Android to make. */
const channels: string[] = [];

/** Whoever is waiting for Firebase to answer register(). */
let onRegistration: ((token: { value: string }) => void) | undefined;

/**
 * This origin's localStorage, which the tests run without.
 *
 * Only one of them needs it — the migration path that moves a flag written by
 * an older build into the shared store — but `remember()` falls back to it on
 * any failure, so every test needs it to exist rather than throw.
 */
function origin() {
  const map = new Map<string, string>();

  globalThis.localStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;

  return map;
}

/**
 * A plugin that answers only what it implements and throws otherwise, which is
 * what makes this file able to catch the bug it was written for.
 */
function asPlugin<T extends object>(implemented: T): T {
  return new Proxy(implemented, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      throw new Error(`"Plugin.${String(prop)}()" is not implemented on android`);
    },
  });
}

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: asPlugin({
    get: async ({ key }: { key: string }) => ({
      value: preferences.has(key) ? preferences.get(key) : null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      preferences.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      preferences.delete(key);
    },
  }),
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: asPlugin({
    checkPermissions: async () => ({ receive: permission }),
    requestPermissions: async () => ({ receive: permission }),
    createChannel: async ({ id }: { id: string }) => {
      channels.push(id);
    },
    // Firebase answers through the "registration" event, not the promise.
    register: async () => {
      onRegistration?.({ value: TOKEN });
    },
    unregister: async () => {},
    addListener: async (event: string, handler: (token: { value: string }) => void) => {
      if (event === "registration") onRegistration = handler;
      return { remove: async () => {} };
    },
  }),
}));

/** The shop, which records what it was asked and refuses what it is told to. */
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return { error: failing.get(name) ?? null };
    },
  },
}));

const {
  alertState,
  disableRateAlerts,
  enableRateAlerts,
  inApp,
  pushStatus,
  readPushPrefs,
  refreshRegistration,
  setPushPreferences,
} = await import("@/lib/push");

beforeEach(() => {
  native = false;
  preferences = new Map();
  permission = "granted";
  calls.length = 0;
  failing.clear();
  channels.length = 0;
  onRegistration = undefined;
  origin();
  // The module logs what it could not do, which is the behaviour under test
  // in half of these and noise in the test output.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the mocks", () => {
  it("throw on an unimplemented read, the way a real plugin does", async () => {
    const { Preferences } = await import("@capacitor/preferences");
    // The exact read the promise machinery performs, and the whole bug.
    expect(() => (Preferences as unknown as { then: unknown }).then).toThrow(/not implemented/);
  });
});

describe("outside the app", () => {
  it("is not in the app", async () => {
    await expect(inApp()).resolves.toBe(false);
  });

  it("offers nothing, and touches no plugin doing so", async () => {
    await expect(alertState()).resolves.toBe("unsupported");
  });
});

describe("inside the app", () => {
  beforeEach(() => {
    native = true;
  });

  /*
   * Each of these rejected before the fix, which is the point of them. None
   * asserts on how a lookup wraps its plugin — only that asking this module a
   * question gets an answer rather than a rejection.
   */

  it("reads the state as off when alerts have never been turned on", async () => {
    await expect(alertState()).resolves.toBe("off");
  });

  it("reads the state as on from the store the other half can see", async () => {
    preferences.set(WANTED_KEY, "yes");
    await expect(alertState()).resolves.toBe("on");
  });

  it("reports what the phone says when the permission was taken away", async () => {
    permission = "denied";
    preferences.set(WANTED_KEY, "yes");
    await expect(alertState()).resolves.toBe("blocked");
  });

  it("does its launch housekeeping without rejecting", async () => {
    // The caller is `void refreshRegistration()`, so a rejection here is an
    // unhandled one that no part of the app would ever report.
    await expect(refreshRegistration()).resolves.toBeUndefined();
  });

  it("carries a flag written by an older build across to the shared store", async () => {
    // The localStorage migration path in recalled(), which the proxy bug also
    // took out: it rejected before the fallback could be read.
    localStorage.setItem(WANTED_KEY, "yes");
    await expect(alertState()).resolves.toBe("on");
    expect(preferences.get(WANTED_KEY)).toBe("yes");
  });
});

/*
 * Everything below came with the Settings screen: the same token can now be
 * subscribed to more than the daily rate, and what it is subscribed to has to
 * survive an update, a failed save, and a database that has not yet been told
 * about any of it.
 */

describe("what a phone is subscribed to, read back from storage", () => {
  it("is nothing when nothing was ever stored", () => {
    expect(readPushPrefs(null, null)).toEqual({ rate: "off", pieces: false });
  });

  it("is the daily rate for somebody who said yes before there was a choice", () => {
    // A build before the Settings screen wrote only the flag. An update must
    // not change what those customers are sent.
    expect(readPushPrefs(null, "yes")).toEqual({ rate: "daily", pieces: false });
  });

  it("is what was stored, whatever the older flag says", () => {
    expect(readPushPrefs('{"rate":"every","pieces":true}', "yes")).toEqual({
      rate: "every",
      pieces: true,
    });
    expect(readPushPrefs('{"rate":"off","pieces":true}', "yes")).toEqual({
      rate: "off",
      pieces: true,
    });
  });

  it("never reads an unknown word as a subscription", () => {
    // A mode this build has not heard of must not become "send everything".
    expect(readPushPrefs('{"rate":"hourly","pieces":"yes"}', null)).toEqual({
      rate: "off",
      pieces: false,
    });
  });

  it("falls back to the flag when what was stored cannot be read", () => {
    expect(readPushPrefs("{", "yes")).toEqual({ rate: "daily", pieces: false });
    expect(readPushPrefs("null", null)).toEqual({ rate: "off", pieces: false });
  });
});

describe("choosing what to be told", () => {
  beforeEach(() => {
    native = true;
  });

  it("reports nothing switched on for a phone that has never been asked", async () => {
    await expect(pushStatus()).resolves.toEqual({
      state: "ready",
      prefs: { rate: "off", pieces: false },
    });
  });

  it("tells the shop, and then remembers", async () => {
    const result = await setPushPreferences({ rate: "every", pieces: true });

    expect(result).toEqual({ state: "ready", prefs: { rate: "every", pieces: true }, saved: true });
    expect(calls).toEqual([
      {
        name: "set_push_preferences",
        args: {
          p_token: TOKEN,
          p_platform: "android",
          p_rate_alerts: "every",
          p_new_pieces: true,
        },
      },
    ]);

    // Both halves of the app read the same answer afterwards.
    expect(preferences.get(WANTED_KEY)).toBe("yes");
    await expect(pushStatus()).resolves.toEqual({
      state: "ready",
      prefs: { rate: "every", pieces: true },
    });
    // And the rate card, which only asks about the rate, says on.
    await expect(alertState()).resolves.toBe("on");
  });

  it("makes a channel only for what was asked for", async () => {
    await setPushPreferences({ rate: "off", pieces: true });
    expect(channels).toEqual(["pieces"]);

    channels.length = 0;
    await setPushPreferences({ rate: "daily", pieces: false });
    expect(channels).toEqual(["rates"]);
  });

  it("keeps new pieces on when the rate card turns the rate off", async () => {
    await setPushPreferences({ rate: "daily", pieces: true });
    calls.length = 0;

    await expect(disableRateAlerts()).resolves.toBe("off");

    // Still a subscriber, so the shop is told the new choice, not to forget.
    expect(calls.map((call) => call.name)).toEqual(["set_push_preferences"]);
    expect(calls[0]?.args).toMatchObject({ p_rate_alerts: "off", p_new_pieces: true });
    await expect(pushStatus()).resolves.toMatchObject({ prefs: { rate: "off", pieces: true } });
  });

  it("has the shop forget the phone once nothing is left to send", async () => {
    await setPushPreferences({ rate: "daily", pieces: false });
    calls.length = 0;

    const result = await setPushPreferences({ rate: "off", pieces: false });

    expect(result).toEqual({ state: "ready", prefs: { rate: "off", pieces: false }, saved: true });
    expect(calls).toEqual([{ name: "forget_push_device", args: { p_token: TOKEN } }]);
    expect(preferences.has(WANTED_KEY)).toBe(false);
  });

  it("does not turn every-change back into daily when the rate card says yes", async () => {
    await setPushPreferences({ rate: "every", pieces: false });
    calls.length = 0;

    await expect(enableRateAlerts()).resolves.toBe("on");
    expect(calls[0]?.args).toMatchObject({ p_rate_alerts: "every" });
  });

  it("says so, and changes nothing, when the shop cannot be told", async () => {
    await setPushPreferences({ rate: "daily", pieces: false });
    failing.set("set_push_preferences", { code: "XX000", message: "boom" });

    const result = await setPushPreferences({ rate: "every", pieces: true });

    // What is still in force, not what was asked for.
    expect(result).toEqual({
      state: "ready",
      prefs: { rate: "daily", pieces: false },
      saved: false,
    });
    await expect(pushStatus()).resolves.toMatchObject({ prefs: { rate: "daily", pieces: false } });
  });

  it("reports blocked, and asks the shop nothing, when Android says no", async () => {
    permission = "denied";

    const result = await setPushPreferences({ rate: "daily", pieces: false });

    expect(result).toEqual({
      state: "blocked",
      prefs: { rate: "off", pieces: false },
      saved: false,
    });
    expect(calls).toEqual([]);
  });

  it("sends the preferences again on launch, not just the token", async () => {
    // A row made again from nothing must come back as what this phone chose.
    await setPushPreferences({ rate: "every", pieces: true });
    calls.length = 0;

    await refreshRegistration();

    expect(calls).toEqual([
      {
        name: "set_push_preferences",
        args: { p_token: TOKEN, p_platform: "android", p_rate_alerts: "every", p_new_pieces: true },
      },
    ]);
  });
});

describe("against a database that has not been migrated yet", () => {
  beforeEach(() => {
    native = true;
    // What PostgREST answers for a function it has never heard of.
    failing.set("set_push_preferences", { code: "PGRST202", message: "not found" });
  });

  it("still grants the daily rate, through the function that always has", async () => {
    // The website deploys on merge and the database is migrated by hand. The
    // rate card on the website's own page has to work in between.
    await expect(enableRateAlerts()).resolves.toBe("on");
    expect(calls.map((call) => call.name)).toEqual([
      "set_push_preferences",
      "register_push_device",
    ]);
  });

  it("does not pretend to have saved a choice the database cannot hold", async () => {
    const result = await setPushPreferences({ rate: "every", pieces: false });

    expect(result.saved).toBe(false);
    expect(calls.map((call) => call.name)).toEqual(["set_push_preferences"]);
    await expect(alertState()).resolves.toBe("off");
  });
});
