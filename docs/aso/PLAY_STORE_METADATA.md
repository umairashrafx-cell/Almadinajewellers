# Play Store metadata — Al-Madina Jewellers

The listing text for `com.almadinajeweller.app`, ready to paste into the Play
Console's **Main store listing**. Nothing here has been published: the live
listing changes only when the owner pastes it in.

Every feature named below is one [`FEATURE_AUDIT.md`](FEATURE_AUDIT.md) marks
**Implemented**, found by reading the app's code — not by trusting an older
listing. Two claims in the listing that is live today do not pass that test and
are left out on purpose:

- _"Estimate the value of your gold by purity and weight"_ under selling. The
  app's Sell screen shows the buying rate and deliberately has no estimator
  (`mobile/app/src/screens/SellGoldScreen.tsx`); the estimator is on the
  website only.
- _"Share the day's rates on WhatsApp, as text or as a picture"_. That is the
  website's rate page; the app's board hides that footer.

**Check before pasting:** `node scripts/check-play-metadata.mjs` from the repo
root reads this file and fails if any field is over Play's limit. Edit the text
here, run the check, then paste — never the other way round.

The three fields are the fenced blocks under the next three headings; the
script reads them from there, so keep each one a single `text` block.

## Title

Play limit: 30 characters.

```text
Al-Madina Jewellers: Gold Rate
```

## Short description

Play limit: 80 characters.

```text
Gold rate today Pakistan, hallmarked jewellery & sell gold – Mandi Bahauddin
```

## Full description

Play limit: 4,000 characters. English first, then the same in Urdu, in the one
English listing. (A separate Urdu listing is a Console task — see the end.)

```text
Today's gold rate in Pakistan, as Al-Madina Jewellers sets it each day in Sarafa Market, Mandi Bahauddin — on your phone, with the time it was published, and still there when the signal is not.

TODAY'S RATE
• 24K (Piece), 23.65K (Pathor) and 22K (Jewellery) gold, and silver
• Per tola and per gram, with the time the shop last set the board
• The shop's buying rate for your old gold, before you make the trip
• International prices beside the shop's own: gold and silver, the dollar index, crude oil and bitcoin

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

## Notes for whoever pastes this

- **Title change.** The live title is `Al-Madina Jewellers`. Changing it is a
  listing edit, which Play reviews like an update; the app itself does not
  change. Play forbids emoji, ALL-CAPS words and ranking claims ("best", "#1")
  in the title — this one has none, and the check script refuses them.
- **Urdu.** The Urdu section rides in the English listing, which is what most
  customers here will be shown. A separate **Urdu (ur)** translation of the
  listing would show Urdu to phones set to Urdu; that is a Console task (Main
  store listing → Manage translations), and the Urdu block above is a starting
  point for it.
- **Screenshots and feature graphic** are in
  [`mobile/play-store/`](../../mobile/play-store/README.md): the 2026 set is
  `screenshots-2026/` and `feature-graphic-2026-1024x500.png`.
- **When a feature changes**, change [`FEATURE_AUDIT.md`](FEATURE_AUDIT.md)
  first, then this file, then `mobile/play-store/captions.json`, and run both
  checks.
