import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rate alerts, exercised the way a phone meets them.
 *
 * What is worth testing here is not that a flag round-trips. It is that this
 * module reaches the plugins at all. A Capacitor plugin is a Proxy that
 * answers every property read with a method of that name, `then` included, so
 * a plugin handed to the promise machinery is called as a thenable and the
 * call rejects — on a phone, and nowhere else, because a browser returns
 * early before it ever touches one. A plain object mock is silent about that,
 * and that silence is how the bug below reached a device: alertState() could
 * not read its own state, and the store fell back to the per-origin copy that
 * Preferences exists to replace.
 *
 * So the mocks throw the way the real bridge throws, and the tests only ask
 * what the module managed to read and write.
 */

/** Spelled out rather than imported: it is a contract with the app's storage. */
const WANTED_KEY = "amj:rate-alerts";

/** Whether the code under test believes it is inside the app. */
let native = false;

/** What Android answers when asked about the notification permission. */
let permission = "granted";

/** What Capacitor Preferences holds — the app's storage, outside any origin. */
let preferences = new Map<string, string>();

/**
 * A plugin as @capacitor/core builds one.
 *
 * registerPlugin returns a Proxy whose `get` special-cases four names and
 * turns everything else into a native method call, so reading a name the
 * plugin does not implement does not give back undefined — it throws when
 * called. `then` is one of those names.
 */
function bridge<T extends object>(name: string, implemented: T): T {
  return new Proxy(implemented, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      throw new Error(`"${name}.${String(prop)}()" is not implemented on android`);
    },
  });
}

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: bridge("Preferences", {
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
  PushNotifications: bridge("PushNotifications", {
    checkPermissions: async () => ({ receive: permission }),
  }),
}));

/**
 * One origin's localStorage.
 *
 * Replaced between tests to stand for the other half of the app: same device,
 * same Preferences, a different origin that kept its own copy.
 */
function origin(wanted?: string) {
  const map = new Map<string, string>();
  if (wanted) map.set(WANTED_KEY, wanted);

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

async function load() {
  vi.resetModules();
  return await import("./push");
}

beforeEach(() => {
  native = false;
  permission = "granted";
  preferences = new Map();
  origin();
});

describe("in a browser", () => {
  it("says there is nothing to offer, without reaching for a plugin", async () => {
    const { alertState } = await load();

    expect(await alertState()).toBe("unsupported");
  });
});

describe("on a phone", () => {
  beforeEach(() => {
    native = true;
  });

  it("reads the flag the app stored, not this origin's copy", async () => {
    preferences.set(WANTED_KEY, "yes");
    origin();

    const { alertState } = await load();

    expect(await alertState()).toBe("on");
  });

  it("believes Preferences over an origin that disagrees", async () => {
    preferences.set(WANTED_KEY, "yes");
    origin("no");

    const { alertState } = await load();

    expect(await alertState()).toBe("on");
  });

  it("moves a flag only this origin kept into the app's own store", async () => {
    origin("yes");

    const { alertState } = await load();

    expect(await alertState()).toBe("on");
    // Carried across on the way past, so the app's other half can see it too.
    expect(preferences.get(WANTED_KEY)).toBe("yes");
  });

  it("reports what Android says about the permission", async () => {
    preferences.set(WANTED_KEY, "yes");
    permission = "denied";

    const { alertState } = await load();

    expect(await alertState()).toBe("blocked");
  });
});
