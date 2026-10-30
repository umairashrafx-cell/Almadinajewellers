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
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
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

/**
 * The notification icon, which Android draws as a flat silhouette in the status
 * bar — colour and detail are thrown away, and anything that is not transparent
 * comes out white. An icon with a background, like the launcher's, arrives as a
 * solid white square.
 *
 * So the diamond is cut out of the maskable icon: every pixel far enough from
 * the green behind it becomes opaque white, and the green itself becomes
 * nothing. The distance is softened at the edge so the shape keeps the
 * anti-aliasing it was drawn with.
 */
async function notificationIcon() {
  // 24dp, at each density.
  const sizes = [
    ["mdpi", 24],
    ["hdpi", 36],
    ["xhdpi", 48],
    ["xxhdpi", 72],
    ["xxxhdpi", 96],
  ];

  const source = await sharp(MASKABLE).resize(192, 192).ensureAlpha().raw().toBuffer();
  const silhouette = Buffer.alloc(source.length);

  for (let i = 0; i < source.length; i += 4) {
    const distance = Math.hypot(
      source[i] - GREEN.r,
      source[i + 1] - GREEN.g,
      source[i + 2] - GREEN.b,
    );
    // Below 40 it is the background; above 90 it is firmly the diamond. In
    // between is the drawn edge, which keeps a proportional alpha.
    const alpha = Math.max(0, Math.min(1, (distance - 40) / 50));
    silhouette[i] = 255;
    silhouette[i + 1] = 255;
    silhouette[i + 2] = 255;
    silhouette[i + 3] = Math.round(alpha * source[i + 3]);
  }

  /*
   * Trimmed before it is scaled. The maskable icon carries the padding an
   * adaptive icon needs, and keeping it here would draw a diamond half the
   * size of the space the status bar gives it.
   */
  const white = await sharp(silhouette, { raw: { width: 192, height: 192, channels: 4 } })
    .png()
    .trim({ threshold: 1 })
    .toBuffer();

  for (const [density, size] of sizes) {
    const dir = join(res, `drawable-${density}`);
    mkdirSync(dir, { recursive: true });

    // A little air around it, as the material guidance asks for.
    const inner = Math.round(size * 0.88);
    const pad = size - inner;

    await sharp(white)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.floor(pad / 2),
        bottom: Math.ceil(pad / 2),
        left: Math.floor(pad / 2),
        right: Math.ceil(pad / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(join(dir, "ic_stat_rate.png"));
  }

  console.log(`ic_stat_rate: ${sizes.map(([d, s]) => `${d} ${s}px`).join(", ")}`);
}

await icons();
await splashes();
await notificationIcon();
