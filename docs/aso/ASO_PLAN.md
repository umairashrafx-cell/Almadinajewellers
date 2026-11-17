# App search optimisation — Al-Madina Jewellers on Google Play

Made 17 November 2026, the day after release 6 (2.1.1) and the new listing
went live. This is how people find the app on Play, why they mostly do not
yet, and what was changed about it.

## Where the app stood (baseline, 17 November 2026)

`node scripts/check-play-ranks.mjs` searches Play as a phone in Pakistan:

| Search                               | Our position  | First result                         |
| ------------------------------------ | ------------- | ------------------------------------ |
| gold rate                            | not in top 20 | Pakistan Gold Rate - Live (Ourum)    |
| gold rate pakistan                   | not in top 20 | Pakistan Gold Rate - Live            |
| gold rate today                      | not in top 20 | an Indian gold-rate app              |
| gold price pakistan                  | not in top 20 | Pakistan Gold Rate - Live            |
| aaj ka gold rate                     | not in top 20 | Gold Rate Live Pakistan              |
| sone ka rate / sona rate / tola rate | not in top 20 | an international gold tracker        |
| gold calculator                      | not in top 20 | a generic gold calculator            |
| gold rate mandi bahauddin            | not in top 20 | Pakistan Gold Rate - Live            |
| سونے کا ریٹ                          | not in top 20 | a currency converter                 |
| al madina jewellers                  | **#2**        | "Madina jewellery", an unrelated app |

The Console, over the last 28 days: **445** store impressions, **27** installs
(14 from Play search and browse, 8 from links, 5 not attributed). Half of the
people who open the listing install the app. That rate is good, so the
listing itself is not the problem. The problem is that hardly anyone reaches
it.

## What the apps above us do

| App                 | Title                          | Installs | Rating    | Category |
| ------------------- | ------------------------------ | -------- | --------- | -------- |
| Ourum               | Pakistan Gold Rate - Live      | 100K+    | 4.4 (891) | Finance  |
| Local Soft          | Gold Rate Pakistan - Live Gold | 10K+     | 4.3 (73)  | Finance  |
| Unique Applications | PAK Gold Rate Live             | 5K+      | 3.8 (13)  | Finance  |
| ThePro Studio       | Gold Rate Live Pakistan        | 1K+      | 4.9 (32)  | Finance  |
| AR Digital          | Gold Rate in Pakistan          | 500+     | 4.8 (6)   | Finance  |
| Omar Shah           | Gold Price Pakistan            | 500+     | 4.6       | Finance  |
| **Al-Madina**       | Al-Madina Jewellers: Gold Rate | 50+      | none yet  | Shopping |

Three things separate them from us, in order of weight:

1. **"Gold Rate" and "Pakistan" are both in every title.** Play weighs the
   title more than anything else in the text. An app with 500 installs and 6
   reviews ranks third for "gold rate pakistan" largely on its title.
2. **They have ratings.** We have none, and Play ranks rated apps above
   unrated ones for the same words.
3. **They are in Finance.** We were in Shopping, which tells Play we are a
   shop with a catalogue rather than a rate app.

Nobody targets Roman Urdu ("aaj ka gold rate", "sone ka rate") or Urdu script
("سونے کا ریٹ") with a real listing. The Urdu-script search returns a currency
converter first. Those are the openings a small app can actually win.

## What was changed (17 November 2026, approved by the owner)

| Lever             | Before                                                                       | After                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title             | Al-Madina Jewellers: Gold Rate                                               | **Al-Madina: Gold Rate Pakistan**                                                                                                                                             |
| Short description | Gold rate today Pakistan, hallmarked jewellery & sell gold – Mandi Bahauddin | **Gold rate today Pakistan — aaj ka sone ka rate per tola, 24K, 22K & silver**                                                                                                |
| Full description  | English, then Urdu                                                           | the same, plus one line of Roman Urdu and "gold price" / "silver price"                                                                                                       |
| Urdu (ur) listing | none                                                                         | a full Urdu translation: title, short and full description                                                                                                                    |
| Category          | Shopping                                                                     | **Finance**                                                                                                                                                                   |
| Tags              | none                                                                         | **Calculator, Fashion, Finance, Shopping**: the four of Play's fixed tags that describe what the app does (Investment and Personal finance left out, because it does neither) |

The Console also flagged the old short description: Play may not promote a listing whose short description uses an en dash (–) or a double hyphen instead of an em dash (—). The new one uses an em dash, and the check script now refuses the other two.

All of it was sent to Google for review on 17 November 2026. Tags took effect at once; the other five changes go live when the owner presses **Publish** after approval, because managed publishing is on.

The texts are in [`PLAY_STORE_METADATA.md`](PLAY_STORE_METADATA.md), checked by
`node scripts/check-play-metadata.mjs`. That script also prints how often each
target term appears, so coverage can be seen without counting by hand. The
aim is each term present once or twice, never stuffed: Play's metadata policy
penalises repetition, and so do the people reading it.

Deliberately not done: competitor names in our text (against Play policy),
words like "best" or "#1" (against policy), and anything the app does not
actually do ([`FEATURE_AUDIT.md`](FEATURE_AUDIT.md)).

## What only the owner can do, which matters more than any of the above

1. **Ratings.** The app has none. Release 6 asks for a review once, on a
   customer's third look at the rate, and that will add them slowly. It is
   faster to ask in person: customers at the counter who already use the app
   can be sent the Play link on WhatsApp and asked for an honest rating. Never
   offer anything in return, and never rate it from your own or staff
   accounts. Both are against Play policy and can get the listing removed.
2. **Install volume.** Eight of the 27 installs came from links. Every link
   to the app that the shop sends — on WhatsApp, in the rate post, on the
   website's "get the app" buttons, on a QR code at the counter — is an
   install Play counts towards ranking.
3. **Developer name.** The listing says it is by "umair ashraf". Changing the
   public developer name to "Al-Madina Jewellers" (Play Console → Developer
   account → Account details) makes the listing look like the shop's own, and
   gives brand searches a second match. It is shown on every app on the
   account.
4. **Answer every review**, good or bad, from Ratings and reviews. Play shows
   the replies, and people read them before installing.

## How to tell whether it worked

Run `bun run check:play-ranks` a week after the changes are published, and
again a month after. Play re-ranks over days, not hours. The realistic early
wins are the Urdu-script and Roman-Urdu searches and "gold rate mandi
bahauddin", where the competition is weak. The generic "gold rate" will follow
ratings and installs, not text. In the Console, watch Grow users → **Device
impressions** (how often Play shows the app) rather than installs: impressions
are what the search changes move first.

When impressions pass a few thousand a month, a **store listing experiment**
(Grow users → Store listing experiments) can test a second icon or short
description against the current one. Below that, an experiment would take
months to reach a result.
