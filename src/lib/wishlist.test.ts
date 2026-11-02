import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The wishlist store, exercised as the two halves of the Android app.
 *
 * The thing worth testing here is not that a list round-trips. It is that a
 * removal sticks. The app is two origins that cannot see each other's
 * localStorage, and the obvious fix — merge the two lists — quietly makes it
 * impossible to take a piece off the list, because the half that did not see
 * the removal puts it back on the next load. Every test below is really about
 * that: Preferences wins, except when it has never been written.
 *
 * The key is spelled out rather than imported. It is a contract with the app's
 * own storage (mobile/app/src/lib/cache.ts calls it WISHLIST_KEY), so a test
 * that read it from the source could not notice it changing.
 */
const KEY = "amj:wishlist";

/** Whether the code under test believes it is inside the app. */
let native = false;

/** What Capacitor Preferences holds — the app's storage, outside any origin. */
let preferences = new Map<string, string>();

/** Held open to keep a Preferences read in flight while a test taps a heart. */
let gate: Promise<void> | null = null;

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => {
      if (gate) await gate;
      return { value: preferences.has(key) ? preferences.get(key) : null };
    },
    set: async ({ key, value }: { key: string; value: string }) => {
      preferences.set(key, value);
    },
  },
}));

/**
 * One origin's localStorage.
 *
 * Replaced between loads to stand for the other half of the app: same device,
 * same Preferences, a different origin that kept its own copy.
 */
function origin(contents?: string[]) {
  const map = new Map<string, string>();
  if (contents) map.set(KEY, JSON.stringify(contents));

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
 * A fresh load of the store, as a new page would get.
 *
 * resetModules is what makes each test a separate page load: the store keeps
 * its list, its hydrated flag and its write counter at module scope, which is
 * exactly the state a reload clears.
 */
async function load() {
  vi.resetModules();
  const store = await import("./wishlist");
  store.subscribe(() => {});
  return store;
}

beforeEach(() => {
  native = false;
  preferences = new Map();
  gate = null;
  origin();

  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;
});

describe("in a browser", () => {
  it("reads localStorage straight away, with no waiting", async () => {
    const kept = origin(["AMJ-1"]);
    const store = await load();

    // Synchronously, on the first paint — not after a promise settles.
    expect(store.snapshot().skus).toEqual(["AMJ-1"]);
    expect(kept).toBeDefined();
  });

  it("saves to localStorage and never reaches for Preferences", async () => {
    origin(["AMJ-1"]);
    const store = await load();

    store.toggle("AMJ-2");

    expect(store.snapshot().skus).toEqual(["AMJ-1", "AMJ-2"]);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(["AMJ-1", "AMJ-2"]));

    // Nothing was written to the app's storage, because there is no app.
    await vi.waitFor(() => expect(preferences.size).toBe(0));
  });

  it("removes a piece and leaves it removed", async () => {
    origin(["AMJ-1", "AMJ-2"]);
    const store = await load();

    store.toggle("AMJ-1");

    expect(store.snapshot().skus).toEqual(["AMJ-2"]);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(["AMJ-2"]));
  });
});

describe("inside the app", () => {
  beforeEach(() => {
    native = true;
  });

  it("believes Preferences over this origin's own copy", async () => {
    origin(["AMJ-1"]);
    preferences.set(KEY, JSON.stringify(["AMJ-2"]));

    const store = await load();

    // The first paint guesses from localStorage, which is all it has.
    expect(store.snapshot().skus).toEqual(["AMJ-1"]);

    await vi.waitFor(() => expect(store.snapshot().ready).toBe(true));
    expect(store.snapshot().skus).toEqual(["AMJ-2"]);

    // And it writes the settled list back, so the next load guesses right.
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(["AMJ-2"]));
  });

  it("writes a saved piece to both places", async () => {
    const store = await load();
    await vi.waitFor(() => expect(store.snapshot().ready).toBe(true));

    store.toggle("AMJ-1");

    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(["AMJ-1"]));
    await vi.waitFor(() => expect(preferences.get(KEY)).toBe(JSON.stringify(["AMJ-1"])));
  });

  /**
   * The one that matters. A piece removed on one half must not be resurrected
   * by the other half's stale localStorage — which is precisely what merging
   * the two lists would do.
   */
  it("keeps a removal made on the other half", async () => {
    // The website half: it has the piece, and so does the app's storage.
    origin(["AMJ-1"]);
    preferences.set(KEY, JSON.stringify(["AMJ-1"]));

    const website = await load();
    await vi.waitFor(() => expect(website.snapshot().ready).toBe(true));
    website.toggle("AMJ-1");
    await vi.waitFor(() => expect(preferences.get(KEY)).toBe("[]"));

    // Now the app's own screens load. Their origin never saw the removal and
    // still has the piece in its localStorage.
    origin(["AMJ-1"]);
    const app = await load();

    await vi.waitFor(() => expect(app.snapshot().ready).toBe(true));
    expect(app.snapshot().skus).toEqual([]);

    // And the stale copy is corrected, so it cannot come back on the load
    // after this one either.
    expect(localStorage.getItem(KEY)).toBe("[]");
  });

  it("carries a piece saved on one half across to the other", async () => {
    origin();
    const app = await load();
    await vi.waitFor(() => expect(app.snapshot().ready).toBe(true));
    app.toggle("AMJ-9");
    await vi.waitFor(() => expect(preferences.get(KEY)).toBe(JSON.stringify(["AMJ-9"])));

    // The website half, whose own localStorage has never heard of it.
    origin();
    const website = await load();

    await vi.waitFor(() => expect(website.snapshot().skus).toEqual(["AMJ-9"]));
  });

  /**
   * An absent key is not an empty list. Somebody who built a wishlist on the
   * website before the app had anywhere to put it must not lose it the first
   * time the new code runs.
   */
  it("seeds Preferences from localStorage when nothing was ever written", async () => {
    origin(["AMJ-1", "AMJ-2"]);
    const store = await load();

    await vi.waitFor(() => expect(store.snapshot().ready).toBe(true));

    expect(store.snapshot().skus).toEqual(["AMJ-1", "AMJ-2"]);
    expect(preferences.get(KEY)).toBe(JSON.stringify(["AMJ-1", "AMJ-2"]));
  });

  it("treats an unreadable Preferences value as never written", async () => {
    origin(["AMJ-1"]);
    preferences.set(KEY, "not json at all");

    const store = await load();
    await vi.waitFor(() => expect(store.snapshot().ready).toBe(true));

    expect(store.snapshot().skus).toEqual(["AMJ-1"]);
    expect(preferences.get(KEY)).toBe(JSON.stringify(["AMJ-1"]));
  });

  /**
   * The hydrate is asynchronous, so a heart tapped in the moment before it
   * lands would be undone by a read that started before the tap.
   */
  it("does not let a slow read undo a tap that beat it", async () => {
    origin(["AMJ-1"]);
    preferences.set(KEY, JSON.stringify(["AMJ-1"]));

    let open: () => void = () => {};
    gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const store = await load();

    // The read is still in flight; the piece is removed anyway.
    store.toggle("AMJ-1");
    expect(store.snapshot().skus).toEqual([]);

    open();
    await vi.waitFor(() => expect(preferences.get(KEY)).toBe("[]"));

    // The read answered with the list as it was before the tap. The tap wins.
    expect(store.snapshot().skus).toEqual([]);
  });
});
