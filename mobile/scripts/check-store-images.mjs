/**
 * Every listing image against what Play accepts, read from the files
 * themselves rather than from their names.
 *
 *   bun run store:check        (in mobile/)
 *
 * Reads each PNG's IHDR chunk for its size and colour type, and fails — exit
 * code 1 — on anything Play would refuse at upload or anything that has
 * drifted from the size this folder promises. Play's rules, as the Console
 * states them:
 *
 *   App icon         512 x 512, PNG, up to 1 MB
 *   Feature graphic  1024 x 500, PNG or JPEG, up to 15 MB, no transparency
 *   Phone shots      2 to 8 of them, PNG or JPEG, up to 8 MB each, each side
 *                    320 to 3840 px, the long side at most twice the short,
 *                    no transparency
 *
 * The house size on top of that is 1080 x 1920, for every screenshot and every
 * raw capture they are built from, so a set never mixes two sizes.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const store = resolve(here, "..", "play-store");

const MB = 1024 * 1024;
const PNG_SIGNATURE = "89504e470d0a1a0a";

/** PNG colour types 4 and 6 carry an alpha channel; 0, 2 and 3 do not. */
const ALPHA_TYPES = new Set([4, 6]);

function readPng(file) {
  const bytes = readFileSync(file);
  if (bytes.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    throw new Error("not a PNG");
  }
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("no IHDR chunk where PNG requires one");
  }
  const colourType = bytes[25];
  // A palette image can still be transparent, through a tRNS chunk.
  const hasTrns = bytes.includes(Buffer.from("tRNS", "ascii"));
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    alpha: ALPHA_TYPES.has(colourType) || hasTrns,
    bytes: statSync(file).size,
  };
}

const failures = [];
let checked = 0;

function check(file, rules) {
  const name = relative(store, file).replaceAll("\\", "/");
  if (!existsSync(file)) {
    failures.push(`${name}: missing`);
    return;
  }

  let png;
  try {
    png = readPng(file);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    return;
  }

  checked++;
  const problems = [];
  const { width, height } = png;

  if (rules.exact && (width !== rules.exact[0] || height !== rules.exact[1])) {
    problems.push(`is ${width} x ${height}, must be ${rules.exact[0]} x ${rules.exact[1]}`);
  }
  if (rules.screenshot) {
    const short = Math.min(width, height);
    const long = Math.max(width, height);
    if (short < 320 || long > 3840)
      problems.push(`sides must be 320–3840 px, are ${width} x ${height}`);
    if (long > 2 * short)
      problems.push(`long side is more than twice the short (${width} x ${height})`);
  }
  if (rules.noAlpha && png.alpha) problems.push("has transparency, which Play refuses here");
  if (png.bytes > rules.maxBytes) {
    problems.push(`is ${(png.bytes / MB).toFixed(2)} MB, limit ${rules.maxBytes / MB} MB`);
  }

  const status = problems.length ? "FAIL" : "ok  ";
  console.log(
    `${status} ${name.padEnd(48)} ${width} x ${height}  ${(png.bytes / 1024).toFixed(0)} KB`,
  );
  for (const problem of problems) failures.push(`${name}: ${problem}`);
}

function pngsIn(folder) {
  const path = join(store, folder);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort()
    .map((f) => join(path, f));
}

const SHOT = { exact: [1080, 1920], screenshot: true, noAlpha: true, maxBytes: 8 * MB };

check(join(store, "play-icon-512.png"), { exact: [512, 512], maxBytes: 1 * MB });
check(join(store, "feature-graphic-1024x500.png"), {
  exact: [1024, 500],
  noAlpha: true,
  maxBytes: 15 * MB,
});
check(join(store, "feature-graphic-2026-1024x500.png"), {
  exact: [1024, 500],
  noAlpha: true,
  maxBytes: 15 * MB,
});

// The set to upload: Play takes 2–8, and this listing promises 6–8.
const current = pngsIn("screenshots-2026");
if (current.length < 6 || current.length > 8) {
  failures.push(`screenshots-2026/: ${current.length} screenshots, the set must be 6 to 8`);
}
current.forEach((file) => check(file, SHOT));

// The raw captures they are built from, and the older website set still kept.
pngsIn("raw").forEach((file) => check(file, SHOT));
pngsIn("screenshots").forEach((file) => check(file, SHOT));

console.log(`\n${checked} images read.`);
if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Every image is one Play will accept.");
