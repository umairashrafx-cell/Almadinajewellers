/**
 * Parses every migration with PostgreSQL's own grammar.
 *
 * This exists because of one afternoon. A note inside a block comment in
 * 20261102100000 contained a mime-type wildcard, whose slash-star opened a
 * second comment — PostgreSQL nests them — and the closer at the end of the
 * note only got back out of the inner one. The outer comment ran on and
 * swallowed the terminator of the DO block it was sitting in. The file read
 * perfectly in English. It was found by `supabase db push` failing against
 * production, halfway through a run, with the migration before it already
 * applied.
 *
 * Nothing here talks to a database. It cannot tell you whether a migration
 * will do what you meant, whether the role has the privileges it needs, or
 * whether a policy is right. It tells you the thing that is cheap to check
 * and expensive to get wrong: that every file parses.
 *
 * Two layers, because the failure above passed the first and failed the
 * second:
 *
 *   1. The statement grammar, which reads the file as PostgreSQL would.
 *   2. The plpgsql compiler, for every DO block body and function body. A
 *      dollar-quoted body is an opaque string to layer 1; comments inside it
 *      are only scanned when the body is compiled.
 *
 * Run it before any `supabase db push`:
 *
 *   bun run check:migrations
 *
 * Or against one folder of your own:
 *
 *   bun scripts/check-migrations.mjs some/other/folder
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadModule, parse, parsePlPgSQL } from "libpg-query";

/** The folder to read, so a suspect file can be checked on its own. */
const DIR = process.argv[2] ?? "supabase/migrations";

const TAG = "$probe$";

/**
 * One readable line for a parse failure.
 *
 * The parser usually hands back PostgreSQL's own message, which names the
 * fault and points at it. Sometimes the wrapper fails to decode that message
 * and throws a JSON error instead, whose text still carries the first word of
 * the real one. Rather than print that as though it were the fault, say what
 * is known and what it usually means.
 */
function describe(e) {
  const line = String(e?.message ?? e)
    .split("\n")[0]
    .trim();
  if (!line.startsWith("JSON Parse error")) return line;

  const word = line.match(/"([^"]+)"/)?.[1];
  return (
    (word ? `PostgreSQL rejected it with "${word}..."` : "PostgreSQL rejected it") +
    " — the rest of its message did not survive decoding. An unterminated" +
    " comment or quote is the usual cause."
  );
}

/** Every DO block body in a file, as plpgsql ready to be compiled. */
function doBodies(sql) {
  return [...sql.matchAll(/DO \$\$([\s\S]*?)\$\$;/g)]
    .map((m) => m[1])
    .filter((body) => !body.includes(TAG))
    .map(
      (body) =>
        `CREATE OR REPLACE FUNCTION pg_temp.probe() RETURNS void LANGUAGE plpgsql AS ${TAG}${body}${TAG};`,
    );
}

async function checkFile(path) {
  const sql = readFileSync(path, "utf8");
  const faults = [];

  try {
    await parse(sql);
  } catch (e) {
    faults.push("statement grammar: " + describe(e));
  }

  const bodies = doBodies(sql);
  for (const [i, body] of bodies.entries()) {
    try {
      await parsePlPgSQL(body);
    } catch (e) {
      faults.push(`DO block ${i + 1} of ${bodies.length}: ` + describe(e));
    }
  }

  if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(sql)) {
    try {
      await parsePlPgSQL(sql);
    } catch (e) {
      faults.push("function bodies: " + describe(e));
    }
  }

  return faults;
}

/**
 * Confirms the checker can still fail.
 *
 * A check that quietly stops checking is worse than no check, and this one
 * leans on a parser loaded at runtime. So it is handed the exact fault that
 * started all this and has to reject it.
 *
 * It runs last, after the real files. The parser reports a caught failure
 * less clearly once it has already reported one, so the files go first and
 * keep the readable message.
 */
async function canaryStillFails() {
  const nested = [
    "DO $$",
    "BEGIN",
    "  PERFORM 1;",
    "  /* a wildcard such as image/* opens a second comment */",
    "END $$;",
  ].join("\n");

  for (const body of doBodies(nested)) {
    try {
      await parsePlPgSQL(body);
    } catch {
      return true;
    }
  }
  return false;
}

await loadModule();

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let failed = 0;
for (const name of files) {
  const faults = await checkFile(join(DIR, name));
  if (faults.length === 0) continue;
  failed += 1;
  console.error("FAIL  " + name);
  for (const f of faults) console.error("      " + f);
}

if (!(await canaryStillFails())) {
  console.error(
    "The checker could not reproduce a known parse fault, so it is not\n" +
      "checking anything. Look at libpg-query before trusting a pass.",
  );
  process.exit(2);
}

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} migrations will not parse.`);
  process.exit(1);
}

console.log(`${files.length} migrations parse, bodies included.`);
