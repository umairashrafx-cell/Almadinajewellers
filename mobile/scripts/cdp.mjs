/**
 * A headless Chrome, driven over the DevTools protocol with nothing installed.
 *
 * The store pictures have to be real screenshots of the running app at the
 * size Play shows them, and the browser pane in the editor hands back scaled
 * JPEGs. Chrome itself will render any viewport at any pixel ratio and return
 * a lossless PNG, and Node 24 already has the WebSocket the protocol runs over,
 * so this is the whole of the dependency: a Chrome or Edge on the machine.
 *
 * Point CHROME at a browser if neither default path exists.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launch() {
  const binary = CANDIDATES.find((path) => existsSync(path));
  if (!binary) throw new Error("No Chrome or Edge found. Set CHROME to its path.");

  const profile = mkdtempSync(join(tmpdir(), "amj-shots-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const child = spawn(
    binary,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      // The templates load the screenshots beside them from disk.
      "--allow-file-access-from-files",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch {
      // Not listening yet.
    }
  }
  if (!target) {
    child.kill();
    throw new Error("Chrome did not open its debugging port.");
  }

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let next = 0;
  const pending = new Map();
  const waiters = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      for (const waiter of [...waiters]) {
        if (waiter.method === message.method) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(message.params);
        }
      }
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }));

  await send("Page.enable");
  await send("Runtime.enable");

  const page = {
    send,

    /** CSS pixels and a pixel ratio: the PNG comes back at their product. */
    async viewport(width, height, scale = 1, mobile = false) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: scale,
        mobile,
      });
    },

    async goto(url, settleMs = 1500) {
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url });
      await loaded;
      await sleep(settleMs);
    },

    /** Runs an expression in the page and returns its value. */
    async run(expression) {
      const { result, exceptionDetails } = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      }
      return result.value;
    },

    async png() {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      return Buffer.from(data, "base64");
    },

    async close() {
      try {
        await send("Browser.close");
      } catch {
        // Already gone.
      }
      socket.close();
      child.kill();
      await sleep(300);
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        // Windows may hold the profile a moment longer; it is in the temp folder.
      }
    },
  };

  return page;
}
