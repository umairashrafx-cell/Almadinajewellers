/**
 * The ayah on the zakat screen and on what it shares.
 *
 * Al-Baqarah 2:110, because it asks for zakat beside prayer and then says
 * where the money goes: whatever good is sent ahead is found again with
 * Allah. It encourages rather than warns, which suits a sum somebody chose to
 * work out.
 *
 * Both texts are copied exactly, never retyped or trimmed. The Arabic is the
 * Tanzil "simple" text rather than the Uthmani the Home ayat uses: the share
 * picture draws it with the phone's own Noto Naskh, offline included, and the
 * simple text needs none of the Quranic marks that face may not carry.
 * `bun run check:ayat` compares it with the simple editions for that reason. The
 * Urdu is Fateh Muhammad Jalandhry's translation, the one most Pakistani
 * households read, with his wording kept, "خدا" included. Both came from
 * api.alquran.cloud on 24 November 2026; if either is ever changed, take it
 * from a published edition again rather than editing a word here.
 */
export const ZAKAT_AYAH = {
  arabic:
    "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ ۚ وَمَا تُقَدِّمُوا لِأَنْفُسِكُمْ مِنْ خَيْرٍ تَجِدُوهُ عِنْدَ اللَّهِ ۗ إِنَّ اللَّهَ بِمَا تَعْمَلُونَ بَصِيرٌ",
  urdu: "اور نماز ادا کرتے رہو اور زکوٰة دیتے رہو۔ اور جو بھلائی اپنے لیے آگے بھیج رکھو گے، اس کو خدا کے ہاں پا لو گے۔ کچھ شک نہیں کہ خدا تمہارے سب کاموں کو دیکھ رہا ہے",
  /** How the reference reads in Urdu, under the translation. */
  referenceUrdu: "سورۃ البقرہ، آیت ۱۱۰",
  reference: "Al-Baqarah 2:110",
  translator: "فتح محمد جالندھری",
} as const;
