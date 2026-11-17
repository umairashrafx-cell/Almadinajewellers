# Data safety audit — Al-Madina Jewellers Android app

Audited 16 November 2026 against `master` at `92ee97c` (release 5, version 2.1),
the live website it opens, and the merged release manifest of a `master`
build. Nobody here can see the Play Console: the comparison in the last part is
against what the owner reports is filed, which is **Location, App activity and
Device or other IDs marked "shared"**. Every other answer in the form has to be
checked by the owner against the tables below.

## Play's terms, exactly

From Play Console Help, _Provide information for Google Play's Data safety
section_ (answer 10787469):

- **Collected** means transmitted off the device — to you or anyone else. That
  includes data collected _"from a webview which has been opened from your app,
  if your app is in control of the code/behavior delivered through that
  webview."_ The app's WebView shows the shop's own website, whose code the
  shop controls, so **the website's trackers count as the app's**. (The
  exemption is only for a WebView in which people browse the open web.)
- **Shared** means transferred to a **third party**. A transfer to a **service
  provider** — _"an entity that processes user data on behalf of the developer
  and based on the developer's instructions"_ — is **not** sharing. An SDK
  provider that builds advertising profiles across its customers is not acting
  as a service provider, and sending it data **is** sharing.
- **Approximate location** _"that is inferred, such as via IP address … must
  be disclosed."_ No location permission is needed for this to apply.
- Data held only on the phone is not collected at all.

So _collected_ and _shared_ are two separate questions, and a recipient's role
decides the second: Supabase holding a custom order is collection without
sharing; Meta receiving a page view is both.

## Every SDK and data flow

| Component                               | Runs in                     | What leaves the phone                                                                                     | Goes to           | Role                                                                                                                                         | Code                                                  |
| --------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Supabase (database, storage, functions) | Both halves                 | Rates/catalogue reads; form submissions; photos and voice notes; push token and its preferences           | Supabase          | **Service provider**                                                                                                                         | `src/integrations/supabase/client.ts`, `src/lib/*.ts` |
| Firebase Cloud Messaging                | App, only after opt-in      | Registration token; message delivery                                                                      | Google (Firebase) | **Service provider**                                                                                                                         | `@capacitor/push-notifications`, `src/lib/push.ts`    |
| Resend                                  | Server side                 | A new enquiry's details, emailed to shop staff                                                            | Resend            | **Service provider**                                                                                                                         | `supabase/functions/notify-enquiry`                   |
| Vercel                                  | Website hosting             | Requests to the website (IP, user agent)                                                                  | Vercel            | **Service provider**                                                                                                                         | —                                                     |
| **Google Analytics 4**                  | **Website half only**       | Page views (path, title, full URL), a client-ID cookie; Google derives coarse location from the masked IP | Google            | Service provider **if** used only for the shop's analytics — see note 1                                                                      | `src/components/layout/Analytics.tsx`                 |
| **Meta Pixel**                          | **Website half only**       | Page views, the `_fbp` browser ID, device and browser details, IP                                         | Meta              | **Third party** — Meta uses it for remarketing (the privacy policy says it _"lets us show our jewellery to people who have visited before"_) | `src/components/layout/Analytics.tsx`                 |
| Google Fonts                            | Both halves                 | IP and user agent when the typefaces load                                                                 | Google            | Not user-data collection; nothing is stored or profiled for the shop                                                                         | `mobile/app/index.html`, `src/routes/__root.tsx`      |
| Google Maps embed                       | Website's Stores page       | IP and browser details when the map draws                                                                 | Google            | As Fonts                                                                                                                                     | website                                               |
| WhatsApp, phone, Maps links             | Both                        | Nothing, until the customer acts in that other app                                                        | —                 | User-initiated hand-off, not collection                                                                                                      | `src/lib/site.ts`                                     |
| Capacitor Preferences / localStorage    | On the phone                | Nothing — wishlist, cache, settings stay on the device                                                    | —                 | Not collected                                                                                                                                | `mobile/app/src/lib/cache.ts`                         |
| Lovable error hook                      | Lovable editor preview only | Nothing in production: it calls `window.__lovableEvents`, which exists only inside the editor             | —                 | Inert in the app                                                                                                                             | `src/lib/lovable-error-reporting.ts`                  |

Checked and **not present**: no location permission and no geolocation call
anywhere (`navigator.geolocation` grepped across `src/` and `mobile/`; the
merged release manifest asks for `INTERNET`, `ACCESS_NETWORK_STATE`,
`WAKE_LOCK`, `POST_NOTIFICATIONS`, the FCM receive permission and, from 2.1,
`RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS`). No Advertising ID permission and no
SDK that reads it. No crash-reporting SDK. No payments. No accounts.

Both trackers were confirmed loading on the live site on 16 November 2026
(`gtag` and `fbq` present, both script tags served). They load only on the
website half: the app's bundled screens — home, rates, calculator, shop, saved,
sell, custom order, settings — import neither. A customer who never opens a
website page from the drawer is never tracked, but Play counts the WebView, so
the declaration must cover them.

**Note 1 — Google Analytics and "shared".** Under the Analytics terms Google
processes the data for the shop, which is the service-provider case. That
changes if Google signals, a Google Ads link or Analytics' data-sharing settings
are switched on in the GA property — those settings are not in the code and
need checking in Analytics (Admin → Data collection; Admin → Product links).
It does not change the answers below, because Meta already makes each of these
types "shared".

## Data types, collected and shared

| Play data type                                                | Collected | Shared         | Who / why                                                                                                                       | Optional?                                             |
| ------------------------------------------------------------- | --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Location → Approximate location**                           | **Yes**   | **Yes** (Meta) | Inferred from IP by GA and the Pixel on website pages. Purposes: Analytics; Advertising or marketing                            | Required (no in-app switch)                           |
| Location → Precise location                                   | **No**    | No             | No permission, no API, no coordinates anywhere                                                                                  | —                                                     |
| Personal info → Name                                          | Yes       | No             | Custom order, appointment and contact forms (app); bridal, order request, review forms (website). App functionality             | Optional                                              |
| Personal info → Phone number                                  | Yes       | No             | The same forms                                                                                                                  | Optional                                              |
| Personal info → Email address                                 | Yes       | No             | Contact form's optional field (app and site); newsletter (site) — that one also Developer communications                        | Optional                                              |
| Personal info → Other info                                    | Yes       | No             | City, wedding date, budget, piece size, preferred time, order reference                                                         | Optional                                              |
| Photos and videos → Photos                                    | Yes       | No             | Custom-order photo, private bucket                                                                                              | Optional                                              |
| Audio → Voice or sound recordings                             | Yes       | No             | Custom-order voice note, private bucket                                                                                         | Optional                                              |
| **App activity → App interactions**                           | **Yes**   | **Yes** (Meta) | Page views on website pages. Analytics; Advertising or marketing                                                                | Required                                              |
| App activity → Other user-generated content                   | Yes       | **No**         | Order descriptions, messages, reviews — to Supabase only                                                                        | Optional                                              |
| App activity → In-app search history                          | **No**    | No             | Search filters on the phone; the query never reaches a URL or a request                                                         | —                                                     |
| **Device or other IDs**                                       | **Yes**   | **Yes** (Meta) | FCM token (App functionality, not shared); GA client ID (Analytics); Meta `_fbp` (Analytics; Advertising or marketing — shared) | Required for the trackers; the push token is optional |
| App info and performance                                      | No        | No             | No crash or diagnostics SDK                                                                                                     | —                                                     |
| Financial info                                                | No        | No             | No payments in the app                                                                                                          | —                                                     |
| Web browsing history                                          | No        | No             | The WebView shows only the shop's own site; those page views are App interactions                                               | —                                                     |
| Contacts, Calendar, Messages, Health, Files and docs, Fitness | No        | No             | —                                                                                                                               | —                                                     |

Other answers on the form: **encrypted in transit — yes** (every request is
HTTPS; the WebView is confined to the shop's two HTTPS hosts). **Deletion —
yes, on request** by phone, WhatsApp or the contact page, as the privacy
policy says; there are no accounts, so Play's account-deletion URL requirement
does not apply. Separately, under App content: **Ads — no** (the Pixel is
measurement and remarketing elsewhere, not ads in the app); **Advertising ID —
not used**.

## Against what is filed

The owner reports the filed form marks **Location**, **App activity** and
**Device or other IDs** as **shared**.

| Filed                        | Code says                                                                                    | Verdict                                                                                                        | Which way it cuts                                                                                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location — shared            | Approximate location, inferred from IP, collected and shared via the Pixel                   | **Correct — if it is _Approximate_ only.** If _Precise_ is ticked, that is wrong.                              | Precise ticked = **over-declaration**: no policy breach, but it tells customers the app tracks exactly where they are, which it never does — untick it. Approximate missing would be **under-declaration**, the one Play enforces. |
| App activity — shared        | App interactions shared with Meta; other user-generated content collected but **not** shared | **Correct for App interactions.** If "Other user-generated content" is also marked shared, that part is wrong. | UGC marked shared = **over-declaration** (says customers' messages go to a third party; they go only to Supabase). UGC missing altogether = **under-declaration**.                                                                 |
| Device or other IDs — shared | FCM token not shared; GA and Meta IDs collected; Meta's shared                               | **Correct.** The type is shared because one recipient is a third party.                                        | —                                                                                                                                                                                                                                  |

**Checked in the Console, 16 November 2026.** The filed form agrees with
every row above. It shares Approximate location (not Precise), App
interactions and Device or other IDs, each for Analytics and Advertising or
marketing, and each as required. It collects Name, Email, Phone, Other info,
Photos, Voice recordings and other user-generated content, all optional and
none shared. Encryption in transit and deletion on request are both answered.
One gap was found: Device or other IDs gave no **App functionality** purpose,
which the push token needs. It was added and published on 16 November 2026.
Personal info is filed as App functionality only. That is right, because Play
has no "customer support" purpose, although an earlier version of this repo
said it did.

Things the code collects that the owner's summary does not mention. They may
well be on the form as _collected, not shared_ — but each one missing is
**under-declaration**, the direction Play acts on:

1. **Personal info** — name, phone, email, other info.
2. **Photos** and **Voice or sound recordings** — collected by the app's _own_
   custom-order screen (`RECORD_AUDIO` is in the release manifest), not only by
   the website.
3. **App activity → Other user-generated content.**
4. **Purposes**: _Advertising or marketing_ must sit on the three Meta-shared
   types, not Analytics alone.
5. **Required vs optional**: the analytics data is _required_ — there is no
   in-app way to refuse it. Marking it optional is a mismatch.

And one mismatch inside this repository: `mobile/play-store/README.md` said
**"Not collected: location"** while also saying analytics data is shared. That
line was wrong — IP-inferred approximate location counts — and is corrected in
this PR. The privacy policy already says Google Analytics receives _"roughly
where you are"_; it says the same of neither Meta nor its IP, which is worth a
sentence when the policy is next edited.

## If the trackers ever go

Removing `VITE_GA_MEASUREMENT_ID` and `VITE_META_PIXEL_ID` from the Vercel
environment turns both off (`Analytics.tsx` renders nothing without them). Then
Approximate location and App interactions stop being collected, Device or other
IDs drops to the push token — collected, not shared — and nothing is shared at
all. The form and the privacy policy would both have to be changed that day.

Sources: [Play Console Help — Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en);
[Analytics Help — Prepare for Google Play's data disclosure requirements](https://support.google.com/analytics/answer/11582702?hl=en);
the live [privacy policy](https://www.almadinajeweller.com/privacy-policy).
