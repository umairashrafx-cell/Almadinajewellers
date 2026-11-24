/**
 * Re-verifies every ayat bundled in the app against its sources.
 *
 * `bun run check:ayat`
 *
 * The reason this exists rather than a note saying the text was checked once:
 * a note cannot be run. mobile/app/src/lib/ayat.ts holds scripture, in two
 * scripts nobody on this project reads fluently enough to proofread by eye,
 * and a single character lost to a bad merge, a stray edit or an editor that
 * helpfully normalised a diacritic would be invisible in review and wrong on
 * a thousand phones. So the claim the file makes about itself is checkable,
 * and this is the check.
 *
 * What it does, for each of the 26 entries:
 *
 *   - fetches the Arabic from Tanzil Project (tanzil.net), api.alquran.cloud
 *     and api.quran.com, and the Urdu from Tanzil and api.quran.com;
 *   - compares all of them to what is in the file, ignoring only differences
 *     that are known to be encoding rather than text (see `skeleton` below);
 *   - fails loudly, naming the verse and the sources that disagree.
 *
 * It needs the network and it is not part of `bun run test`, deliberately:
 * the test suite must pass in a basement, and three public services must not
 * be able to break a build. Run this when the set changes, and whenever you
 * want to be sure of what is shipping.
 */

const SOURCES = {
  tanzilArabic:
    "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true",
  tanzilUrdu: "https://tanzil.net/trans/ur.jalandhry",
};

const UA = "al-madina-jewellers-ayat-check/1.0";

/** The one place the expected shape of the data file is written down. */
const ENTRY =
  /\{\s*surah:\s*(\d+),\s*ayah:\s*(\d+),\s*surahName:\s*"([^"]*)",\s*surahArabic:\s*"([^"]*)",\s*arabic:\s*"([^"]*)",\s*urdu:\s*"([^"]*)",\s*\}/g;

async function text(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return await response.text();
}

async function json(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return await response.json();
}

/** Tanzil's "surah|ayah|text" files, as a map keyed "55:9". */
function parsePipeFile(body) {
  const held = new Map();
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("|");
    if (parts.length < 3) continue;
    const [surah, ayah, ...rest] = parts;
    held.set(`${Number(surah)}:${Number(ayah)}`, rest.join("|").trim());
  }
  return held;
}

/*
 * What counts as the same text.
 *
 * Two services can serve the same verse and still differ byte for byte, in
 * ways that are not disagreements about the text:
 *
 *   - api.alquran.cloud prefixes the Basmala to the first ayat of a surah;
 *   - the Uthmani text is published with and without the alif wasla (U+0671),
 *     and with آ written either as one character or as hamza plus alif;
 *   - verse-number and sajda marks (U+06DD, U+06DE) are included by some and
 *     not by others, as are the juz marks that look like ۞.
 *
 * So the comparison is on the consonantal skeleton: vowels, the Quranic
 * annotation marks and the orthographic variants above are folded away, and
 * what is left either matches letter for letter or does not. A real difference
 * — a missing word, a different word — survives this and fails the check.
 */
function skeleton(raw) {
  return (
    raw
      .normalize("NFC")
      // Vowels, sukun, shadda, superscript alif, and the Quranic annotation
      // marks (small high seen, rub-el-hizb, sajda, and the rest of U+06D6-ED).
      .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/gu, "")
      // Alif in its various dresses.
      .replace(/[ٱآأإ]/gu, "ا")
      // آ as hamza + alif.
      .replace(/ءا/gu, "ا")
      // End-of-ayah and sajda marks, and the Arabic-script signs that are not
      // letters (U+0600-0605 are the number/year signs).
      .replace(/[؀-؅۝۞۩]/gu, "")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

/** The Urdu, with the diacritics a publisher may or may not have set. */
function urduSkeleton(raw) {
  return raw
    .normalize("NFC")
    .replace(/[ً-ْٰ]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Drops the footnote markup api.quran.com includes in its translations. */
function stripMarkup(raw) {
  return raw
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gu, "")
    .replace(/<[^>]+>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

async function main() {
  const file = await Bun.file(new URL("../mobile/app/src/lib/ayat.ts", import.meta.url)).text();

  const entries = [...file.matchAll(ENTRY)].map((m) => ({
    key: `${Number(m[1])}:${Number(m[2])}`,
    surah: Number(m[1]),
    ayah: Number(m[2]),
    surahName: m[3],
    arabic: m[5],
    urdu: m[6],
  }));

  if (entries.length === 0) {
    console.error(
      "Read no entries out of mobile/app/src/lib/ayat.ts.\n" +
        "Either the file moved or its shape changed; this script's ENTRY pattern\n" +
        "has to be updated to match, because a check that silently finds nothing\n" +
        "to check is worse than no check.",
    );
    process.exit(1);
  }

  console.log(`Checking ${entries.length} ayat against three sources.\n`);

  console.log("Fetching the Tanzil text files...");
  const [tanzilArabic, tanzilUrdu] = await Promise.all([
    text(SOURCES.tanzilArabic).then(parsePipeFile),
    text(SOURCES.tanzilUrdu).then(parsePipeFile),
  ]);

  const failures = [];

  for (const entry of entries) {
    const { key } = entry;
    const cloud = await json(
      `https://api.alquran.cloud/v1/ayah/${key}/editions/quran-uthmani,ur.jalandhry`,
    );
    const comApi = await json(
      `https://api.quran.com/api/v4/verses/by_key/${key}?fields=text_uthmani&translations=234`,
    );

    const cloudArabic = cloud.data.find((e) => e.edition.identifier === "quran-uthmani").text;
    const cloudUrdu = cloud.data.find((e) => e.edition.identifier === "ur.jalandhry").text;
    const comArabic = comApi.verse.text_uthmani;
    const comUrdu = stripMarkup(comApi.verse.translations[0].text);

    const mine = skeleton(entry.arabic);
    const mineUrdu = urduSkeleton(entry.urdu);

    const checks = [
      ["arabic / tanzil.net", mine === skeleton(tanzilArabic.get(key) ?? "")],
      ["arabic / api.alquran.cloud", mine === skeleton(cloudArabic)],
      ["arabic / api.quran.com", mine === skeleton(comArabic)],
      ["urdu / tanzil.net", mineUrdu === urduSkeleton(tanzilUrdu.get(key) ?? "")],
      ["urdu / api.alquran.cloud", mineUrdu === urduSkeleton(cloudUrdu)],
      ["urdu / api.quran.com", mineUrdu === urduSkeleton(comUrdu)],
    ];

    const bad = checks.filter(([, passed]) => !passed).map(([name]) => name);
    if (bad.length > 0) {
      failures.push({ key, surahName: entry.surahName, bad });
      console.log(`  FAIL  ${key.padEnd(8)} ${entry.surahName}  — ${bad.join(", ")}`);
    } else {
      console.log(`  ok    ${key.padEnd(8)} ${entry.surahName}`);
    }
  }

  console.log();
  if (failures.length > 0) {
    console.error(
      `${failures.length} of ${entries.length} ayat do not match their sources.\n\n` +
        "Do not fix this by editing the text to agree with one source. Either the\n" +
        "file was changed and must be put back from tanzil.net, or the sources now\n" +
        "disagree with each other — in which case drop the verse. Deciding between\n" +
        "two readings of scripture is not this project's call to make.",
    );
    process.exit(1);
  }

  console.log(
    `All ${entries.length} ayat match Tanzil Project, api.alquran.cloud and api.quran.com.\n` +
      "Arabic: Tanzil Quran Text (Uthmani), CC BY 3.0, tanzil.net\n" +
      "Urdu:   Fateh Muhammad Jalandhri, via tanzil.net — see docs/daily-ayat.md\n" +
      "        for the licence position, which is not settled.",
  );
}

await main();
