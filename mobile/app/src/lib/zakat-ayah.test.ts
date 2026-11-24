import { describe, expect, test } from "vitest";

import { ZAKAT_AYAH } from "./zakat-ayah";

/*
 * Guards against the ayah being retyped or trimmed by hand. The Arabic and the
 * Urdu were copied whole from published editions; these checks fail if either
 * loses its opening or closing words, picks up stray Latin letters, or gains
 * the whitespace an editor leaves behind.
 *
 * Compared in Unicode's canonical order. The Tanzil text puts a shadda before
 * the fatha on the same letter, an editor typing it puts them the other way,
 * and both draw the same; NFC makes them compare equal without the stored
 * text being touched.
 */
const nfc = (text: string) => text.normalize("NFC");

describe("the zakat ayah", () => {
  test("is Al-Baqarah 2:110 in full", () => {
    const arabic = nfc(ZAKAT_AYAH.arabic);
    expect(ZAKAT_AYAH.reference).toBe("Al-Baqarah 2:110");
    expect(arabic.startsWith(nfc("وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ"))).toBe(true);
    expect(arabic.endsWith(nfc("إِنَّ اللَّهَ بِمَا تَعْمَلُونَ بَصِيرٌ"))).toBe(true);
  });

  test("carries Jalandhry's translation whole", () => {
    const urdu = nfc(ZAKAT_AYAH.urdu);
    expect(urdu.startsWith(nfc("اور نماز ادا کرتے رہو"))).toBe(true);
    expect(urdu.endsWith(nfc("تمہارے سب کاموں کو دیکھ رہا ہے"))).toBe(true);
  });

  test("has no Latin letters or stray whitespace in either text", () => {
    for (const text of [ZAKAT_AYAH.arabic, ZAKAT_AYAH.urdu, ZAKAT_AYAH.referenceUrdu]) {
      expect(text).not.toMatch(/[A-Za-z]/);
      expect(text).toBe(text.trim());
      expect(text).not.toMatch(/\s{2,}/);
    }
  });
});
