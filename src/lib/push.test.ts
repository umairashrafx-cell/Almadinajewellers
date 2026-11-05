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
    createChannel: async () => {},
    register: async () => {},
    unregister: async () => {},
    addListener: async () => ({ remove: async () => {} }),
  }),
}));

/** Nothing here reaches the shop; no test below gets as far as a token. */
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: async () => ({ error: null }) },
}));

const { alertState, inApp, refreshRegistration } = await import("@/lib/push");

beforeEach(() => {
  native = false;
  preferences = new Map();
  permission = "granted";
  origin();
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
