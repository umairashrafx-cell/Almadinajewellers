import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Keeping the screen on while the International tab is open.
 *
 * The plugin mock is a Proxy that throws on any read it does not implement,
 * like a real Capacitor plugin on Android -- `then` included. A plugin
 * returned bare from an async function is resolved as a thenable, and on a
 * phone that lookup rejects; with this mock the same mistake in lib/awake.ts
 * makes keepScreenOn() answer false and the tests below fail. Please don't
 * simplify it to a plain object.
 */

let supported = true;
let refuse = false;
let awake = false;
let calls: string[] = [];

function asPlugin<T extends object>(implemented: T): T {
  return new Proxy(implemented, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      throw new Error(`"KeepAwake.${String(prop)}()" is not implemented on android`);
    },
  });
}

vi.mock("@capacitor-community/keep-awake", () => ({
  KeepAwake: asPlugin({
    isSupported: async () => ({ isSupported: supported }),
    keepAwake: async () => {
      // A little slower than letting go, so a quick tap away would overtake
      // it if the calls were not queued.
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (refuse) throw new Error("Activity is not available");
      calls.push("keepAwake");
      awake = true;
    },
    allowSleep: async () => {
      calls.push("allowSleep");
      awake = false;
    },
  }),
}));

const { keepScreenOn, letScreenSleep } = await import("./awake");

beforeEach(() => {
  supported = true;
  refuse = false;
  awake = false;
  calls = [];
});

describe("the mock", () => {
  it("throws on the read the promise machinery makes, as a real plugin does", async () => {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    expect(() => (KeepAwake as unknown as { then: unknown }).then).toThrow(/not implemented/);
  });
});

describe("keeping the screen on", () => {
  it("reaches the plugin -- which a bare-returned plugin never would", async () => {
    await expect(keepScreenOn()).resolves.toBe(true);
    expect(awake).toBe(true);
  });

  it("hands the screen back when asked", async () => {
    await keepScreenOn();
    await letScreenSleep();
    expect(awake).toBe(false);
  });

  it("does nothing, quietly, where the platform cannot", async () => {
    supported = false;
    await expect(keepScreenOn()).resolves.toBe(false);
    await expect(letScreenSleep()).resolves.toBeUndefined();
    expect(calls).toEqual([]);
  });

  it("answers false rather than throwing when the phone refuses", async () => {
    refuse = true;
    await expect(keepScreenOn()).resolves.toBe(false);
  });

  it("lets the screen sleep after a quick tap in and out, never stuck on", async () => {
    // Opened and left before the first call has finished.
    const on = keepScreenOn();
    const off = letScreenSleep();
    await Promise.all([on, off]);
    expect(calls).toEqual(["keepAwake", "allowSleep"]);
    expect(awake).toBe(false);
  });

  it("carries on after a call that failed", async () => {
    refuse = true;
    const failed = keepScreenOn();
    refuse = false;
    await failed;
    await expect(keepScreenOn()).resolves.toBe(true);
    expect(awake).toBe(true);
  });
});
