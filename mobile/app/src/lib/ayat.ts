import { daysBetween, pktDay } from "@/lib/pkt";

/**
 * One ayat a day, on the home screen.
 *
 * The shop asked for this in its own words: "app main home py daily islami
 * qoute ya ayat with urdu translation show ho". What makes it unlike anything
 * else on that screen is that nothing here can be approximately right. A rate
 * an hour stale is a stale rate; a word out of place in an ayat is a different
 * thing altogether, and the shop would be the one that published it to its own
 * town.
 *
 * So three rules govern this file, and they matter more than any feature that
 * might be added to it later.
 *
 * FIRST: not a word of the Arabic or the Urdu was typed by hand, by anybody.
 * Both were copied out of Tanzil Project's published text files and then
 * compared, character for character, against two independent services —
 * api.alquran.cloud and api.quran.com — before being written here. The script
 * that does the comparing is in the repository as scripts/check-ayat.mjs and
 * `bun run check:ayat` runs it, so this file can be re-verified by anybody at
 * any time, including after a careless edit. Where sources disagreed the verse
 * was dropped rather than adjudicated: it is not this project's place to
 * decide between two readings of scripture.
 *
 * SECOND: Quran only, no hadith. A great deal of what circulates as an
 * "Islamic quote" is fabricated or misattributed, and checking a hadith's
 * chain is not something a jeweller's app can do responsibly. The Quran has a
 * fixed text with a number on every verse, which is what makes it checkable.
 *
 * THIRD: every verse stands on its own. A verse that opens mid-sentence, or
 * that only means what it means alongside the one before it, was left out
 * however well known it is — 103:3 begins "except those who…" and 65:3 begins
 * "and He will provide for him", and neither belongs alone on a phone screen.
 * Verses addressed to the Prophet in particular, and verses carrying a
 * battlefield or a legal ruling, were left out for the same reason. What is
 * left is 26 verses a shopkeeper can show his town without a footnote.
 *
 * A fixed bundled set rather than a live API, deliberately, for three reasons
 * that all point the same way: the app's screens already work in a basement
 * and this one should too; a set in the repository cannot change under the
 * shop between one release and the next; and the owner can read all 26 in one
 * sitting and approve them, which he cannot do with a feed. docs/daily-ayat.md
 * is that list, in one place, with an English gloss beside each one.
 *
 * SOURCES AND TERMS, stated here because the repository is public and because
 * the question is a real one:
 *
 * - The Arabic is the Tanzil Quran Text (Uthmani, version 1.1), copyright
 *   2007-2026 Tanzil Project, licensed Creative Commons Attribution 3.0.
 *   Verbatim copies may be distributed; changing the text is not allowed; the
 *   source must be indicated and linked. Hence TEXT_SOURCE below, shown on the
 *   card.
 *
 * - The Urdu is Fateh Muhammad Jalandhri's translation, as published by Tanzil
 *   at tanzil.net/trans/ur.jalandhry. Unlike the Arabic text, that file carries
 *   NO licence grant — only attribution metadata — and the translator's
 *   copyright position could not be established. Urdu Wikipedia gives his death
 *   as 18 December 1982, which under Pakistan's Copyright Ordinance (life plus
 *   fifty years) would keep the translation in copyright until the end of 2032,
 *   but that date is unsourced on the page itself. What is bundled here is 26
 *   verses out of 6,236, each named and attributed on screen — a short extract
 *   rather than the work. docs/daily-ayat.md records this openly, along with
 *   the two Urdu translations that are unambiguously out of copyright, so the
 *   decision stays the shop's to revisit.
 */
export type Ayat = {
  /** Surah number, 1-114. */
  readonly surah: number;
  /** Ayat number within the surah. */
  readonly ayah: number;
  /** "Ar-Rahman" — for the citation line, from api.quran.com's chapter list. */
  readonly surahName: string;
  /** "الرحمن" — the surah's own name, for the Arabic block. */
  readonly surahArabic: string;
  /** Tanzil Uthmani, verbatim. */
  readonly arabic: string;
  /** Jalandhri, verbatim. */
  readonly urdu: string;
};

/**
 * The translator, named on screen beside every verse.
 *
 * Not decoration. A translation shown without its translator is a translation
 * the reader cannot check, and a reader who wants to hold this one against the
 * copy in his own house needs to know which one it is.
 */
export const URDU_TRANSLATOR = "Fateh Muhammad Jalandhri";

/** Where the text came from. Tanzil's terms ask for the link; so does honesty. */
export const TEXT_SOURCE = "tanzil.net";

/**
 * The reviewed set, in the order it rotates.
 *
 * Ordered by subject rather than by surah number, and interleaved, so that a
 * week does not read as a run of one theme: honest weighing, which is this
 * shop's own trade; gratitude and provision; patience; reliance and
 * remembrance; conduct and speech; effort and mercy.
 *
 * Adding to this list is not a code change, it is a verification job. Run
 * `bun run check:ayat` afterwards, and if it does not pass, the entry is wrong.
 */
export const AYAT: readonly Ayat[] = [
  {
    surah: 55,
    ayah: 9,
    surahName: "Ar-Rahman",
    surahArabic: "الرحمن",
    arabic: "وَأَقِيمُوا۟ ٱلْوَزْنَ بِٱلْقِسْطِ وَلَا تُخْسِرُوا۟ ٱلْمِيزَانَ",
    urdu: "اور انصاف کے ساتھ ٹھیک تولو۔ اور تول کم مت کرو",
  },
  {
    surah: 17,
    ayah: 35,
    surahName: "Al-Isra",
    surahArabic: "الإسراء",
    arabic:
      "وَأَوْفُوا۟ ٱلْكَيْلَ إِذَا كِلْتُمْ وَزِنُوا۟ بِٱلْقِسْطَاسِ ٱلْمُسْتَقِيمِ ذَٰلِكَ خَيْرٌ وَأَحْسَنُ تَأْوِيلًا",
    urdu: "اور جب (کوئی چیز) ناپ کر دینے لگو تو پیمانہ پورا بھرا کرو اور (جب تول کر دو تو) ترازو سیدھی رکھ کر تولا کرو۔ یہ بہت اچھی بات اور انجام کے لحاظ سے بھی بہت بہتر ہے",
  },
  {
    surah: 26,
    ayah: 181,
    surahName: "Ash-Shu'ara",
    surahArabic: "الشعراء",
    arabic: "أَوْفُوا۟ ٱلْكَيْلَ وَلَا تَكُونُوا۟ مِنَ ٱلْمُخْسِرِينَ",
    urdu: "(دیکھو) پیمانہ پورا بھرا کرو اور نقصان نہ کیا کرو",
  },
  {
    surah: 16,
    ayah: 90,
    surahName: "An-Nahl",
    surahArabic: "النحل",
    arabic:
      "إِنَّ ٱللَّهَ يَأْمُرُ بِٱلْعَدْلِ وَٱلْإِحْسَٰنِ وَإِيتَآئِ ذِى ٱلْقُرْبَىٰ وَيَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ وَٱلْبَغْىِ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ",
    urdu: "خدا تم کو انصاف اور احسان کرنے اور رشتہ داروں کو (خرچ سے مدد) دینے کا حکم دیتا ہے۔ اور بےحیائی اور نامعقول کاموں سے اور سرکشی سے منع کرتا ہے (اور) تمہیں نصیحت کرتا ہے تاکہ تم یاد رکھو",
  },
  {
    surah: 11,
    ayah: 85,
    surahName: "Hud",
    surahArabic: "هود",
    arabic:
      "وَيَٰقَوْمِ أَوْفُوا۟ ٱلْمِكْيَالَ وَٱلْمِيزَانَ بِٱلْقِسْطِ وَلَا تَبْخَسُوا۟ ٱلنَّاسَ أَشْيَآءَهُمْ وَلَا تَعْثَوْا۟ فِى ٱلْأَرْضِ مُفْسِدِينَ",
    urdu: "اور قوم! ماپ اور تول انصاف کے ساتھ پوری پوری کیا کرو اور لوگوں کو ان کی چیزیں کم نہ دیا کرو اور زمین میں خرابی کرتے نہ پھرو",
  },
  {
    surah: 2,
    ayah: 152,
    surahName: "Al-Baqarah",
    surahArabic: "البقرة",
    arabic: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ",
    urdu: "سو تم مجھے یاد کرو۔ میں تمہیں یاد کیا کروں گا۔ اور میرے احسان مانتے رہنا اور ناشکری نہ کرنا",
  },
  {
    surah: 14,
    ayah: 7,
    surahName: "Ibrahim",
    surahArabic: "ابراهيم",
    arabic:
      "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِى لَشَدِيدٌ",
    urdu: "اور جب تمہارے پروردگار نے (تم کو) آگاہ کیا کہ اگر شکر کرو گے تو میں تمہیں زیادہ دوں گا اور اگر ناشکری کرو گے تو (یاد رکھو کہ) میرا عذاب بھی سخت ہے",
  },
  {
    surah: 51,
    ayah: 58,
    surahName: "Adh-Dhariyat",
    surahArabic: "الذاريات",
    arabic: "إِنَّ ٱللَّهَ هُوَ ٱلرَّزَّاقُ ذُو ٱلْقُوَّةِ ٱلْمَتِينُ",
    urdu: "خدا ہی تو رزق دینے والا زور آور اور مضبوط ہے",
  },
  {
    surah: 16,
    ayah: 18,
    surahName: "An-Nahl",
    surahArabic: "النحل",
    arabic: "وَإِن تَعُدُّوا۟ نِعْمَةَ ٱللَّهِ لَا تُحْصُوهَآ إِنَّ ٱللَّهَ لَغَفُورٌ رَّحِيمٌ",
    urdu: "اور اگر تم خدا کی نعمتوں کو شمار کرنا چاہو تو گن نہ سکو۔ بےشک خدا بخشنے والا مہربان ہے",
  },
  {
    surah: 67,
    ayah: 15,
    surahName: "Al-Mulk",
    surahArabic: "الملك",
    arabic:
      "هُوَ ٱلَّذِى جَعَلَ لَكُمُ ٱلْأَرْضَ ذَلُولًا فَٱمْشُوا۟ فِى مَنَاكِبِهَا وَكُلُوا۟ مِن رِّزْقِهِۦ وَإِلَيْهِ ٱلنُّشُورُ",
    urdu: "وہی تو ہے جس نے تمہارے لئے زمین کو نرم کیا تو اس کی راہوں میں چلو پھرو اور خدا کا (دیا ہو) رزق کھاؤ اور تم کو اسی کے پاس (قبروں سے) نکل کر جانا ہے",
  },
  {
    surah: 35,
    ayah: 15,
    surahName: "Fatir",
    surahArabic: "فاطر",
    arabic:
      "يَٰٓأَيُّهَا ٱلنَّاسُ أَنتُمُ ٱلْفُقَرَآءُ إِلَى ٱللَّهِ وَٱللَّهُ هُوَ ٱلْغَنِىُّ ٱلْحَمِيدُ",
    urdu: "لوگو تم (سب) خدا کے محتاج ہو اور خدا بےپروا سزاوار (حمد وثنا) ہے",
  },
  {
    surah: 2,
    ayah: 153,
    surahName: "Al-Baqarah",
    surahArabic: "البقرة",
    arabic:
      "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ",
    urdu: "اے ایمان والو صبر اور نماز سے مدد لیا کرو بےشک خدا صبر کرنے والوں کے ساتھ ہے",
  },
  {
    surah: 94,
    ayah: 6,
    surahName: "Ash-Sharh",
    surahArabic: "الشرح",
    arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
    urdu: "(اور) بے شک مشکل کے ساتھ آسانی ہے",
  },
  {
    surah: 39,
    ayah: 10,
    surahName: "Az-Zumar",
    surahArabic: "الزمر",
    arabic:
      "قُلْ يَٰعِبَادِ ٱلَّذِينَ ءَامَنُوا۟ ٱتَّقُوا۟ رَبَّكُمْ لِلَّذِينَ أَحْسَنُوا۟ فِى هَٰذِهِ ٱلدُّنْيَا حَسَنَةٌ وَأَرْضُ ٱللَّهِ وَٰسِعَةٌ إِنَّمَا يُوَفَّى ٱلصَّٰبِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ",
    urdu: "کہہ دو کہ اے میرے بندو جو ایمان لائے ہو اپنے پروردگار سے ڈرو۔ جنہوں نے اس دنیا میں نیکی کی ان کے لئے بھلائی ہے۔ اور خدا کی زمین کشادہ ہے۔ جو صبر کرنے والے ہیں ان کو بےشمار ثواب ملے گا",
  },
  {
    surah: 9,
    ayah: 51,
    surahName: "At-Tawbah",
    surahArabic: "التوبة",
    arabic:
      "قُل لَّن يُصِيبَنَآ إِلَّا مَا كَتَبَ ٱللَّهُ لَنَا هُوَ مَوْلَىٰنَا وَعَلَى ٱللَّهِ فَلْيَتَوَكَّلِ ٱلْمُؤْمِنُونَ",
    urdu: "کہہ دو کہ ہم کو کوئی مصیبت نہیں پہنچ سکتی بجز اس کے جو خدا نے ہمارے لیے لکھ دی ہو وہی ہمارا کارساز ہے۔ اور مومنوں کو خدا ہی کا بھروسہ رکھنا چاہیئے",
  },
  {
    surah: 13,
    ayah: 28,
    surahName: "Ar-Ra'd",
    surahArabic: "الرعد",
    arabic:
      "ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ",
    urdu: "(یعنی) جو لوگ ایمان لاتے اور جن کے دل یادِ خدا سے آرام پاتے ہیں (ان کو) اور سن رکھو کہ خدا کی یاد سے دل آرام پاتے ہیں",
  },
  {
    surah: 20,
    ayah: 14,
    surahName: "Taha",
    surahArabic: "طه",
    arabic:
      "إِنَّنِىٓ أَنَا ٱللَّهُ لَآ إِلَٰهَ إِلَّآ أَنَا۠ فَٱعْبُدْنِى وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ",
    urdu: "بےشک میں ہی خدا ہوں۔ میرے سوا کوئی معبود نہیں تو میری عبادت کرو اور میری یاد کے لئے نماز پڑھا کرو",
  },
  {
    surah: 31,
    ayah: 18,
    surahName: "Luqman",
    surahArabic: "لقمان",
    arabic:
      "وَلَا تُصَعِّرْ خَدَّكَ لِلنَّاسِ وَلَا تَمْشِ فِى ٱلْأَرْضِ مَرَحًا إِنَّ ٱللَّهَ لَا يُحِبُّ كُلَّ مُخْتَالٍ فَخُورٍ",
    urdu: "اور (ازراہ غرور) لوگوں سے گال نہ پھلانا اور زمین میں اکڑ کر نہ چلنا۔ کہ خدا کسی اترانے والے خود پسند کو پسند نہیں کرتا",
  },
  {
    surah: 2,
    ayah: 263,
    surahName: "Al-Baqarah",
    surahArabic: "البقرة",
    arabic:
      "قَوْلٌ مَّعْرُوفٌ وَمَغْفِرَةٌ خَيْرٌ مِّن صَدَقَةٍ يَتْبَعُهَآ أَذًى وَٱللَّهُ غَنِىٌّ حَلِيمٌ",
    urdu: "جس خیرات دینے کے بعد (لینے والے کو) ایذا دی جائے اس سے تو نرم بات کہہ دینی اور (اس کی بے ادبی سے) درگزر کرنا بہتر ہے اور خدا بےپروا اور بردبار ہے",
  },
  {
    surah: 41,
    ayah: 34,
    surahName: "Fussilat",
    surahArabic: "فصلت",
    arabic:
      "وَلَا تَسْتَوِى ٱلْحَسَنَةُ وَلَا ٱلسَّيِّئَةُ ٱدْفَعْ بِٱلَّتِى هِىَ أَحْسَنُ فَإِذَا ٱلَّذِى بَيْنَكَ وَبَيْنَهُۥ عَدَٰوَةٌ كَأَنَّهُۥ وَلِىٌّ حَمِيمٌ",
    urdu: "اور بھلائی اور برائی برابر نہیں ہوسکتی۔ تو (سخت کلامی کا) ایسے طریق سے جواب دو جو بہت اچھا ہو (ایسا کرنے سے تم دیکھو گے) کہ جس میں اور تم میں دشمنی تھی گویا وہ تمہارا گرم جوش دوست ہے",
  },
  {
    surah: 17,
    ayah: 53,
    surahName: "Al-Isra",
    surahArabic: "الإسراء",
    arabic:
      "وَقُل لِّعِبَادِى يَقُولُوا۟ ٱلَّتِى هِىَ أَحْسَنُ إِنَّ ٱلشَّيْطَٰنَ يَنزَغُ بَيْنَهُمْ إِنَّ ٱلشَّيْطَٰنَ كَانَ لِلْإِنسَٰنِ عَدُوًّا مُّبِينًا",
    urdu: "اور میرے بندوں سے کہہ دو کہ (لوگوں سے) ایسی باتیں کہا کریں جو بہت پسندیدہ ہوں۔ کیونکہ شیطان (بری باتوں سے) ان میں فساد ڈلوا دیتا ہے۔ کچھ شک نہیں کہ شیطان انسان کا کھلا دشمن ہے",
  },
  {
    surah: 49,
    ayah: 10,
    surahName: "Al-Hujurat",
    surahArabic: "الحجرات",
    arabic:
      "إِنَّمَا ٱلْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا۟ بَيْنَ أَخَوَيْكُمْ وَٱتَّقُوا۟ ٱللَّهَ لَعَلَّكُمْ تُرْحَمُونَ",
    urdu: "مومن تو آپس میں بھائی بھائی ہیں۔ تو اپنے دو بھائیوں میں صلح کرادیا کرو۔ اور خدا سے ڈرتے رہو تاکہ تم پر رحمت کی جائے",
  },
  {
    surah: 29,
    ayah: 69,
    surahName: "Al-'Ankabut",
    surahArabic: "العنكبوت",
    arabic:
      "وَٱلَّذِينَ جَٰهَدُوا۟ فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا وَإِنَّ ٱللَّهَ لَمَعَ ٱلْمُحْسِنِينَ",
    urdu: "اور جن لوگوں نے ہمارے لئے کوشش کی ہم اُن کو ضرور اپنے رستے دکھا دیں گے۔ اور خدا تو نیکو کاروں کے ساتھ ہے",
  },
  {
    surah: 53,
    ayah: 39,
    surahName: "An-Najm",
    surahArabic: "النجم",
    arabic: "وَأَن لَّيْسَ لِلْإِنسَٰنِ إِلَّا مَا سَعَىٰ",
    urdu: "اور یہ کہ انسان کو وہی ملتا ہے جس کی وہ کوشش کرتا ہے",
  },
  {
    surah: 39,
    ayah: 53,
    surahName: "Az-Zumar",
    surahArabic: "الزمر",
    arabic:
      "قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ",
    urdu: "(اے پیغمبر میری طرف سے لوگوں کو) کہہ دو کہ اے میرے بندو جنہوں نے اپنی جانوں پر زیادتی کی ہے خدا کی رحمت سے ناامید نہ ہونا۔ خدا تو سب گناہوں کو بخش دیتا ہے۔ (اور) وہ تو بخشنے والا مہربان ہے",
  },
  {
    surah: 16,
    ayah: 97,
    surahName: "An-Nahl",
    surahArabic: "النحل",
    arabic:
      "مَنْ عَمِلَ صَٰلِحًا مِّن ذَكَرٍ أَوْ أُنثَىٰ وَهُوَ مُؤْمِنٌ فَلَنُحْيِيَنَّهُۥ حَيَوٰةً طَيِّبَةً وَلَنَجْزِيَنَّهُمْ أَجْرَهُم بِأَحْسَنِ مَا كَانُوا۟ يَعْمَلُونَ",
    urdu: "جو شخص نیک اعمال کرے گا مرد ہو یا عورت وہ مومن بھی ہوگا تو ہم اس کو (دنیا میں) پاک (اور آرام کی) زندگی سے زندہ رکھیں گے اور (آخرت میں) اُن کے اعمال کا نہایت اچھا صلہ دیں گے",
  },
] as const;

/**
 * The day the rotation is counted from.
 *
 * Any fixed day would do; this one is simply before the feature shipped. It
 * must never move. Changing it reshuffles which verse falls on which day, and
 * somebody who read today's verse this morning would find a different one this
 * afternoon.
 */
const EPOCH = "2026-01-01";

/**
 * Which verse belongs to a given day in Pakistan.
 *
 * Derived from the date, not drawn at random and not stored anywhere. That is
 * the whole trick: the screen can re-render twenty times while a thumb scrolls,
 * the app can be closed and opened, two customers can stand side by side
 * comparing phones — and the answer is the same, because the answer is a
 * function of the date and of nothing else.
 *
 * The day is Pakistan's, through the shared pktDay, so the verse turns over at
 * midnight in Mandi Bahauddin rather than at midnight UTC, which is five in
 * the morning there. A customer in Dubai or Manchester sees the shop's day,
 * the same way every time on the International tab is the shop's time.
 *
 * Null for a day string that is not one, so a caller that somehow has no date
 * renders nothing rather than the first verse by accident.
 */
export function ayatForDay(day: string): Ayat | null {
  if (AYAT.length === 0) return null;

  const gap = daysBetween(EPOCH, day);
  if (!Number.isFinite(gap)) return null;

  // Floored rather than truncated, so a day before the epoch lands inside the
  // set instead of off the front of it. A phone whose clock has been wound
  // back to 2019 still gets a verse rather than nothing.
  const index = ((gap % AYAT.length) + AYAT.length) % AYAT.length;
  return AYAT[index] ?? null;
}

/** Today's verse, by the clock in Pakistan. */
export function ayatToday(now: Date = new Date()): Ayat | null {
  return ayatForDay(pktDay(now));
}

/** "Surah Ar-Rahman 55:9", for the citation line. */
export function reference(ayat: Ayat): string {
  return `Surah ${ayat.surahName} ${ayat.surah}:${ayat.ayah}`;
}
