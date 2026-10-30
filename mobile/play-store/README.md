# Google Play listing — Al-Madina Jewellers

Everything to paste or upload in the Play Console. The app opens on its own
rate board, calculator and saved pieces, and shows
https://www.almadinajeweller.com for everything else — so any change to the
website still appears in the app without a new release. It is a Capacitor app — see
[`../README.md`](../README.md) for how it is built — and it replaces the
Trusted Web Activity that was on Play before it, keeping the same package name,
the same upload key, and therefore the same listing, installs and reviews.

Keep this file in step with the site. If a form gains a field or analytics is
switched on, update `/privacy-policy` **and** the Data safety answers below —
Google checks that they agree.

---

## Files to upload

| Play Console field | File                           | Spec                      |
| ------------------ | ------------------------------ | ------------------------- |
| App icon           | `play-icon-512.png`            | 512 × 512 PNG             |
| Feature graphic    | `feature-graphic-1024x500.png` | 1024 × 500 PNG            |
| Phone screenshots  | `screenshots/phone-1…6-*.png`  | 1080 × 1920 PNG, 6 images |

---

## App details

**App name** (30 characters max)

```
Al-Madina Jewellers
```

**Short description** (80 characters max)

```
Today's gold rate in Mandi Bahauddin, hallmarked jewellery and sell-gold quotes.
```

**Full description** (4,000 characters max)

```
Al-Madina Jewellers has sold and bought gold in Sarafa Market, Mandi Bahauddin, since 1980. This app brings the shop to your phone: the day's rates, the jewellery, and a straight answer on what your gold is worth.

TODAY'S GOLD RATE
• The rates the shop publishes each day for 24K, 23.65K and 22K gold and for silver, per tola and per gram
• The time the rates were last updated
• A notification each morning, if you want one, as soon as the board is set
• A calculator that turns a weight in grams or tola into a value
• Share the day's rates on WhatsApp, as text or as a picture

WORKS WITHOUT A SIGNAL
• The rate board, the calculator and your saved pieces open whether or not you have a connection
• Each one tells you when the figures were last taken, so you always know what you are reading
• The rest of the shop — the catalogue, the forms — needs a connection as usual

JEWELLERY
• Browse bridal sets, bangles, rings, earrings, lockets and chains, and silver
• Each piece shows its karat and weight, with the price worked out against the day's rate
• Save pieces to your wishlist and send an order request, or ask about any piece on WhatsApp

SELL YOUR GOLD
• See the shop's buying rate before you visit
• Estimate the value of your gold by purity and weight
• Learn exactly how it works: your gold is tested and weighed in front of you, and you are under no obligation to sell

CUSTOM ORDERS
• Describe the piece you want, add a photograph, or record a voice note
• The workshop gets back to you with a design and a quote

VISIT THE SHOP
• Directions, opening hours and one-tap calling
• Open Saturday to Thursday, 11:00am – 8:00pm; closed on Friday

Weighed Honestly, Made Beautifully.
```

**Category:** Shopping
**Contact phone:** +92 321 7759959
**Website:** https://www.almadinajeweller.com
**Privacy policy:** https://www.almadinajeweller.com/privacy-policy
**Email:** a contact email is required by Play; use the shop's email address.

---

## What's new (500 characters max)

Pasted into the release notes for version 2.0:

```
The app is rebuilt. The gold rate board, the value calculator and your saved
pieces now open without a connection, and each tells you when its figures were
taken. Turn on rate alerts and the shop tells you every morning, as soon as the
day's board is set — one notification a day, nothing else. Everything else, the
catalogue and the forms, works as it always has.
```

---

## App content answers

**Privacy policy:** https://www.almadinajeweller.com/privacy-policy

**Ads:** No, the app does not contain ads.

**App access:** All functionality is available without special access.
The `/admin` area is a staff tool behind a sign-in and is not part of the
customer experience; if Play asks, explain that it is for shop staff only.

**Content rating:** answer the questionnaire as a shopping / reference app:
no violence, no sexual content, no profanity, no controlled substances, no
gambling, no user-to-user communication. Reviews are moderated by the shop
before they are published.

**Target audience:** 18 and over. Not designed for children.

**News app:** No. **Government app:** No. **Health app:** No.

**Financial features:** None. The app does not take payments; gold rates are
information and prices are settled in store.

---

## Data safety

**Does the app collect or share user data?** Yes, it collects data. It does
not share data with third parties.

**Is data encrypted in transit?** Yes (HTTPS only).

**Can users request that data is deleted?** Yes — by phone, WhatsApp or the
contact page, as the privacy policy explains. The app has no user accounts.

**Data collected** — for every type below: _collected_, _not shared_,
_optional_ (the user chooses to send it), purpose **App functionality** and
**Customer support**:

| Category            | Data type                    | Where it comes from                                                                                            |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Personal info       | Name                         | Contact, bridal, custom order, order request and review forms                                                  |
| Personal info       | Phone number                 | The same forms                                                                                                 |
| Personal info       | Email address                | Contact form (optional field); newsletter sign-up on the home page — also purpose **Developer communications** |
| Personal info       | Other info                   | City, wedding date, budget range, piece size, order reference                                                  |
| Photos and videos   | Photos                       | Custom order form (optional attachment)                                                                        |
| Audio               | Voice or sound recordings    | Custom order form (optional voice note)                                                                        |
| App activity        | Other user-generated content | Messages, piece descriptions, product reviews                                                                  |
| Device or other IDs | Device or other IDs          | The notification token, if the customer turns on rate alerts (see below)                                       |

**Not collected:** location, financial or payment info, contacts, calendar,
health, files, web browsing history.

**Notifications.** The app asks for the notification permission only when
somebody taps to turn rate alerts on, and sends one message a day: the morning
the shop publishes its board. The token it registers is declared above under
**Device or other IDs** — collected, **not shared**, optional, purpose **App
functionality** — and it is deleted when the alerts are turned off. The privacy
policy describes it under "Rate alerts in the app"; the two must agree.

**Analytics: both are ON.** Google Analytics and the Meta Pixel run on the
website the app displays, so Data safety must declare, under **App activity →
App interactions** and **Device or other IDs**: collected, **shared** (with
Google and Meta), not ephemeral, collection required, purposes **Analytics**
and — for the Pixel — **Advertising or marketing**. The privacy policy names
both and says how to block them. If the IDs are ever removed from the Vercel
environment, reverse all of that.

---

## Signing fingerprints

Both are public certificate hashes, and both are listed in
`public/.well-known/assetlinks.json` on the website.

| Key                             | SHA-256                                                                                           | Signs                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| App signing key (Google)        | `32:AC:93:C3:9C:79:45:0D:FC:AA:67:33:FC:1C:CB:CB:80:06:1D:F7:E3:A6:A0:4E:0B:D8:69:A2:4F:08:56:57` | Every copy installed from Google Play            |
| Upload key (`android.keystore`) | `2B:4B:2D:70:7B:1A:A8:7E:FF:B3:5A:0B:92:8D:BF:1B:BD:59:65:F6:C1:4D:39:06:D9:2D:FD:52:54:C6:FA:EB` | What you sign a release with before uploading it |

The upload key is the one that matters for every release from now on: Play takes
an update to this listing only from the key the first one was signed with. If
Google ever rotates the app signing key, copy the new snippet from _Protected
with Play → App signing → Digital Asset Links JSON_.

`assetlinks.json` itself is no longer what makes the app open without an address
bar — a Capacitor app has no address bar to hide. It stays because the Trusted
Web Activity is still installed on phones that have not updated yet, and because
it is what Play's link verification reads.

## Release checklist

1. Website PR merged and live. The app reads the live site, so anything the
   release depends on has to be there first.
2. Read the live **versionCode** off the Play Console and raise the one in
   `mobile/android/app/build.gradle` above it. As of 30 October 2026 production
   is on **2** (released 5 October 2026), so the repository is set to 3. There
   is also an empty **draft release** sitting in the production track from
   before — discard it, or upload into it, rather than leaving both.
3. `cd mobile && bun run release`, with `android/keystore.properties` pointing
   at the upload keystore (see [`../README.md`](../README.md)).
4. Upload `mobile/android/app/build/outputs/bundle/release/app-release.aab` to
   **Internal testing**, with Play App Signing on. Install it from the test
   track on a real phone and check it against the list below before promoting
   it.
5. Complete App content and Data safety from this file; paste the release
   notes; upload the listing assets.

   **The phone screenshots are out of date.** All six show the website, which
   is what the app used to be. Take fresh ones on the test device — Android's
   own screenshot is the right size — of the rate board, the calculator and
   the saved pieces, and keep the website ones that still hold (bridal, custom
   order, stores).

   Play has two open recommendations against the current build, both about
   edge-to-edge display. The Capacitor build targets SDK 36 and lets Capacitor
   inset the WebView, which is what they ask for; check they clear once it is
   live.

6. Personal developer account: closed test with 12+ testers for 14 days, then
   apply for production. Organisation account: promote to production.

## What to check on the phone before promoting

- The app opens on its own rate board, with the tab bar at the foot, and no
  address bar anywhere.
- The Shop button opens the catalogue in the app, and the back button comes
  home to the board rather than leaving the app.
- In aeroplane mode the board, the calculator and the saved pieces still open,
  each saying the figures were kept on the phone.
- A piece saved on the website appears on the Saved screen, priced at the
  day's rate.
- The header and footer show **no** admin link and **no** "get the app"
  buttons — that is the user-agent handshake in `src/routes/__root.tsx`.
- The back button walks back through the site and then leaves the app, rather
  than landing on a blank screen.
- WhatsApp, Instagram, Play and the map links open outside the app.
- With no connection at all on a fresh install, the rate screen offers the
  shop's phone numbers rather than a browser error page.
- Nothing is hidden behind the status bar at the top of the screen.
- On the gold rate page, the rate alerts card is there (it is invisible in a
  browser). Turning it on asks Android for permission once; turning it off does
  not ask again.
- Publishing a rate from the admin panel reaches the phone as one notification,
  not four, and tapping it opens the rate page.
