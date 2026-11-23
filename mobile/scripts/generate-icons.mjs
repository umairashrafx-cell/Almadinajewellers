/*
 * Puts the app's logo, the AM seal, into every icon slot of the Android app.
 *
 * `cap add android` writes the Capacitor logo into every mipmap and splash
 * drawable, and those files are committed with the native project — so this is
 * run once after adding the platform, and again whenever the logo changes.
 *
 *   bun run icons
 *
 * The art comes from mobile/brand/, not from the website's public/ folder: the
 * app has its own mark, and the website keeps its diamond.
 *
 *   icon-foreground.svg  the seal on nothing, drawn on the 108dp adaptive canvas
 *                        and kept inside its 66dp safe circle
 *   icon-background.svg  the emerald ground behind it
 *   monogram.svg         the AM alone, for the status bar
 *   lockup.svg           the seal over the wordmark, for the splash
 *
 * Out of them come the adaptive foreground, background and monochrome layers,
 * the legacy square and round icons, the splash at every size Capacitor's
 * template made, the white notification silhouette, the app's own 192px web
 * icon and the 512px Play Store icon.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const brand = join(here, "..", "brand");
const res = join(here, "..", "android", "app", "src", "main", "res");

const FOREGROUND = join(brand, "icon-foreground.svg");
const BACKGROUND = join(brand, "icon-background.svg");
const MONOGRAM = join(brand, "monogram.svg");
const LOCKUP = join(brand, "lockup.svg");

/** Launcher icon, and adaptive layers, per density. 48dp and 108dp. */
const DENSITIES = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** An SVG rendered at a given pixel size. Vector all the way, so no upscaling. */
function render(file, width, height = width) {
  // librsvg rasterises at 72dpi per viewBox unit; ask for enough density that
  // the result is drawn at the target size rather than scaled up to it.
  return sharp(file, { density: 72 * Math.max(1, Math.ceil(Math.max(width, height) / 1024) * 2) })
    .resize(width, height, { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();
}

/** The whole adaptive icon, background and seal, as a launcher would composite it. */
async function composed(size) {
  const [bg, fg] = await Promise.all([render(BACKGROUND, size), render(FOREGROUND, size)]);
  return sharp(bg).composite([{ input: fg }]).png().toBuffer();
}

/**
 * What a launcher shows of the 108dp canvas: the middle 72dp. The legacy icons
 * are cut from that, so they look like the adaptive one on every phone.
 */
async function visible(size) {
  const canvas = Math.round((size * 108) / 72);
  const inset = Math.round((canvas - size) / 2);
  const full = await composed(canvas);
  return sharp(full).extract({ left: inset, top: inset, width: size, height: size }).png().toBuffer();
}

function mask(size, shape) {
  const r = size / 2;
  const body =
    shape === "circle"
      ? `<circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>`
      : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#fff"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${body}</svg>`);
}

const cut = async (size, shape) =>
  sharp(await visible(size))
    .composite([{ input: mask(size, shape), blend: "dest-in" }])
    .png()
    .toBuffer();

/** Any art as a flat white shape that keeps only its alpha. */
async function silhouette(file, size) {
  const { data, info } = await sharp(await render(file, size)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function icons() {
  for (const [density, launcher, layer] of DENSITIES) {
    const dir = join(res, `mipmap-${density}`);

    await sharp(await cut(launcher, "square")).toFile(join(dir, "ic_launcher.png"));
    await sharp(await cut(launcher, "circle")).toFile(join(dir, "ic_launcher_round.png"));
    await sharp(await render(FOREGROUND, layer)).toFile(join(dir, "ic_launcher_foreground.png"));
    await sharp(await render(BACKGROUND, layer)).toFile(join(dir, "ic_launcher_background.png"));
    // Android 13's themed icons: the launcher tints this one shape itself.
    await sharp(await silhouette(FOREGROUND, layer)).toFile(join(dir, "ic_launcher_monochrome.png"));

    console.log(`mipmap-${density}: ${launcher}px icon, ${layer}px layers`);
  }

  // Capacitor's vector foreground, left behind by `cap add` and unused:
  // mipmap-anydpi-v26/ic_launcher.xml points at the PNG layers above.
  const stale = join(res, "drawable-v24", "ic_launcher_foreground.xml");
  if (existsSync(stale)) {
    rmSync(stale);
    console.log("removed Capacitor's vector foreground");
  }
}

/**
 * The cold-start screen, which the launch theme shows until the WebView has
 * something to draw. Each existing splash.png is replaced at its own size,
 * portrait and landscape, so the set of densities stays whatever Capacitor's
 * template decided it should be: the emerald ground, with the seal and the
 * wordmark across four fifths of the short side (the seal itself is about half).
 */
async function splashes() {
  const dirs = readdirSync(res).filter((name) => existsSync(join(res, name, "splash.png")));

  for (const name of dirs) {
    const file = join(res, name, "splash.png");
    const { width, height } = await sharp(file).metadata();
    const wide = Math.round(Math.min(width, height) * 0.8);
    const tall = Math.round((wide * 840) / 1024);

    const ground = await render(BACKGROUND, Math.max(width, height));
    const lockup = await render(LOCKUP, wide, tall);

    await sharp(ground)
      .resize(width, height, { fit: "cover" })
      .composite([{ input: lockup, gravity: "centre" }])
      .png()
      .toFile(file);

    console.log(`${name}: ${width}x${height} splash`);
  }
}

/**
 * The notification icon, which Android draws as a flat silhouette in the status
 * bar: colour is thrown away and anything opaque comes out white. The ring is
 * too fine at 24dp, so this is the AM alone, trimmed to its own edges.
 */
async function notificationIcon() {
  const sizes = [
    ["mdpi", 24],
    ["hdpi", 36],
    ["xhdpi", 48],
    ["xxhdpi", 72],
    ["xxxhdpi", 96],
  ];

  const white = await sharp(await silhouette(MONOGRAM, 384))
    .trim({ threshold: 1 })
    .toBuffer();

  for (const [density, size] of sizes) {
    const dir = join(res, `drawable-${density}`);
    mkdirSync(dir, { recursive: true });

    // A little air around it, as the material guidance asks for.
    const inner = Math.round(size * 0.88);
    const pad = size - inner;

    await sharp(white)
      .resize(inner, inner, { fit: "contain", background: CLEAR })
      .extend({
        top: Math.floor(pad / 2),
        bottom: Math.ceil(pad / 2),
        left: Math.floor(pad / 2),
        right: Math.ceil(pad / 2),
        background: CLEAR,
      })
      .png()
      .toFile(join(dir, "ic_stat_rate.png"));
  }

  console.log(`ic_stat_rate: ${sizes.map(([d, s]) => `${d} ${s}px`).join(", ")}`);
}

/**
 * The 512px Play Store icon, full bleed (Play rounds the corners itself), and
 * the app's own 192px web icon. The seal is drawn a little larger than on the
 * adaptive canvas, which has to leave room for launchers that cut deeper.
 */
async function storeIcons() {
  const play = join(here, "..", "play-store", "play-icon-512.png");
  const bg = await render(BACKGROUND, 512);
  const fg = await render(FOREGROUND, 600);
  await sharp(bg)
    .composite([{ input: await sharp(fg).extract({ left: 44, top: 44, width: 512, height: 512 }).toBuffer() }])
    .png()
    .toFile(play);
  console.log("play-icon-512.png");

  await sharp(await cut(192, "square")).toFile(join(here, "..", "app", "public", "icon-192.png"));
  console.log("app/public/icon-192.png");
}

await icons();
await splashes();
await notificationIcon();
await storeIcons();
