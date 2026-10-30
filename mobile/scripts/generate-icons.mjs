/*
 * Puts the shop's own icon on the app, in place of Capacitor's.
 *
 * `cap add android` writes the Capacitor logo into every mipmap and splash
 * drawable, and those files are committed with the native project — so this is
 * run once after adding the platform, and again whenever the website's icons
 * change. It takes its art from public/, so the launcher icon, the home-screen
 * icon of the installed website and the Play listing can never drift apart.
 *
 *   bun run icons
 *
 * public/icon-maskable-512.png is the adaptive foreground: a maskable icon is
 * drawn to the same rule Android masks an adaptive one to, which is what makes
 * it safe to use full-bleed. public/icon-512.png, already a rounded square, is
 * the legacy icon for launchers that do not mask.
 */
import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..", "..", "public");
const res = join(here, "..", "android", "app", "src", "main", "res");

/** Madina green. The same value as --primary in the website's styles.css. */
const GREEN = { r: 0x0b, g: 0x3d, b: 0x2e, alpha: 1 };

const SQUARE = join(site, "icon-512.png");
const MASKABLE = join(site, "icon-maskable-512.png");

/** Launcher icon, and adaptive foreground, per density. 48dp and 108dp. */
const DENSITIES = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];

/** A circle the size of the icon, to cut the round launcher icon out of it. */
function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
  );
}

async function icons() {
  for (const [density, launcher, foreground] of DENSITIES) {
    const dir = join(res, `mipmap-${density}`);

    await sharp(SQUARE).resize(launcher, launcher).toFile(join(dir, "ic_launcher.png"));

    await sharp(MASKABLE)
      .resize(launcher, launcher)
      .composite([{ input: circleMask(launcher), blend: "dest-in" }])
      .toFile(join(dir, "ic_launcher_round.png"));

    await sharp(MASKABLE)
      .resize(foreground, foreground)
      .toFile(join(dir, "ic_launcher_foreground.png"));

    console.log(`mipmap-${density}: ${launcher}px icon, ${foreground}px foreground`);
  }

  // Capacitor's vector foreground, left behind by `cap add` and now unused:
  // mipmap-anydpi-v26/ic_launcher.xml points at @mipmap/ic_launcher_foreground,
  // which the PNGs above answer. Removed so there is one foreground, not two.
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
 * template decided it should be.
 */
async function splashes() {
  const dirs = readdirSync(res).filter((name) => existsSync(join(res, name, "splash.png")));

  for (const name of dirs) {
    const file = join(res, name, "splash.png");
    const { width, height } = await sharp(file).metadata();
    // The maskable art, not the rounded square: on green it is the diamond
    // alone, with no frame drawn around it. Two fifths of the short side, of
    // which the diamond itself is a little over half.
    const mark = Math.round((Math.min(width, height) * 2) / 5);

    const logo = await sharp(MASKABLE).resize(mark, mark).toBuffer();

    await sharp({ create: { width, height, channels: 4, background: GREEN } })
      .composite([{ input: logo, gravity: "centre" }])
      .png()
      .toFile(file);

    console.log(`${name}: ${width}x${height} splash`);
  }
}

await icons();
await splashes();
