# The Android app

Al-Madina Jewellers on Google Play, as `com.almadinajeweller.app`.

It opens on three screens of its own, bundled in the APK and working with no
connection: the day's board, the gold value calculator, and the pieces saved
while browsing. Everything else is https://www.almadinajeweller.com, opened in
the same WebView by the Shop button — so the catalogue, the forms and the rest
still change with the website, without a release.

The app was a Trusted Web Activity to begin with: a Chrome tab with no address
bar and nothing of its own. Capacitor replaced it to make room for the morning
rate notification, and then for these screens.

Those screens are built from the website's own source — `src/lib/rates.ts` for
the arithmetic, `GoldRateBoard` and `GoldValueCalculator` for the screens
themselves, `styles.css` for the design. There is no second copy of a rate
anywhere in this folder, which is the only way the app and the site can be
relied on to quote the same figure for the same gold.

The listing material — icon, feature graphic, screenshots, the description, the
Data safety answers and the signing fingerprints — is in
[`play-store/README.md`](play-store/README.md).

## Laid out here

```
mobile/
  capacitor.config.ts   the app's identity and what the WebView may open
  app/                  the bundled screens: a small Vite + React build
  app/src/screens/      rate board, calculator, saved pieces
  app/src/lib/cache.ts  what is kept on the phone, and the wishlist mirror
  www/                  app/ built. Generated — not in the repository
  scripts/              the launcher icon and splash, generated from public/
  android/              the Android project itself, committed
  play-store/           everything the Play Console asks for
```

`mobile/` keeps its own `package.json` on purpose. Nothing here is a dependency
of the website, and the Vercel build never installs any of it. The one exception
is deliberate: the website depends on `@capacitor/core`,
`@capacitor/push-notifications` and `@capacitor/preferences` for their
JavaScript, because the code that talks to the phone — turning notifications on,
mirroring the wishlist — runs on website screens. Those versions must stay in
step with the ones here, or the bridge and the plugins disagree about what they
are talking to.

It reads the website's `.env` at build time rather than keeping a second copy of
the Supabase URL and publishable key. Build the app without that file and the
screens come up with nothing to show.

## What you need

- **JDK 21.** Capacitor 8 compiles against it; a JDK 17 fails with
  `invalid source release: 21`. Temurin 21 or the JDK that comes with Android
  Studio Otter (2025.2.1) or newer.
- **The Android SDK**, with platform 36 and build-tools 36. Android Studio
  installs both. Point `android/local.properties` at it, with forward slashes —
  `sdk.dir=C:/Users/you/AppData/Local/Android/Sdk` — because a backslash in a
  properties file is an escape character and the path quietly comes out wrong.
  That file is not committed, since the path is yours.
- **Bun**, as the website uses.

## Building it

```sh
cd mobile
bun install
bun run debug      # android/app/build/outputs/apk/debug/app-debug.apk
```

`bun run debug` builds the screens, syncs them into the Android project and
builds a debug APK, signed with the debug key Gradle makes for itself. Copy it
to a phone and install it — that is how to see a change before anyone else does.

To work on the screens without building an APK:

```sh
bun run dev        # the three screens in a browser, on the live database
```

The Capacitor plugins have web implementations, so Preferences falls back to
localStorage and the screens behave; only notifications need a real phone.

```sh
bun run release    # android/app/build/outputs/bundle/release/app-release.aab
```

That one cleans first, which costs a couple of minutes and is worth it: an
incremental build reuses the merged manifest, so a `versionCode` raised in
`build.gradle` can quietly fail to reach the bundle. Check it before uploading
either way — `aapt2 dump badging` on the debug APK prints what was actually
built.

That is the bundle Play takes. **It must be signed with the same upload key the
TWA was signed with** (SHA-256 `2B:4B:…:FA:EB`) or Play refuses it: an app's
upload key is how Play knows an update is really from the shop. Put the key
where Gradle can find it, in `mobile/android/keystore.properties` —
`.gitignore` keeps that file and any `.keystore` or `.jks` beside it out of the
repository:

```properties
storeFile=C:/somewhere/private/android.keystore
storePassword=…
keyAlias=…
keyPassword=…
```

With no such file the release bundle still builds, unsigned — enough to prove
it compiles, not enough to upload.

Before any release, raise `versionCode` in `android/app/build.gradle` above the
live one. The live number is in the Play Console; this repository does not know
it.

## How the website is reached

The Shop button is an ordinary navigation from the bundled screens to
www.almadinajeweller.com. `allowNavigation` in `capacitor.config.ts` keeps that
inside the WebView — so it is the app showing the catalogue, not a browser that
was handed it — while every other address, WhatsApp and Instagram and Play and
maps, opens outside the app where it belongs. Android's back button brings a
customer home to the app's own screens, because the website is a page further
on in the same history.

The alternative, `server.url`, points the whole WebView at a remote address.
Capacitor's documentation says that setting is not meant for production, and an
app with no pages of its own has nothing to show when the phone is offline.

## What the phone keeps

`app/src/lib/cache.ts`. Every screen paints from Capacitor Preferences first
and then replaces what it drew when the network answers; a screen showing kept
figures says so, with the date they were taken.

Preferences rather than localStorage for a reason worth remembering: the
bundled screens are served from `https://localhost` and the website from its own
domain, which are **different origins with different localStorage**. Preferences
belongs to the app, so it is the one place both halves can see. That is how the
wishlist crosses: `src/hooks/use-wishlist.ts` mirrors it there whenever a piece
is saved inside the app, and the Saved screen reads it back. The saving still
happens on the website, where the pieces are, and the Saved screen is
deliberately read-only — one list, one place to change it.

## The app tells the website who it is

`capacitor.config.ts` appends `AlMadinaApp` to the user agent. The website
looks for it in `IN_APP_SCRIPT` (`src/routes/__root.tsx`) and hides everything
marked `hide-in-app`: the staff admin link, and the buttons offering to install
an app you are already reading this in.

Change that string in one place and it has to change in the other, or those
links come back inside the app.

## Notifications

One message a day: the morning the shop publishes its rates. The app's part is
small — `@capacitor/push-notifications` and the manifest entries that say what a
notification looks like before the app is open. Everything a customer touches is
on the website side, because the website is what the app shows:
`src/lib/push.ts` and the card on the gold rate page. The sending side is the
`gold_rates` trigger in `supabase/migrations/20261030090000_rate_alerts.sql` and
the Edge Function it calls.

To make it work, once:

1. A **Firebase project** with an Android app registered as
   `com.almadinajeweller.app`. Its SHA-1 is not needed for messaging.
2. Download **`google-services.json`** and put it in `mobile/android/app/`.
   Gradle applies the Google services plugin when that file is there and skips
   it when it is not, so the app builds either way — it simply cannot receive a
   notification without it.
3. From the same project, **Project settings → Service accounts → Generate new
   private key**. That JSON is a credential: it goes to Supabase, never into
   this repository.

   ```sh
   supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
   supabase functions deploy notify-enquiry
   ```

The three agreed names, which have to match on both sides: the channel `rates`,
the path `/gold-rate-in-mandi-bahauddin-today`, and the notification icon
`ic_stat_rate`.

## When the website's icons change

```sh
bun run icons
```

Regenerates the launcher icon, the adaptive icon, the splash and the white
notification silhouette from `public/icon-512.png` and
`public/icon-maskable-512.png`, so the app, the installed website and the Play
listing cannot drift apart. The generated files are committed with the project.
