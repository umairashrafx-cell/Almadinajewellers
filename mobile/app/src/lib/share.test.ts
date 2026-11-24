import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The share sheet, with plugin mocks that behave like the real ones on
 * Android: Proxies that throw on any read they do not implement, `then`
 * included. A plain-object mock would pass a plugin returned bare from an
 * async function, which is exactly the bug lib/review.test.ts describes.
 * Please don't simplify them.
 */

let native = true;
let cancel = false;
const shared: unknown[] = [];
const written: { path: string; data: string; directory: string }[] = [];

function plugin<T extends object>(name: string, implemented: T): T {
  return new Proxy(implemented, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      throw new Error(`"${name}.${String(prop)}()" is not implemented on android`);
    },
  });
}

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor/share", () => ({
  Share: plugin("Share", {
    share: async (options: unknown) => {
      if (cancel) throw new Error("Share canceled");
      shared.push(options);
      return {};
    },
  }),
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: plugin("Filesystem", {
    writeFile: async (options: { path: string; data: string; directory: string }) => {
      written.push(options);
      return { uri: `file:///cache/${options.path}` };
    },
  }),
}));

const { shareImage, shareText } = await import("./share");

/** Just enough FileReader for base64(), which is all the node test needs. */
class FakeReader {
  result: string | null = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onload?.();
    });
  }
}

beforeEach(() => {
  native = true;
  cancel = false;
  shared.length = 0;
  written.length = 0;
  vi.stubGlobal("FileReader", FakeReader);
});

describe("sharing from the app", () => {
  test("sends text to the system sheet", async () => {
    await expect(shareText({ title: "Zakat", text: "Rs. 7,500" })).resolves.toBe("shared");
    expect(shared).toEqual([{ title: "Zakat", text: "Rs. 7,500", dialogTitle: "Zakat" }]);
  });

  test("writes a picture to the cache and shares the file", async () => {
    const blob = new Blob(["card"], { type: "image/jpeg" });
    const result = await shareImage({ blob, filename: "zakat.jpg", title: "Zakat", text: "x" });

    expect(result).toBe("shared");
    expect(written).toEqual([
      { path: "zakat.jpg", data: Buffer.from("card").toString("base64"), directory: "CACHE" },
    ]);
    expect(shared).toEqual([
      { title: "Zakat", text: "x", files: ["file:///cache/zakat.jpg"], dialogTitle: "Zakat" },
    ]);
  });

  test("treats closing the sheet as nothing having gone wrong", async () => {
    cancel = true;
    await expect(shareText({ title: "Zakat", text: "x" })).resolves.toBe("dismissed");
  });
});
