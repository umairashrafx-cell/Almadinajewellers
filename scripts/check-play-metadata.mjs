/**
 * The Play listing text against Play's limits, before anyone pastes it.
 *
 *   node scripts/check-play-metadata.mjs            (or: bun run check:play-metadata)
 *   node scripts/check-play-metadata.mjs path/to/other.md
 *
 * Reads docs/aso/PLAY_STORE_METADATA.md, takes the fenced `text` block under
 * each field's heading — the default English listing ("## Title", "## Short
 * description", "## Full description") and its Urdu translation ("## Urdu
 * title" and so on) — and fails, exit code 1, if any field is empty or over
 * its limit:
 *
 *   Title              30 characters
 *   Short description  80
 *   Full description   4,000
 *
 * It then prints how often each search term in docs/aso/ASO_PLAN.md appears
 * in each listing. That count is for reading, not a pass mark: Play
 * penalises repetition, so the aim is each term present, not each term often.
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

/** The title agreed on 17 November 2026; see docs/aso/ASO_PLAN.md. */
const AGREED_TITLE = "Al-Madina: Gold Rate Pakistan";

const FIELDS = [
  { heading: "Title", limit: 30 },
  { heading: "Short description", limit: 80 },
  { heading: "Full description", limit: 4000 },
  { heading: "Urdu title", limit: 30 },
  { heading: "Urdu short description", limit: 80 },
  { heading: "Urdu full description", limit: 4000 },
];

/**
 * The searches the listing is written for, from docs/aso/ASO_PLAN.md: what
 * Pakistani customers type, in English, Roman Urdu and Urdu script.
 */
const TERMS = [
  "gold rate",
  "gold rate today",
  "pakistan",
  "gold price",
  "tola",
  "24k",
  "22k",
  "silver",
  "calculator",
  "sell",
  "jewellery",
  "mandi bahauddin",
  "aaj ka",
  "sone ka rate",
  "سونے کا ریٹ",
  "تولہ",
  "چاندی",
  "زیور",
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
  console.log(`${status} ${heading.padEnd(24)} ${String(used).padStart(4)} / ${limit}`);
  if (!value.trim()) failures.push(`${heading}: empty`);
  if (used > limit)
    failures.push(`${heading}: ${used} characters, ${used - limit} over the limit of ${limit}`);
  if (value !== value.trim())
    failures.push(`${heading}: leading or trailing whitespace would be pasted too`);
}

if (values["Title"] !== undefined && values["Title"] !== AGREED_TITLE) {
  failures.push(`Title: is "${values["Title"]}", the agreed title is "${AGREED_TITLE}"`);
}

/** What Play's metadata policy refuses in a title, in either language. */
for (const heading of ["Title", "Urdu title"]) {
  const title = values[heading];
  if (title === undefined) continue;
  if (/\p{Extended_Pictographic}/u.test(title)) failures.push(`${heading}: contains an emoji`);
  if (/\b(best|top|#1|no\.? ?1|free|new|sale|discount)\b/i.test(title)) {
    failures.push(
      `${heading}: contains a ranking, price or promotional word Play's metadata policy forbids`,
    );
  }
  const shouting = title.match(/\b[A-Z]{4,}\b/g);
  if (shouting) failures.push(`${heading}: words in capitals (${shouting.join(", ")})`);
}

/**
 * Play's short-description guidelines, which the Console enforces by not
 * promoting a listing that breaks them: no links, and em dashes (—) rather
 * than en dashes (–) or double hyphens. The Console flagged the en dash on
 * 17 November 2026.
 */
for (const heading of ["Short description", "Urdu short description"]) {
  const short = values[heading];
  if (short === undefined) continue;
  if (/https?:\/\//i.test(short)) failures.push(`${heading}: contains a link`);
  if (/–|--/.test(short)) {
    failures.push(`${heading}: use an em dash (—), not an en dash (–) or a double hyphen`);
  }
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

/** Occurrences of a term, ignoring case, in one piece of text. */
function count(text, term) {
  return text.toLowerCase().split(term.toLowerCase()).length - 1;
}

const listings = {
  English: ["Title", "Short description", "Full description"],
  Urdu: ["Urdu title", "Urdu short description", "Urdu full description"],
};
console.log("\nSearch terms (title / short / full):");
for (const term of TERMS) {
  const cells = Object.entries(listings).map(([name, headings]) => {
    const counts = headings.map((h) => count(values[h] ?? "", term));
    return `${name} ${counts.join("/")}`;
  });
  console.log(`  ${term.padEnd(16)} ${cells.join("   ")}`);
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s) in ${file}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nEvery field is within Play's limits.");
