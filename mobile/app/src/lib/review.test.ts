import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Play review prompt: when it asks, and that asking survives the plugin.
 *
 * The plugin mock is a Proxy that throws on any read it does not implement,
 * like a real Capacitor plugin on Android — `then` included. That is the whole
 * point of it: a plugin returned bare from an async function is resolved as a
 * thenable, the promise machinery reads `.then`, and on a phone the lookup
 * rejects. src/lib/push.ts and src/lib/wishlist.ts each shipped that bug once,
 * green in every test, because their mocks were plain objects. With this mock,
 * the same mistake in lib/review.ts makes `requestReview()` answer false and
 * the tests below fail. Please don't simplify it to a plain object.
 */

let native = true;
let requests = 0;
let refuse = false;

function asPlugin<T extends object>(implemented: T): T {
  return new Proxy(implemented, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      throw new Error(`"InAppReview.${String(prop)}()" is not implemented on android`);
    },
  });
}

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor-community/in-app-review", () => ({
  InAppReview: asPlugin({
    requestReview: async () => {
      requests++;
      if (refuse) throw new Error("Request review task Failed");
    },
  }),
}));

const {
  ASK_AT_CHECK,
  CHECK_GAP_MS,
  FRESH,
  REVIEW_KEY,
  afterAsk,
  countCheck,
  loadReviewState,
  rateChecked,
  readReviewState,
  requestReview,
  shouldAsk,
} = await import("./review");

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 16, 9, 0);

let stored: Map<string, string>;

beforeEach(() => {
  native = true;
  requests = 0;
  refuse = false;
  stored = new Map();
  globalThis.localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
    clear: () => stored.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
});

describe("the mock", () => {
  it("throws on the read the promise machinery makes, as a real plugin does", async () => {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    expect(() => (InAppReview as unknown as { then: unknown }).then).toThrow(/not implemented/);
  });
});

describe("requestReview", () => {
  it("reaches the plugin inside the app — which a bare-returned plugin never would", async () => {
    await expect(requestReview()).resolves.toBe(true);
    expect(requests).toBe(1);
  });

  it("answers false when Play cannot run the flow", async () => {
    refuse = true;
    await expect(requestReview()).resolves.toBe(false);
  });

  it("does nothing in a browser", async () => {
    native = false;
    await expect(requestReview()).resolves.toBe(false);
    expect(requests).toBe(0);
  });
});

describe("what counts as a check", () => {
  it("counts separate looks", () => {
    let state = FRESH;
    state = countCheck(state, T0);
    state = countCheck(state, T0 + 2 * HOUR);
    expect(state.checks).toBe(2);
  });

  it("does not count tab-tapping within the hour", () => {
    let state = countCheck(FRESH, T0);
    state = countCheck(state, T0 + 5 * 60 * 1000);
    state = countCheck(state, T0 + CHECK_GAP_MS - 1);
    expect(state.checks).toBe(1);
    expect(countCheck(state, T0 + CHECK_GAP_MS).checks).toBe(2);
  });

  it("counts after a clock that went backwards rather than freezing", () => {
    const state = countCheck(FRESH, T0);
    expect(countCheck(state, T0 - HOUR).checks).toBe(2);
  });

  it("stops counting once done", () => {
    const done = { ...FRESH, checks: 5, done: true };
    expect(countCheck(done, T0)).toBe(done);
  });
});

describe("when it asks", () => {
  const at = (checks: number, asks = 0, done = false) => ({ ...FRESH, checks, asks, done });

  it("never before the third check", () => {
    expect(ASK_AT_CHECK).toBe(3);
    expect(shouldAsk(at(1))).toBe(false);
    expect(shouldAsk(at(2))).toBe(false);
    expect(shouldAsk(at(3))).toBe(true);
  });

  it("once more on the fourth if the third did not get through", () => {
    const failed = afterAsk(at(3), false);
    expect(failed.done).toBe(false);
    expect(shouldAsk(failed)).toBe(false);
    expect(shouldAsk({ ...failed, checks: 4 })).toBe(true);
  });

  it("never a third time", () => {
    const twice = afterAsk(afterAsk(at(4), false), false);
    expect(twice.done).toBe(true);
    expect(shouldAsk({ ...twice, checks: 50 })).toBe(false);
  });

  it("never again once Play has run the flow", () => {
    const shown = afterAsk(at(3), true);
    expect(shown.done).toBe(true);
    expect(shouldAsk({ ...shown, checks: 4 })).toBe(false);
  });
});

describe("rateChecked, end to end", () => {
  it("asks on the third look and not again", async () => {
    await rateChecked(T0);
    await rateChecked(T0 + 2 * HOUR);
    expect(requests).toBe(0);

    await rateChecked(T0 + 4 * HOUR);
    expect(requests).toBe(1);
    expect(loadReviewState()).toMatchObject({ checks: 3, asks: 1, done: true });

    await rateChecked(T0 + 6 * HOUR);
    await rateChecked(T0 + 30 * HOUR);
    expect(requests).toBe(1);
  });

  it("tries the fourth look when the third failed, then stops", async () => {
    refuse = true;
    for (let i = 0; i < 6; i++) await rateChecked(T0 + i * 2 * HOUR);
    expect(requests).toBe(2);
    expect(loadReviewState()).toMatchObject({ asks: 2, done: true });
  });

  it("does not let tapping back and forth earn a prompt", async () => {
    for (let minute = 0; minute < 50; minute += 5) await rateChecked(T0 + minute * 60 * 1000);
    expect(requests).toBe(0);
    expect(loadReviewState().checks).toBe(1);
  });

  it("keeps no count in a browser", async () => {
    native = false;
    for (let i = 0; i < 4; i++) await rateChecked(T0 + i * 2 * HOUR);
    expect(stored.has(REVIEW_KEY)).toBe(false);
    expect(requests).toBe(0);
  });
});

describe("readReviewState", () => {
  it("starts again on anything unreadable", () => {
    expect(readReviewState(null)).toEqual(FRESH);
    expect(readReviewState("not json")).toEqual(FRESH);
    expect(readReviewState("[1,2]")).toMatchObject({ checks: 0, done: false });
    expect(readReviewState('{"checks":-4,"asks":"two"}')).toMatchObject({ checks: 0, asks: 0 });
  });

  it("reads back what was written", () => {
    const state = { checks: 3, lastCheckAt: T0, asks: 1, done: false };
    expect(readReviewState(JSON.stringify(state))).toEqual(state);
  });
});
