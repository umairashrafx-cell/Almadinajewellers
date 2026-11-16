/**
 * The Play listing text against Play's limits, before anyone pastes it.
 *
 *   node scripts/check-play-metadata.mjs            (or: bun run check:play-metadata)
 *   node scripts/check-play-metadata.mjs path/to/other.md
 *
 * Reads docs/aso/PLAY_STORE_METADATA.md, takes the fenced `text` block under
 * each of its "## Title", "## Short description" and "## Full description"
 * headings, and fails — exit code 1 — if any field is empty or over its limit:
 *
 *   Title              30 characters
 *   Short description  80
 *   Full description   4,000
 *
 * Length is counted two ways, in Unicode code points and in UTF-16 units, and
 * the larger is held to the limit. The two agree for everything in this
 * listing, Urdu included, but an emoji counts once as a code point and twice
 * as UTF-16 — and a check that is never the one that undercounts is the only
 * kind worth having in front of an upload form.
 *
 * It also refuses what Play's metadata policy refuses in a title (emoji,
 * ranking or price claims, words in capitals), and checks the two things this
 * listing was asked to say: the title as agreed, and a full description that
 * opens with "today's gold rate in Pakistan".
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(
  process.argv[2] ?? resolve(here, "..", "docs", "aso", "PLAY_STORE_METADATA.md"),
);
const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

const FIELDS = [
  { heading: "Title", limit: 30 },
  { heading: "Short description", limit: 80 },
  { heading: "Full description", limit: 4000 },
];

/** The first ```text block after a "## <heading>" line, before the next "## ". */
function field(heading) {
  const start = source.indexOf(`\n## ${heading}\n`);
  if (start === -1) return undefined;
  const rest = source.slice(start + heading.length + 5);
  const end = rest.search(/\n## /);
  const section = end === -1 ? rest : rest.slice(0, end);
  const block = section.match(/```text\n([\s\S]*?)\n```/);
  return block ? block[1] : undefined;
}

function length(text) {
  return Math.max([...text].length, text.length);
}

const failures = [];
const values = {};

for (const { heading, limit } of FIELDS) {
  const value = field(heading);
  if (value === undefined) {
    failures.push(`${heading}: no \`\`\`text block under "## ${heading}"`);
    continue;
  }
  values[heading] = value;
  const used = length(value);
  const status = used > limit || !value.trim() ? "FAIL" : "ok  ";
  console.log(`${status} ${heading.padEnd(18)} ${String(used).padStart(4)} / ${limit}`);
  if (!value.trim()) failures.push(`${heading}: empty`);
  if (used > limit)
    failures.push(`${heading}: ${used} characters, ${used - limit} over the limit of ${limit}`);
  if (value !== value.trim())
    failures.push(`${heading}: leading or trailing whitespace would be pasted too`);
}

const title = values["Title"];
if (title !== undefined) {
  if (title !== "Al-Madina Jewellers: Gold Rate") {
    failures.push(`Title: is "${title}", the agreed title is "Al-Madina Jewellers: Gold Rate"`);
  }
  if (/\p{Extended_Pictographic}/u.test(title)) failures.push("Title: contains an emoji");
  if (/\b(best|top|#1|no\.? ?1|free|new|sale|discount)\b/i.test(title)) {
    failures.push(
      "Title: contains a ranking, price or promotional word Play's metadata policy forbids",
    );
  }
  const shouting = title.match(/\b[A-Z]{4,}\b/g);
  if (shouting) failures.push(`Title: words in capitals (${shouting.join(", ")})`);
}

const short = values["Short description"];
if (short !== undefined && /https?:\/\//i.test(short)) {
  failures.push("Short description: contains a link");
}

const full = values["Full description"];
if (full !== undefined) {
  const opening = full.trimStart().slice(0, 40).toLowerCase().replace(/[’‘]/g, "'");
  if (!opening.startsWith("today's gold rate in pakistan")) {
    failures.push(
      `Full description: must open with "today's gold rate in Pakistan", opens with "${full.slice(0, 40)}…"`,
    );
  }
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s) in ${file}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nEvery field is within Play's limits.");
