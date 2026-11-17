# Play Store metadata — Al-Madina Jewellers

The listing text for `com.almadinajeweller.app`: the default English (en-US)
listing, and an Urdu (ur) translation of it. The first version went live on
16 November 2026. This revision, from 17 November, is the search pass in
[`ASO_PLAN.md`](ASO_PLAN.md): it puts "Pakistan" in the title and adds the
Roman-Urdu and Urdu ways people actually ask for the rate.

Every feature named below is one [`FEATURE_AUDIT.md`](FEATURE_AUDIT.md) marks
**Implemented**, found by reading the app's code, not by trusting an older
listing. Two claims are deliberately absent, because the app's own screens do
not do them: a sell-gold estimator (website only), and sharing the rate as a
picture (website only).

**Check before pasting:** `node scripts/check-play-metadata.mjs` from the repo
root reads this file and fails if any field is over Play's limit. Edit the
text here, run the check, then paste — never the other way round.

Each field is the fenced `text` block under its heading, and the script reads
it from there, so keep each one a single block.

## Title

Play limit: 30 characters.

```text
Al-Madina: Gold Rate Pakistan
```

## Short description

Play limit: 80 characters.

```text
Gold rate today Pakistan — aaj ka sone ka rate per tola, 24K, 22K & silver
```

## Full description

Play limit: 4,000 characters. English, a line of Roman Urdu, then the same
again in Urdu script, all in the one default listing.

```text
Today's gold rate in Pakistan, as Al-Madina Jewellers sets it each day in Sarafa Market, Mandi Bahauddin — on your phone, with the time it was published, and still there when the signal is not.

Aaj ka gold rate aur sone ka rate, per tola aur per gram — Mandi Bahauddin ke Sarafa Bazaar se, roz.

TODAY'S RATE
• 24K (Piece), 23.65K (Pathor) and 22K (Jewellery) gold, and silver
• Per tola and per gram, with the time the shop last set the board
• The shop's buying rate for your old gold, before you make the trip
• International gold price and silver price beside the shop's own, with the dollar index, crude oil and bitcoin

WORKS WITHOUT A SIGNAL
• The rate board, the calculator, the catalogue and your saved pieces open with no connection
• Each one says when its figures were taken, so you always know what you are reading

GOLD CALCULATOR
• Enter a weight in grams or tola
• Choose 24K, 23.65K, 22K, 21K, 20K or 18K, or type any other purity
• See the metal value at today's rate, then ask the shop for a price on WhatsApp

JEWELLERY
• Browse the shop's pieces by collection, or search by name, karat or piece number
• Every piece shows its karat and weight, priced against the day's rate
• Tap the heart to save a piece — your saved pieces stay on the phone
• Share a piece with family in one tap

SELL YOUR GOLD
• Today's buying rate, what the shop buys, how you are paid and what to bring
• Your gold is tested and weighed in front of you, and you are under no obligation to sell

CUSTOM ORDERS
• Send a photograph, a written description or a voice note of the piece you want
• Your request goes straight to the workshop, with a reference for it

RATE ALERTS
• One notification the morning the shop sets its board, or one every time a gold rate changes — your choice
• Word when new pieces arrive, never more than once a day
• Change or turn off any of it in Settings

YOUR WAY
• Prices shown again in US, Canadian or Australian dollars, pounds, euros, UAE dirhams, Saudi, Qatari or Omani riyals, or Kuwaiti dinars
• Light or dark theme
• Long-press the app icon to go straight to Rates, Calculator, Shop or Saved

VISIT OR ASK
• Ask for an appointment, get directions, see opening hours, or call the shop
• Ask anything on WhatsApp in one tap

No account needed. Your price is confirmed at the shop against the rate at the time of purchase, and every piece is weighed in front of you.

Weighed Honestly, Made Beautifully.

— اردو —

آج پاکستان میں سونے کا ریٹ — المدینہ جیولرز، صرافہ بازار منڈی بہاؤالدین، روزانہ جو ریٹ لگاتے ہیں وہی آپ کے فون پر، ریٹ لگنے کے وقت کے ساتھ۔ سگنل نہ ہو تب بھی آخری دیکھا ہوا ریٹ کھل جاتا ہے۔

• 24 کیرٹ (پیس)، 23.65 کیرٹ (پتھر) اور 22 کیرٹ (زیور) سونا، اور چاندی — فی تولہ اور فی گرام
• پرانا سونا بیچنا ہو تو دکان کا آج کا خرید ریٹ پہلے دیکھ لیں
• عالمی منڈی: سونا، چاندی، ڈالر انڈیکس، خام تیل اور بٹ کوائن
• سونے کا کیلکولیٹر: وزن گرام یا تولے میں لکھیں، کیرٹ چنیں اور آج کے ریٹ پر قیمت دیکھیں
• زیورات دیکھیں — ہر پیس کا کیرٹ، وزن اور آج کے ریٹ پر قیمت
• پسند کے زیورات محفوظ کریں، جو انٹرنیٹ کے بغیر بھی کھلتے ہیں
• اپنی پسند کا زیور بنوائیں: تصویر، تفصیل یا آواز کا پیغام بھیجیں
• ریٹ الرٹ: صبح بورڈ لگتے ہی، یا جب بھی ریٹ بدلے، اطلاع پائیں
• قیمت ڈالر، پاؤنڈ، یورو، درہم، ریال اور دینار میں بھی دیکھیں
• دکان کا پتا، اوقات، کال اور واٹس ایپ — سب ایک ٹیپ پر

سونا آپ کے سامنے پرکھا اور تولا جاتا ہے، اور بیچنے کی کوئی پابندی نہیں۔ کوئی اکاؤنٹ بنانے کی ضرورت نہیں۔

وزن میں ایمانداری، بناوٹ میں خوبصورتی۔
```

## Urdu title

The Urdu (ur) translation, shown to phones set to Urdu and searched in Urdu
script. Play limit: 30 characters.

```text
المدینہ: سونے کا ریٹ پاکستان
```

## Urdu short description

Play limit: 80 characters.

```text
آج کا سونے کا ریٹ فی تولہ: 24 اور 22 کیرٹ، چاندی، کیلکولیٹر اور زیورات
```

## Urdu full description

Play limit: 4,000 characters.

```text
آج پاکستان میں سونے کا ریٹ — المدینہ جیولرز (Al-Madina Jewellers)، صرافہ بازار منڈی بہاؤالدین، روزانہ جو ریٹ لگاتے ہیں وہی آپ کے فون پر، ریٹ لگنے کے وقت کے ساتھ۔ سگنل نہ ہو تب بھی آخری دیکھا ہوا ریٹ کھل جاتا ہے۔

آج کا ریٹ
• 24 کیرٹ (پیس)، 23.65 کیرٹ (پتھر) اور 22 کیرٹ (زیور) سونا، اور چاندی
• فی تولہ اور فی گرام، اور یہ بھی کہ دکان نے ریٹ کب لگایا
• پرانا سونا بیچنا ہو تو دکان کا آج کا خرید ریٹ پہلے دیکھ لیں
• عالمی منڈی: سونے اور چاندی کی قیمت، ڈالر انڈیکس، خام تیل اور بٹ کوائن

انٹرنیٹ کے بغیر بھی
• ریٹ بورڈ، کیلکولیٹر، زیورات اور آپ کے محفوظ کیے ہوئے زیور سگنل کے بغیر بھی کھلتے ہیں
• ہر جگہ لکھا ہوتا ہے کہ ریٹ کب لیے گئے تھے

سونے کا کیلکولیٹر
• وزن گرام یا تولے میں لکھیں
• 24، 23.65، 22، 21، 20 یا 18 کیرٹ چنیں، یا کوئی بھی اور کیرٹ لکھیں
• آج کے ریٹ پر سونے کی قیمت دیکھیں، پھر واٹس ایپ پر دکان سے ریٹ پوچھیں

زیورات
• دکان کے زیورات کلیکشن کے حساب سے دیکھیں، یا نام، کیرٹ یا پیس نمبر سے تلاش کریں
• ہر پیس کا کیرٹ اور وزن، آج کے ریٹ پر قیمت کے ساتھ
• دل کے نشان سے پسند کا زیور محفوظ کریں — وہ فون پر ہی رہتا ہے
• کوئی بھی پیس ایک ٹیپ میں گھر والوں کو بھیجیں

سونا بیچیں
• آج کا خرید ریٹ، دکان کیا خریدتی ہے، ادائیگی کیسے ہوتی ہے اور ساتھ کیا لانا ہے
• سونا آپ کے سامنے پرکھا اور تولا جاتا ہے، اور بیچنے کی کوئی پابندی نہیں

اپنی پسند کا زیور بنوائیں
• جو زیور چاہیے اس کی تصویر، تفصیل یا آواز کا پیغام بھیجیں
• آپ کی درخواست سیدھی کاریگروں تک جاتی ہے، ایک ریفرنس نمبر کے ساتھ

ریٹ الرٹ
• صبح بورڈ لگتے ہی ایک اطلاع، یا جب بھی سونے کا ریٹ بدلے — جیسے آپ چاہیں
• نئے زیورات آنے کی اطلاع، دن میں ایک بار سے زیادہ نہیں
• سیٹنگز میں جب چاہیں بدلیں یا بند کریں

آپ کی مرضی
• قیمت ڈالر، پاؤنڈ، یورو، درہم، ریال اور دینار میں بھی دیکھیں
• لائٹ یا ڈارک تھیم
• ایپ کے آئیکن کو دبا کر رکھیں اور سیدھا ریٹ، کیلکولیٹر، دکان یا محفوظ زیورات پر جائیں

دکان آئیں یا پوچھیں
• ملاقات کا وقت مانگیں، راستہ دیکھیں، اوقات دیکھیں یا دکان پر کال کریں
• واٹس ایپ پر ایک ٹیپ میں کچھ بھی پوچھیں

کوئی اکاؤنٹ بنانے کی ضرورت نہیں۔ آپ کی قیمت خریداری کے وقت کے ریٹ پر دکان میں طے ہوتی ہے، اور ہر پیس آپ کے سامنے تولا جاتا ہے۔

وزن میں ایمانداری، بناوٹ میں خوبصورتی۔
```

## Notes for whoever pastes this

- **Title change.** The title went from `Al-Madina Jewellers: Gold Rate` to
  `Al-Madina: Gold Rate Pakistan` on 17 November, for the reason in
  [`ASO_PLAN.md`](ASO_PLAN.md). A title change is a listing edit, which Play
  reviews like an update; the app itself does not change. Play forbids emoji,
  ALL-CAPS words and ranking claims ("best", "#1") in a title, and the check
  script refuses all three.
- **Urdu.** The default listing carries Urdu script and Roman Urdu, which is
  what most customers here are shown, because their phones are set to English.
  The **Urdu (ur)** translation above is what Play shows to phones set to Urdu.
  It is added in the Console under Store listings → Default listing → the
  language menu → Add language.
- **Screenshots and feature graphic** are in
  [`mobile/play-store/`](../../mobile/play-store/README.md): the 2026 set is
  `screenshots-2026/` and `feature-graphic-2026-1024x500.png`. The Urdu
  translation uses the same ones, whose captions are already in both languages.
- **When a feature changes**, change [`FEATURE_AUDIT.md`](FEATURE_AUDIT.md)
  first, then this file, then `mobile/play-store/captions.json`, and run both
  checks.
