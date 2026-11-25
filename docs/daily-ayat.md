# Daily ayat on the app's home screen

All 26 verses that the app can show, in one place, for the shop to read once and
approve. Everything the feature does is decided by this list and nothing else.

**Roman Urdu mein, mukhtasar:** App ke home screen par, shopfront ki tasveer ke
neeche aur aaj ke rate ke ooper, ek ayat dikhti hai — Arabic mein, aur neeche
Urdu tarjuma. Har ayat ke saath surah ka naam, ayat number, aur tarjume ka naam
likha hai, taake koi bhi apne ghar wale Quran se mila kar dekh sake. Roz ek
ayat, aur har phone par wohi ek — tareekh se nikalti hai, qisaat se nahi. 26
ayaat hain, to 26 din baad list dobara shuru ho jati hai. Neeche poori list hai;
aap parh kar bata dein agar koi ayat nikalni ya badalni ho.

---

## How it behaves

One verse per day, the same verse on every phone on a given day, and the verse
is worked out from the date rather than picked at random and remembered. That is
why it cannot change while somebody is reading it, and why two customers
standing side by side see the same verse.

The day is **Pakistan's day**, not the phone's and not UTC. The verse turns over
at midnight in Mandi Bahauddin. A customer in Dubai or Manchester sees the
shop's day, the same way every time on the International tab is the shop's time.

The list runs in order and starts again when it reaches the end, so each verse
comes round every 26 days. Counting starts from 1 January 2026; that date must
never be changed, because changing it reshuffles which verse falls on which day.

It works with no signal. The verses are part of the app rather than fetched, so
the card is there in a basement like the rate board and the saved pieces are.

## Where the text comes from

**Not one word of the Arabic or the Urdu was typed by hand, by anybody, and none
of it came out of a model's memory.** Both were copied out of Tanzil Project's
published text files and then compared, character for character, against two
independent services before being committed:

|                 | Source                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Arabic          | Tanzil Quran Text (Uthmani, v1.1) — `tanzil.net`                           |
| Checked against | `api.alquran.cloud` (`quran-uthmani`) and `api.quran.com` (`text_uthmani`) |
| Urdu            | Fateh Muhammad Jalandhri — `tanzil.net/trans/ur.jalandhry`                 |
| Checked against | `api.alquran.cloud` (`ur.jalandhry`) and `api.quran.com` (translation 234) |

One deliberate detail: Tanzil's `uthmani` text file is the version **without
the waqf (pause) marks** — the small letters above the line that tell a reciter
where it is good to stop. Those are reading aids rather than part of the text,
and all 26 verses come from that one file, so the set is internally consistent
and the whole of it can be re-verified against a single source. A printed Quran
will show those marks where the app does not; no word, letter or vowel differs.

That comparison is not a one-off claim in a commit message. It is a script in
the repository:

```
bun run check:ayat
```

It re-fetches everything and fails, naming the verse, if a single letter of what
is shipping disagrees with its sources. Run it whenever the list changes, and
whenever you want to be sure of what is on people's phones. It has been checked
both ways — it passes on the real file, and it catches a deliberately altered
letter in either script.

Where two sources disagreed about a verse, the verse was **dropped rather than
adjudicated**. Deciding between two readings of scripture is not this project's
place.

**No hadith.** A great deal of what circulates as an "Islamic quote" is
fabricated or misattributed, and verifying a chain of narration is not something
a jeweller's app can do responsibly. The Quran has a fixed text with a number on
every verse, which is exactly what makes it checkable. If the shop ever wants
hadith, it should come from a scholar he trusts, in writing, with the collection
and number — not from software.

## The licence question, which is not settled

This matters and the shop should decide it with his eyes open.

**The Arabic is clear.** The Tanzil Quran Text is published under Creative
Commons Attribution 3.0. Verbatim copies may be distributed; altering the text
is not allowed; the source must be named and linked. The app names `tanzil.net`
on the card, and the full copyright notice is reproduced in
`mobile/app/src/lib/ayat.ts`.

**The Urdu translation is not clear, and could not be made clear.** Three things
are true at once:

1. Tanzil's translation file carries **no licence grant** — only attribution
   metadata naming the translator. Unlike the Arabic file, which carries an
   explicit CC BY 3.0 block, it says nothing about redistribution.
2. Fateh Muhammad Jalandhri's death date could not be established from a
   reliable source. Urdu Wikipedia's infobox gives **18 December 1982**, but
   that date is unsourced on the page, and the article itself notes that very
   little about his life is recorded. English-language sources do not settle it
   either and frequently confuse him with other scholars of similar name.
3. If 1982 is right, then under Pakistan's Copyright Ordinance 1962 (life plus
   fifty years, counted from the start of the year after death) the translation
   **remains in copyright until the end of 2032**.

What is bundled here is 26 verses out of 6,236 — about 0.4% of the work — each
one named, numbered and attributed to the translator on screen. That is a short
quoted extract rather than a reproduction of the translation, which is a
materially different position from shipping the whole thing, and it is how the
translation is already distributed by Tanzil, by quran.com and by a great many
apps on the Play Store. It is nevertheless a real question and not a settled
one, and nobody on this project is a lawyer.

**Two Urdu translations are unambiguously out of copyright** if the shop would
rather not carry the question at all:

| Translation              | Translator died  | Public domain in Pakistan since | Note                                                 |
| ------------------------ | ---------------- | ------------------------------- | ---------------------------------------------------- |
| Kanz-ul-Iman             | 28 October 1921  | 1972                            | Archaic register; read as a Barelvi text             |
| Fateh Muhammad Jalandhri | 1982 (unsourced) | 2033, if that date is right     | **Shipping, chosen 25 Nov 2026.** No maslak attached |

Jalandhri was chosen over the public-domain alternative deliberately, and for a
reason that is about the shop rather than about law. Urdu Wikipedia's own
description of him is that he belonged to no juristic or theological group,
"which is why his translation is equally popular and current among all
Muslims". A shop that serves the whole town is better off showing a translation
that reads as everybody's than one that reads as one group's. Swapping it would
trade an unsettled licence question for a settled sectarian signal on the
shop's own home screen, which is the worse of the two for this business.

**Decided on 25 November 2026: keep Jalandhri.** The position above was put to
the shop in full — the missing licence grant, the unsourced death date, the
copyright term that would run to the end of 2032 if that date is right, and the
public-domain alternative — and he chose to keep Jalandhri with that understood.
This paragraph exists so that nobody has to reconstruct later whether the
question was ever asked. It was, and this was the answer.

**If it is ever to be swapped, it is a small job** — the translation is one
column of one file, and `bun run check:ayat` verifies the replacement the same
way. The thing not to do is edit a word of the existing text to settle an
argument; take the replacement from a published edition in full.

## What was deliberately left out

- **Verses that do not stand alone.** 103:3 begins "except those who…"; 65:3
  begins "and He will provide for him". Both are well loved and both need the
  verse before them. On a phone screen with nothing above them they would be
  fragments.
- **Verses addressed to the Prophet in particular**, such as 93:7–8.
- **Verses carrying a legal ruling or a battlefield**, such as 65:2 (divorce) and
  3:200, whose Urdu speaks of holding trenches.
- **Al-Mutaffifin 83:1** — "woe to those who give short measure." It is the most
  on-the-nose verse in the Quran for a jeweller, and it is traditionally hung in
  bazaar shops for exactly that reason. It was left out because on a shop's own
  home screen, above its own gold rate, "woe to" can read to a customer as being
  aimed at him. **If the shop wants it in, say so** — it is verified and ready.
- **Anything over 200 Urdu characters**, so that a long verse never pushes
  today's rate off a small screen. Verses were dropped for length rather than
  shortened, because a truncated ayat is not an ayat.

## How it looks

Between the shopfront photograph and today's gold rate — above the rate, because
burying the verse under a price would say the opposite of what showing it is
meant to say.

The same white card, gold hairline and shadow as every other section on the
screen, so it belongs to the set rather than announcing itself. No icon, no
gradient, no gold plate. It is the only block on the home screen with no button
in it, which is the point.

The Arabic is set in Amiri Quran and the Urdu in Noto Nastaliq Urdu, both
right-to-left with the language marked, at line heights generous enough that
nastaliq's descenders and the Uthmani marks are not clipped. With no signal
those faces do not download — but Android has shipped Noto Naskh Arabic and Noto
Nastaliq Urdu in the system font set since Android 7, and the app's minimum is
Android 7, so the offline fallback is still a proper Urdu face, never a Latin
one.

The eyebrow reads **"Aaj ki ayat"**, in the shop's own Roman Urdu rather than in
English, because it labels a block of Arabic and Urdu. Changing it to "Today's
ayat" is a one-word edit if the shop prefers.

## The 26 verses

Each one below is exactly what the app shows: the Arabic, then the Urdu. The
English line under each is **for this review only** and never appears in the
app — it is there so the list can be read quickly by someone who wants to check
the sense of a verse before approving it. It is Saheeh International's English,
via `api.alquran.cloud`.

### 1. Surah Ar-Rahman 55:9 — Honest weighing

<div dir="rtl" lang="ar">

وَأَقِيمُوا۟ ٱلْوَزْنَ بِٱلْقِسْطِ وَلَا تُخْسِرُوا۟ ٱلْمِيزَانَ

</div>

<div dir="rtl" lang="ur">

اور انصاف کے ساتھ ٹھیک تولو۔ اور تول کم مت کرو

</div>

_English, for review only:_ And establish weight in justice and do not make deficient the balance.

### 2. Surah Al-Isra 17:35 — Honest weighing

<div dir="rtl" lang="ar">

وَأَوْفُوا۟ ٱلْكَيْلَ إِذَا كِلْتُمْ وَزِنُوا۟ بِٱلْقِسْطَاسِ ٱلْمُسْتَقِيمِ ذَٰلِكَ خَيْرٌ وَأَحْسَنُ تَأْوِيلًا

</div>

<div dir="rtl" lang="ur">

اور جب (کوئی چیز) ناپ کر دینے لگو تو پیمانہ پورا بھرا کرو اور (جب تول کر دو تو) ترازو سیدھی رکھ کر تولا کرو۔ یہ بہت اچھی بات اور انجام کے لحاظ سے بھی بہت بہتر ہے

</div>

_English, for review only:_ And give full measure when you measure, and weigh with an even balance. That is the best [way] and best in result.

### 3. Surah Ash-Shu'ara 26:181 — Honest weighing

<div dir="rtl" lang="ar">

أَوْفُوا۟ ٱلْكَيْلَ وَلَا تَكُونُوا۟ مِنَ ٱلْمُخْسِرِينَ

</div>

<div dir="rtl" lang="ur">

(دیکھو) پیمانہ پورا بھرا کرو اور نقصان نہ کیا کرو

</div>

_English, for review only:_ Give full measure and do not be of those who cause loss.

### 4. Surah An-Nahl 16:90 — Justice and kindness

<div dir="rtl" lang="ar">

إِنَّ ٱللَّهَ يَأْمُرُ بِٱلْعَدْلِ وَٱلْإِحْسَٰنِ وَإِيتَآئِ ذِى ٱلْقُرْبَىٰ وَيَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ وَٱلْبَغْىِ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ

</div>

<div dir="rtl" lang="ur">

خدا تم کو انصاف اور احسان کرنے اور رشتہ داروں کو (خرچ سے مدد) دینے کا حکم دیتا ہے۔ اور بےحیائی اور نامعقول کاموں سے اور سرکشی سے منع کرتا ہے (اور) تمہیں نصیحت کرتا ہے تاکہ تم یاد رکھو

</div>

_English, for review only:_ Indeed, Allah orders justice and good conduct and giving to relatives and forbids immorality and bad conduct and oppression. He admonishes you that perhaps you will be reminded.

### 5. Surah Hud 11:85 — Honest weighing

<div dir="rtl" lang="ar">

وَيَٰقَوْمِ أَوْفُوا۟ ٱلْمِكْيَالَ وَٱلْمِيزَانَ بِٱلْقِسْطِ وَلَا تَبْخَسُوا۟ ٱلنَّاسَ أَشْيَآءَهُمْ وَلَا تَعْثَوْا۟ فِى ٱلْأَرْضِ مُفْسِدِينَ

</div>

<div dir="rtl" lang="ur">

اور قوم! ماپ اور تول انصاف کے ساتھ پوری پوری کیا کرو اور لوگوں کو ان کی چیزیں کم نہ دیا کرو اور زمین میں خرابی کرتے نہ پھرو

</div>

_English, for review only:_ And O my people, give full measure and weight in justice and do not deprive the people of their due and do not commit abuse on the earth, spreading corruption.

### 6. Surah Al-Baqarah 2:152 — Remembrance and gratitude

<div dir="rtl" lang="ar">

فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ

</div>

<div dir="rtl" lang="ur">

سو تم مجھے یاد کرو۔ میں تمہیں یاد کیا کروں گا۔ اور میرے احسان مانتے رہنا اور ناشکری نہ کرنا

</div>

_English, for review only:_ So remember Me; I will remember you. And be grateful to Me and do not deny Me.

### 7. Surah Ibrahim 14:7 — Gratitude

<div dir="rtl" lang="ar">

وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِى لَشَدِيدٌ

</div>

<div dir="rtl" lang="ur">

اور جب تمہارے پروردگار نے (تم کو) آگاہ کیا کہ اگر شکر کرو گے تو میں تمہیں زیادہ دوں گا اور اگر ناشکری کرو گے تو (یاد رکھو کہ) میرا عذاب بھی سخت ہے

</div>

_English, for review only:_ And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe.' "

### 8. Surah Adh-Dhariyat 51:58 — Provision

<div dir="rtl" lang="ar">

إِنَّ ٱللَّهَ هُوَ ٱلرَّزَّاقُ ذُو ٱلْقُوَّةِ ٱلْمَتِينُ

</div>

<div dir="rtl" lang="ur">

خدا ہی تو رزق دینے والا زور آور اور مضبوط ہے

</div>

_English, for review only:_ Indeed, it is Allah who is the [continual] Provider, the firm possessor of strength.

### 9. Surah An-Nahl 16:18 — Gratitude

<div dir="rtl" lang="ar">

وَإِن تَعُدُّوا۟ نِعْمَةَ ٱللَّهِ لَا تُحْصُوهَآ إِنَّ ٱللَّهَ لَغَفُورٌ رَّحِيمٌ

</div>

<div dir="rtl" lang="ur">

اور اگر تم خدا کی نعمتوں کو شمار کرنا چاہو تو گن نہ سکو۔ بےشک خدا بخشنے والا مہربان ہے

</div>

_English, for review only:_ And if you should count the favors of Allah, you could not enumerate them. Indeed, Allah is Forgiving and Merciful.

### 10. Surah Al-Mulk 67:15 — Provision

<div dir="rtl" lang="ar">

هُوَ ٱلَّذِى جَعَلَ لَكُمُ ٱلْأَرْضَ ذَلُولًا فَٱمْشُوا۟ فِى مَنَاكِبِهَا وَكُلُوا۟ مِن رِّزْقِهِۦ وَإِلَيْهِ ٱلنُّشُورُ

</div>

<div dir="rtl" lang="ur">

وہی تو ہے جس نے تمہارے لئے زمین کو نرم کیا تو اس کی راہوں میں چلو پھرو اور خدا کا (دیا ہو) رزق کھاؤ اور تم کو اسی کے پاس (قبروں سے) نکل کر جانا ہے

</div>

_English, for review only:_ It is He who made the earth tame for you - so walk among its slopes and eat of His provision - and to Him is the resurrection.

### 11. Surah Fatir 35:15 — Humility

<div dir="rtl" lang="ar">

يَٰٓأَيُّهَا ٱلنَّاسُ أَنتُمُ ٱلْفُقَرَآءُ إِلَى ٱللَّهِ وَٱللَّهُ هُوَ ٱلْغَنِىُّ ٱلْحَمِيدُ

</div>

<div dir="rtl" lang="ur">

لوگو تم (سب) خدا کے محتاج ہو اور خدا بےپروا سزاوار (حمد وثنا) ہے

</div>

_English, for review only:_ O mankind, you are those in need of Allah, while Allah is the Free of need, the Praiseworthy.

### 12. Surah Al-Baqarah 2:153 — Patience

<div dir="rtl" lang="ar">

يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ

</div>

<div dir="rtl" lang="ur">

اے ایمان والو صبر اور نماز سے مدد لیا کرو بےشک خدا صبر کرنے والوں کے ساتھ ہے

</div>

_English, for review only:_ O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.

### 13. Surah Ash-Sharh 94:6 — Patience

<div dir="rtl" lang="ar">

إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا

</div>

<div dir="rtl" lang="ur">

(اور) بے شک مشکل کے ساتھ آسانی ہے

</div>

_English, for review only:_ Indeed, with hardship [will be] ease.

### 14. Surah Az-Zumar 39:10 — Patience

<div dir="rtl" lang="ar">

قُلْ يَٰعِبَادِ ٱلَّذِينَ ءَامَنُوا۟ ٱتَّقُوا۟ رَبَّكُمْ لِلَّذِينَ أَحْسَنُوا۟ فِى هَٰذِهِ ٱلدُّنْيَا حَسَنَةٌ وَأَرْضُ ٱللَّهِ وَٰسِعَةٌ إِنَّمَا يُوَفَّى ٱلصَّٰبِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ

</div>

<div dir="rtl" lang="ur">

کہہ دو کہ اے میرے بندو جو ایمان لائے ہو اپنے پروردگار سے ڈرو۔ جنہوں نے اس دنیا میں نیکی کی ان کے لئے بھلائی ہے۔ اور خدا کی زمین کشادہ ہے۔ جو صبر کرنے والے ہیں ان کو بےشمار ثواب ملے گا

</div>

_English, for review only:_ Say, "O My servants who have believed, fear your Lord. For those who do good in this world is good, and the earth of Allah is spacious. Indeed, the patient will be given their reward without account."

### 15. Surah At-Tawbah 9:51 — Reliance

<div dir="rtl" lang="ar">

قُل لَّن يُصِيبَنَآ إِلَّا مَا كَتَبَ ٱللَّهُ لَنَا هُوَ مَوْلَىٰنَا وَعَلَى ٱللَّهِ فَلْيَتَوَكَّلِ ٱلْمُؤْمِنُونَ

</div>

<div dir="rtl" lang="ur">

کہہ دو کہ ہم کو کوئی مصیبت نہیں پہنچ سکتی بجز اس کے جو خدا نے ہمارے لیے لکھ دی ہو وہی ہمارا کارساز ہے۔ اور مومنوں کو خدا ہی کا بھروسہ رکھنا چاہیئے

</div>

_English, for review only:_ Say, "Never will we be struck except by what Allah has decreed for us; He is our protector." And upon Allah let the believers rely.

### 16. Surah Ar-Ra'd 13:28 — Remembrance

<div dir="rtl" lang="ar">

ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ

</div>

<div dir="rtl" lang="ur">

(یعنی) جو لوگ ایمان لاتے اور جن کے دل یادِ خدا سے آرام پاتے ہیں (ان کو) اور سن رکھو کہ خدا کی یاد سے دل آرام پاتے ہیں

</div>

_English, for review only:_ Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured."

### 17. Surah Taha 20:14 — Remembrance

<div dir="rtl" lang="ar">

إِنَّنِىٓ أَنَا ٱللَّهُ لَآ إِلَٰهَ إِلَّآ أَنَا۠ فَٱعْبُدْنِى وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ

</div>

<div dir="rtl" lang="ur">

بےشک میں ہی خدا ہوں۔ میرے سوا کوئی معبود نہیں تو میری عبادت کرو اور میری یاد کے لئے نماز پڑھا کرو

</div>

_English, for review only:_ Indeed, I am Allah. There is no deity except Me, so worship Me and establish prayer for My remembrance.

### 18. Surah Luqman 31:18 — Conduct

<div dir="rtl" lang="ar">

وَلَا تُصَعِّرْ خَدَّكَ لِلنَّاسِ وَلَا تَمْشِ فِى ٱلْأَرْضِ مَرَحًا إِنَّ ٱللَّهَ لَا يُحِبُّ كُلَّ مُخْتَالٍ فَخُورٍ

</div>

<div dir="rtl" lang="ur">

اور (ازراہ غرور) لوگوں سے گال نہ پھلانا اور زمین میں اکڑ کر نہ چلنا۔ کہ خدا کسی اترانے والے خود پسند کو پسند نہیں کرتا

</div>

_English, for review only:_ And do not turn your cheek [in contempt] toward people and do not walk through the earth exultantly. Indeed, Allah does not like everyone self-deluded and boastful.

### 19. Surah Al-Baqarah 2:263 — Speech

<div dir="rtl" lang="ar">

قَوْلٌ مَّعْرُوفٌ وَمَغْفِرَةٌ خَيْرٌ مِّن صَدَقَةٍ يَتْبَعُهَآ أَذًى وَٱللَّهُ غَنِىٌّ حَلِيمٌ

</div>

<div dir="rtl" lang="ur">

جس خیرات دینے کے بعد (لینے والے کو) ایذا دی جائے اس سے تو نرم بات کہہ دینی اور (اس کی بے ادبی سے) درگزر کرنا بہتر ہے اور خدا بےپروا اور بردبار ہے

</div>

_English, for review only:_ Kind speech and forgiveness are better than charity followed by injury. And Allah is Free of need and Forbearing.

### 20. Surah Fussilat 41:34 — Conduct

<div dir="rtl" lang="ar">

وَلَا تَسْتَوِى ٱلْحَسَنَةُ وَلَا ٱلسَّيِّئَةُ ٱدْفَعْ بِٱلَّتِى هِىَ أَحْسَنُ فَإِذَا ٱلَّذِى بَيْنَكَ وَبَيْنَهُۥ عَدَٰوَةٌ كَأَنَّهُۥ وَلِىٌّ حَمِيمٌ

</div>

<div dir="rtl" lang="ur">

اور بھلائی اور برائی برابر نہیں ہوسکتی۔ تو (سخت کلامی کا) ایسے طریق سے جواب دو جو بہت اچھا ہو (ایسا کرنے سے تم دیکھو گے) کہ جس میں اور تم میں دشمنی تھی گویا وہ تمہارا گرم جوش دوست ہے

</div>

_English, for review only:_ And not equal are the good deed and the bad. Repel [evil] by that [deed] which is better; and thereupon the one whom between you and him is enmity [will become] as though he was a devoted friend.

### 21. Surah Al-Isra 17:53 — Speech

<div dir="rtl" lang="ar">

وَقُل لِّعِبَادِى يَقُولُوا۟ ٱلَّتِى هِىَ أَحْسَنُ إِنَّ ٱلشَّيْطَٰنَ يَنزَغُ بَيْنَهُمْ إِنَّ ٱلشَّيْطَٰنَ كَانَ لِلْإِنسَٰنِ عَدُوًّا مُّبِينًا

</div>

<div dir="rtl" lang="ur">

اور میرے بندوں سے کہہ دو کہ (لوگوں سے) ایسی باتیں کہا کریں جو بہت پسندیدہ ہوں۔ کیونکہ شیطان (بری باتوں سے) ان میں فساد ڈلوا دیتا ہے۔ کچھ شک نہیں کہ شیطان انسان کا کھلا دشمن ہے

</div>

_English, for review only:_ And tell My servants to say that which is best. Indeed, Satan induces [dissension] among them. Indeed Satan is ever, to mankind, a clear enemy.

### 22. Surah Al-Hujurat 49:10 — Brotherhood

<div dir="rtl" lang="ar">

إِنَّمَا ٱلْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا۟ بَيْنَ أَخَوَيْكُمْ وَٱتَّقُوا۟ ٱللَّهَ لَعَلَّكُمْ تُرْحَمُونَ

</div>

<div dir="rtl" lang="ur">

مومن تو آپس میں بھائی بھائی ہیں۔ تو اپنے دو بھائیوں میں صلح کرادیا کرو۔ اور خدا سے ڈرتے رہو تاکہ تم پر رحمت کی جائے

</div>

_English, for review only:_ The believers are but brothers, so make settlement between your brothers. And fear Allah that you may receive mercy.

### 23. Surah Al-'Ankabut 29:69 — Effort

<div dir="rtl" lang="ar">

وَٱلَّذِينَ جَٰهَدُوا۟ فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا وَإِنَّ ٱللَّهَ لَمَعَ ٱلْمُحْسِنِينَ

</div>

<div dir="rtl" lang="ur">

اور جن لوگوں نے ہمارے لئے کوشش کی ہم اُن کو ضرور اپنے رستے دکھا دیں گے۔ اور خدا تو نیکو کاروں کے ساتھ ہے

</div>

_English, for review only:_ And those who strive for Us - We will surely guide them to Our ways. And indeed, Allah is with the doers of good.

### 24. Surah An-Najm 53:39 — Effort

<div dir="rtl" lang="ar">

وَأَن لَّيْسَ لِلْإِنسَٰنِ إِلَّا مَا سَعَىٰ

</div>

<div dir="rtl" lang="ur">

اور یہ کہ انسان کو وہی ملتا ہے جس کی وہ کوشش کرتا ہے

</div>

_English, for review only:_ And that there is not for man except that [good] for which he strives

### 25. Surah Az-Zumar 39:53 — Mercy

<div dir="rtl" lang="ar">

قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ

</div>

<div dir="rtl" lang="ur">

(اے پیغمبر میری طرف سے لوگوں کو) کہہ دو کہ اے میرے بندو جنہوں نے اپنی جانوں پر زیادتی کی ہے خدا کی رحمت سے ناامید نہ ہونا۔ خدا تو سب گناہوں کو بخش دیتا ہے۔ (اور) وہ تو بخشنے والا مہربان ہے

</div>

_English, for review only:_ Say, "O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful."

### 26. Surah An-Nahl 16:97 — Reward

<div dir="rtl" lang="ar">

مَنْ عَمِلَ صَٰلِحًا مِّن ذَكَرٍ أَوْ أُنثَىٰ وَهُوَ مُؤْمِنٌ فَلَنُحْيِيَنَّهُۥ حَيَوٰةً طَيِّبَةً وَلَنَجْزِيَنَّهُمْ أَجْرَهُم بِأَحْسَنِ مَا كَانُوا۟ يَعْمَلُونَ

</div>

<div dir="rtl" lang="ur">

جو شخص نیک اعمال کرے گا مرد ہو یا عورت وہ مومن بھی ہوگا تو ہم اس کو (دنیا میں) پاک (اور آرام کی) زندگی سے زندہ رکھیں گے اور (آخرت میں) اُن کے اعمال کا نہایت اچھا صلہ دیں گے

</div>

_English, for review only:_ Whoever does righteousness, whether male or female, while he is a believer - We will surely cause him to live a good life, and We will surely give them their reward [in the Hereafter] according to the best of what they used to do.

---

## If the list changes

Adding or replacing a verse is not really a code change, it is a verification
job. The order of these steps matters:

1. Take the Arabic and the Urdu from `tanzil.net` — never from a search
   result, a WhatsApp forward, a poster, or a model. Copy and paste; do not
   retype.
2. Add the entry to `AYAT` in `mobile/app/src/lib/ayat.ts`.
3. Run `bun run check:ayat`. If it does not pass, the entry is wrong — put it
   back from the source rather than editing it until the check agrees.
4. Run `bun run test`. The count test will fail until it is told the new
   number, which is deliberate: it is the reminder that this document and the
   shop's approval have to catch up.
5. Add it to the list above, with its English gloss, so this page stays the
   one place the whole set can be read.

## Attribution

Quran text copyright (C) 2007-2026 Tanzil Project, licensed Creative Commons
Attribution 3.0. Produced and verified by the Tanzil Project; verbatim
distribution permitted, alteration not permitted. Source and updates:
<https://tanzil.net>.

Urdu translation: Fateh Muhammad Jalandhri, via
<https://tanzil.net/trans/ur.jalandhry>. See the licence section above — the
redistribution position is not established.
