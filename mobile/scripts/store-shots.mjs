/**
 * The Play listing's pictures, taken from the running app.
 *
 *   bun run dev                      (in mobile/, leave it running)
 *   bun run store:shots              raw captures, then the framed set
 *   bun run store:shots -- frames    re-frame the existing raw captures only
 *   bun run store:check              then check every size against Play
 *
 * Step one opens the app's own screens in a headless Chrome at 360 x 640 CSS
 * pixels and a pixel ratio of 3 — a 1080 x 1920 phone — and saves each as it
 * is: play-store/raw/<id>.png. Nothing is drawn in; the figures are whatever
 * the shop had published when the picture was taken.
 *
 * Step two puts each raw capture in templates/frame.html with its caption from
 * captions.json (play-store/screenshots-2026/), and builds the 1024 x 500
 * feature graphic (feature-graphic-2026-1024x500.png) from
 * templates/feature.html around the rate board.
 *
 * APP_URL overrides where the app is served; the default is the dev server's
 * own port from mobile/package.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import sharp from "sharp";

import { launch, sleep } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const store = resolve(here, "..", "play-store");
const rawDir = join(store, "raw");
const framedDir = join(store, "screenshots-2026");
const templates = join(store, "templates");

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const { shots } = JSON.parse(readFileSync(join(store, "captions.json"), "utf8"));

/** Moves the app to a screen the way its own back button does: through history. */
const SHOW = `window.__show = (view) => {
  history.pushState({ view }, "");
  dispatchEvent(new PopStateEvent("popstate", { state: { view } }));
};`;

/**
 * What each screen needs before it is worth a picture. Keyed by the ids in
 * captions.json; "home" is captured too, for the feature graphic.
 */
const SETUP = {
  home: { wait: 3500, run: "" },
  rate: { wait: 3500, run: `__show("rate")` },
  // The calculator reads purity, weight and unit off the address, as its share link does.
  calculator: {
    query: "?purity=22K&weight=2&unit=tola",
    wait: 2500,
    // Down to the weight, so what was asked and the answer are both in the picture.
    run: `__show("calculator");
      await new Promise((r) => setTimeout(r, 3000));
      const label = [...document.querySelectorAll("*")].find((el) => el.children.length === 0 && /^weight$/i.test(el.textContent.trim()));
      if (label) window.scrollTo({ top: label.getBoundingClientRect().top + scrollY - 24, behavior: "instant" });`,
  },
  pieces: { wait: 6000, run: `__show("pieces")` },
  saved: {
    wait: 6000,
    /*
     * Three hearts tapped on the Shop screen, by the same buttons a customer
     * uses. Inside the app that tap writes the list to localStorage and to
     * Capacitor Preferences (src/lib/wishlist.ts), and the Saved screen reads
     * Preferences. A desktop browser has no native side, so the second write
     * is made here, into the key Preferences' own web fallback reads.
     */
    run: `__show("pieces");
      await new Promise((r) => setTimeout(r, 6000));
      const hearts = [...document.querySelectorAll('button[aria-label^="Save "]')].slice(0, 3);
      hearts.forEach((b) => b.click());
      await new Promise((r) => setTimeout(r, 500));
      localStorage.setItem("CapacitorStorage.amj:wishlist", localStorage.getItem("amj:wishlist") ?? "[]");
      __show("saved");`,
  },
  sell: { wait: 3000, run: `__show("sell")` },
  custom: { wait: 3000, run: `__show("custom")` },
  international: {
    wait: 7000,
    run: `__show("rate");
      await new Promise((r) => setTimeout(r, 2500));
      document.getElementById("rates-tab-international")?.click();`,
  },
  settings: {
    wait: 5000,
    // Dirhams: the Gulf is where most of the shop's customers abroad are.
    before: `localStorage.setItem("amj:settings", JSON.stringify({ theme: "light", currency: "AED" }));`,
    run: `__show("settings");
      await new Promise((r) => setTimeout(r, 2500));
      const heading = [...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === "Currency");
      if (heading) window.scrollTo({ top: heading.getBoundingClientRect().top + scrollY - 16, behavior: "instant" });`,
  },
};

/** Play wants screenshots and the feature graphic without an alpha channel. */
async function opaque(png) {
  return sharp(png).flatten({ background: "#F9F6F2" }).png({ compressionLevel: 9 }).toBuffer();
}

async function captureRaw(page) {
  mkdirSync(rawDir, { recursive: true });
  // SHOT=calculator,saved retakes just those.
  const only = process.env.SHOT?.split(",");
  const ids = ["home", ...shots.map((s) => s.id)].filter((id) => !only || only.includes(id));

  for (const id of ids) {
    const setup = SETUP[id];
    if (!setup) throw new Error(`No setup for "${id}" in store-shots.mjs`);

    await page.viewport(360, 640, 3, true);
    await page.goto(`${APP_URL}/`, 500);
    // A clean phone for every picture, so one screen's state never leaks into the next.
    await page.run(`localStorage.clear(); ${setup.before ?? ""} true`);
    await page.goto(`${APP_URL}/${setup.query ?? ""}`, 1500);
    await page.run(`(async () => { ${SHOW} ${setup.run}; return true; })()`);
    await sleep(setup.wait);

    const file = join(rawDir, `${id}.png`);
    writeFileSync(file, await opaque(await page.png()));
    console.log(`raw     ${id}`);
  }
}

async function frame(page) {
  mkdirSync(framedDir, { recursive: true });
  const template = pathToFileURL(join(templates, "frame.html")).href;

  for (const [index, shot] of shots.entries()) {
    const params = new URLSearchParams({
      shot: `../raw/${shot.id}.png`,
      title: shot.title,
      urdu: shot.urdu,
      sub: shot.sub,
    });
    await page.viewport(1080, 1920, 1, false);
    await page.goto(`${template}?${params}`, 300);
    await page.run(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 400)))`);

    const name = `phone-${index + 1}-${shot.id}.png`;
    writeFileSync(join(framedDir, name), await opaque(await page.png()));
    console.log(`framed  ${name}`);
  }

  await page.viewport(1024, 500, 1, false);
  await page.goto(pathToFileURL(join(templates, "feature.html")).href, 300);
  await page.run(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 400)))`);
  // Beside the older brand-only graphic rather than over it: which one goes up is the owner's call.
  writeFileSync(join(store, "feature-graphic-2026-1024x500.png"), await opaque(await page.png()));
  console.log("framed  feature-graphic-2026-1024x500.png");
}

const only = process.argv[2];
const page = await launch();
try {
  if (only !== "frames") await captureRaw(page);
  if (only !== "raw") await frame(page);
} finally {
  await page.close();
}
