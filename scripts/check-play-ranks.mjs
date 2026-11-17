/**
 * Where the app comes in Google Play search, for the searches it is written for.
 *
 *   node scripts/check-play-ranks.mjs        (or: bun run check:play-ranks)
 *
 * Fetches Play's public search page for each term, as a phone in Pakistan
 * with its language set to English would see it (`gl=PK&hl=en`), and prints
 * where com.almadinajeweller.app comes, or that it is not in the results Play
 * returns (about 30). Run it from Pakistan: Play also ranks by where the
 * request comes from.
 *
 * The baseline, taken on 17 November 2026 before the search pass, is in
 * docs/aso/ASO_PLAN.md. Play takes days to re-rank after a listing changes,
 * and weighs installs and ratings heavily, so compare a week and a month on,
 * not an hour.
 *
 * Read-only: it fetches public pages and sends nothing. It does not exit
 * non-zero on a bad rank, because a rank is a measurement, not a test.
 */
const APP = "com.almadinajeweller.app";

/** Kept in step with the table in docs/aso/ASO_PLAN.md. */
const SEARCHES = [
  "gold rate",
  "gold rate pakistan",
  "gold rate today",
  "gold price pakistan",
  "aaj ka gold rate",
  "sone ka rate",
  "sona rate",
  "tola rate",
  "gold calculator",
  "gold rate mandi bahauddin",
  "سونے کا ریٹ",
  "al madina jewellers",
];

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
  "accept-language": "en-PK,en;q=0.9",
};

async function rank(search) {
  const url = `https://play.google.com/store/search?q=${encodeURIComponent(search)}&c=apps&gl=PK&hl=en`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) return { error: `HTTP ${response.status}` };

  const ids = [];
  for (const match of (await response.text()).matchAll(/details\?id=([A-Za-z0-9._]+)/g)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  const at = ids.indexOf(APP);
  return { position: at === -1 ? null : at + 1, of: ids.length, leader: ids[0] };
}

console.log(`Google Play search, Pakistan, ${new Date().toISOString().slice(0, 10)}\n`);
for (const search of SEARCHES) {
  try {
    const result = await rank(search);
    const where = result.error
      ? result.error
      : result.position
        ? `#${result.position}`
        : `not in top ${result.of}`;
    console.log(`  ${search.padEnd(28)} ${where.padEnd(16)} first: ${result.leader ?? "-"}`);
  } catch (error) {
    console.log(`  ${search.padEnd(28)} failed: ${error.message}`);
  }
}
