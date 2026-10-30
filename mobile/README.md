# The Android app

Al-Madina Jewellers on Google Play, as `com.almadinajeweller.app`. It shows
https://www.almadinajeweller.com, so a change to the website still appears in
the app without a release — the same arrangement the shop has had since the
app first went up.

What changed is the shell around it. The app was a Trusted Web Activity, a
Chrome tab with no address bar and nothing of its own. It is now a Capacitor
app: a real Android project, with a process the shop can put things in. The
first of those is notifications for the day's gold rate; screens of its own
come after.

The listing material — icon, feature graphic, screenshots, the description, the
Data safety answers and the signing fingerprints — is in
[`play-store/README.md`](play-store/README.md).

## Laid out here

```
mobile/
  capacitor.config.ts   the app's identity and what the WebView may open
  www/index.html        the bundled first screen, which opens the website
  scripts/              the launcher icon and splash, generated from public/
  android/              the Android project itself, committed
  play-store/           everything the Play Console asks for
```

`mobile/` keeps its own `package.json` on purpose. Nothing here is a dependency
of the website, and the Vercel build never installs any of it.

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

`bun run debug` syncs the web assets into the Android project and builds a debug
APK, signed with the debug key Gradle makes for itself. Copy it to a phone and
install it — that is how to see a change before anyone else does.

```sh
bun run release    # android/app/build/outputs/bundle/release/app-release.aab
```

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

`www/index.html` is the app's own first screen, bundled in the APK. It hands
over to the live site at once, and `allowNavigation` in `capacitor.config.ts`
keeps the site inside the WebView while leaving every other address — WhatsApp,
Instagram, Play, maps — to open outside it.

The alternative, `server.url`, points the WebView straight at a remote address.
Capacitor's documentation says that setting is not meant for production, and an
app with no page of its own has nothing to show when the phone is offline. The
bundled screen is also where the shop's own screens will be built, with the
website left to serve everything they do not cover.

## The app tells the website who it is

`capacitor.config.ts` appends `AlMadinaApp` to the user agent. The website
looks for it in `IN_APP_SCRIPT` (`src/routes/__root.tsx`) and hides everything
marked `hide-in-app`: the staff admin link, and the buttons offering to install
an app you are already reading this in.

Change that string in one place and it has to change in the other, or those
links come back inside the app.

## When the website's icons change

```sh
bun run icons
```

Regenerates the launcher icon, the adaptive icon and the splash from
`public/icon-512.png` and `public/icon-maskable-512.png`, so the app, the
installed website and the Play listing cannot drift apart. The generated files
are committed with the project.
