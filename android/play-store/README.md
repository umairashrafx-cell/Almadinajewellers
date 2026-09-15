# Google Play listing — Al-Madina Jewellers

Everything to paste or upload in the Play Console. The app is a Trusted Web
Activity: it opens https://www.almadinajeweller.com full-screen, so any change
to the website appears in the app without a new release.

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
• A calculator that turns a weight in grams or tola into a value
• Share the day's rates on WhatsApp, as text or as a picture

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

| Category          | Data type                    | Where it comes from                                                                                            |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Personal info     | Name                         | Contact, bridal, custom order, order request and review forms                                                  |
| Personal info     | Phone number                 | The same forms                                                                                                 |
| Personal info     | Email address                | Contact form (optional field); newsletter sign-up on the home page — also purpose **Developer communications** |
| Personal info     | Other info                   | City, wedding date, budget range, piece size, order reference                                                  |
| Photos and videos | Photos                       | Custom order form (optional attachment)                                                                        |
| Audio             | Voice or sound recordings    | Custom order form (optional voice note)                                                                        |
| App activity      | Other user-generated content | Messages, piece descriptions, product reviews                                                                  |

**Not collected:** location, financial or payment info, contacts, calendar,
health, files, device IDs, web browsing history.

**Analytics: both are ON.** Google Analytics and the Meta Pixel run on the
website the app displays, so Data safety must declare, under **App activity →
App interactions** and **Device or other IDs**: collected, **shared** (with
Google and Meta), not ephemeral, collection required, purposes **Analytics**
and — for the Pixel — **Advertising or marketing**. The privacy policy names
both and says how to block them. If the IDs are ever removed from the Vercel
environment, reverse all of that.

---

## Signing fingerprints in assetlinks.json

| Key                             | SHA-256                                                                                           | Signs                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| App signing key (Google)        | `32:AC:93:C3:9C:79:45:0D:FC:AA:67:33:FC:1C:CB:CB:80:06:1D:F7:E3:A6:A0:4E:0B:D8:69:A2:4F:08:56:57` | Every copy installed from Google Play            |
| Upload key (`android.keystore`) | `2B:4B:2D:70:7B:1A:A8:7E:FF:B3:5A:0B:92:8D:BF:1B:BD:59:65:F6:C1:4D:39:06:D9:2D:FD:52:54:C6:FA:EB` | The APK built locally and sideloaded for testing |

Both are public certificate hashes. If Google ever rotates the app signing key, copy the new snippet from _Protected with Play → App signing → Digital Asset Links JSON_.

## Release checklist

1. Website PR merged and live (service worker, offline page, manifest, privacy
   policy).
2. `bubblewrap init --manifest https://www.almadinajeweller.com/site.webmanifest`
   with package name `com.almadinajeweller.app`. Back up the keystore and its
   passwords.
3. `bubblewrap build` → upload `app-release-bundle.aab` to **Internal testing**,
   with Play App Signing on.
   `public/.well-known/assetlinks.json` already lists the **upload key**
   (`2B:4B:…:FA:EB`), so the APK you build and sideload opens with no address
   bar. Copies installed from Play are signed by Google's key instead, so:
4. Copy the **App signing key certificate SHA-256** from
   _Setup → App signing_ → add it to `public/.well-known/assetlinks.json` alongside the upload key →
   merge → confirm the app opens with no address bar.
5. Complete App content and Data safety from this file; upload the listing
   assets.
6. Personal developer account: closed test with 12+ testers for 14 days, then
   apply for production. Organisation account: promote to production.
