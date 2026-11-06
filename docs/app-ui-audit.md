# The Android app's own screens: discovery, audit, and what was changed

Scope of this document: `mobile/app/src`, the five screens bundled inside the
APK. The live website (`src/`) and the staff admin are described where they
bear on the app, but they were not changed.

Written against the app as it stood on 6 November 2026, and updated with what
the accompanying pull request did about it.

---

## 1. Technology discovery

Everything below is read from the repository, not assumed.

|                   |                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Website framework | React 19 + TanStack Start 1.168 (file-based router, SSR)                                                  |
| App framework     | React 19, **no router** — five screens switched on `window.history.state`                                 |
| Language          | TypeScript 5.8, strict                                                                                    |
| Build             | Vite 8; website at the repo root, app at `mobile/app/vite.config.ts` → `mobile/www`                       |
| Package manager   | Bun                                                                                                       |
| Native shell      | Capacitor 8.6, Android only; `appId` `com.almadinajeweller.app`                                           |
| Capacitor plugins | `@capacitor/preferences`, `@capacitor/push-notifications`                                                 |
| Styling           | Tailwind 4 (CSS-first). One stylesheet, `src/styles.css`, imported by the app                             |
| UI library        | None in the app. The website uses Radix primitives; the app imports three of the website's own components |
| State             | React state and `useSyncExternalStore`. No Redux/Zustand. TanStack Query on the website only              |
| Backend           | Supabase (Postgres + edge functions). Same project and publishable key for both halves                    |
| Customer auth     | **None exists.** The only auth is a staff gate on `/admin` (`src/lib/admin.ts`)                           |
| Testing           | Vitest, `environment: "node"`, `*.test.ts` only — no jsdom, so components cannot be rendered in a test    |
| Lint              | ESLint flat config, which **ignores `mobile/` entirely** (`eslint.config.js:11`)                          |
| Fonts             | Cormorant Garamond / Inter / Montserrat, fetched from Google Fonts at runtime                             |

### The one architectural fact that governs everything

The app is **two origins in one WebView**:

- `https://localhost` — the five bundled screens, in the APK, offline-capable.
- `www.almadinajeweller.com` — the live website, loaded at runtime, listed in
  `allowNavigation` so it is an ordinary navigation rather than a jump out to
  the browser.

They have separate `localStorage`. Anything both halves must agree on — the
wishlist above all — goes through Capacitor Preferences, which belongs to the
app rather than to either origin. `src/lib/wishlist.ts` carries the reasoning.

### What the app does _not_ contain

Worth stating plainly, because a redesign brief written for a generic
jewellery app will ask for these and there is nothing here to redesign:

- No splash screen beyond the Android default, no onboarding.
- **No customer accounts**: no login, registration, forgot-password, OTP,
  profile, saved addresses or order history. Nothing in the codebase issues a
  customer session.
- No cart or checkout on the app's own screens. The website has `/cart` and a
  payment route at `/pay/$token`; the app reaches them by navigating to the
  website.
- No notifications centre. There is one push: the morning rate alert.

Adding any of those is product work, not a redesign, and each would need a
backend decision first.

---

## 2. UI/UX audit of the app's five screens

Severity: **High** = a customer is misinformed, blocked, or cannot find the
thing the app exists for. **Medium** = avoidable friction or a wrong-looking
screen. **Low** = polish.

### High

**H1 · The home screen buried the one number the app exists for.**
`RateScreen` rendered `GoldRateBoard` with `showBrand` on. That block is a
112px logo, a wordmark and a `TRUST ◆ PURITY ◆ TIMELESS BEAUTY` ribbon —
correct on the website's rate page, where the board stands alone, and correct
in the picture the shop forwards on WhatsApp. In the app it sat two
centimetres below the header's own AL-MADINA JEWELLERS, so the name was said
twice and the first rate row started **468px** down a 375×812 screen, with the
24K figure itself near the fold and below it on a 360×640 phone. The
component's own documentation says `showBrand` should be false "on a page
whose own heading already said so".
_Fixed: `showBrand={false}`. First rate row now at **293px**; three rates are
visible on launch._

**H2 · The offline warning cried wolf on every launch.**
`useCached` paints from the phone first and then goes to the network, so
`stale` is true for as long as that request is in flight. The `Kept` strip
keyed off `stale` alone, which meant a phone with five bars opened to a
struck-through wifi icon and "Kept on this phone" for the second before
today's board landed. Nothing had failed.
_Fixed: the in-flight second is now a quiet "Checking for today's figures"
line; the alarm is kept for the attempt that actually came back empty._

**H3 · The staleness notice did not say how stale.**
"Kept on this phone" distinguishes kept figures from live ones but not ten
minutes from three days — which is the whole of the difference between reading
the number and ringing the shop about it.
_Fixed: the cache now stores when each entry was written, and the strip reads
"Kept on this phone, from 3 minutes ago." `mobile/app/src/lib/kept.ts`, with
tests._

**H4 · The Saved screen's empty state offered only a door that does not open
offline.** Its single action was "Browse the shop", which is the website.
Somebody opening the saved pieces in the bazaar on one bar of signal was shown
the one thing on that screen that needs a connection.
_Fixed: "See the pieces" — the app's own offline catalogue, with the same
hearts — goes first; the shop stays underneath._

### Medium

**M1 · Changing tab inherited the previous screen's scroll position.** The
five screens are one document under one scroller. Reading the rate board to
the foot and tapping Pieces landed you halfway down the grid under a blank
page-end, which reads as a broken screen rather than as a scroll position.
_Fixed — and note the trap: `src/styles.css` sets `scroll-behavior: smooth` on
`html`, so a bare `scrollTo(0,0)` would have animated a scrub up the whole of
the screen you just left and then the whole of the one you arrived at. The
reset is explicitly `behavior: "instant"`._

**M2 · Tapping the tab you are already on did nothing.** The idiom on every
phone is "take me back to the top", and the rate board and the catalogue are
both several screens tall.
_Fixed: smooth, deliberately — the content is not changing, so seeing the
scroll is what says the tap was understood. The site's reduced-motion rule
turns it off for anyone who asked._

**M3 · Tap targets under the minimum.** Measured in the running app at 375px:
header heart 36×36, Website button 34 tall, offline refresh 36×36, the heart
on every product tile 36×36, category chips 28 tall. Android asks for 48dp and
WCAG 2.2 for 44. The two header controls sit side by side in the corner
farthest from a thumb, and the tile heart sits _on top of_ a button that opens
the piece — the worst place in the app to be eight pixels short.
_Fixed: all raised to 44, icons to 20px, and the saved-row gutter widened to
match._

**M4 · Loading states were a line of centred text in an empty screen.** On a
slow connection that is indistinguishable from a screen that has failed.
_Fixed: skeletons in the shape of what is coming — three rate rows, six
catalogue tiles — which also stop the page jumping when the real content
lands._

**M5 · "Nothing here matches that" was wrong when a category chip, not a
search, had done the hiding** — it blamed a search nobody had typed — and the
only way out it offered was the website.
_Fixed: it now names whichever narrowed things down, and offers a button that
clears it._

**M6 · Calling the shop was the smallest target on the Store screen.**
Directions and WhatsApp were full-width buttons; the phone numbers were 20px
underlined lines inside a definition list. Ringing a jeweller is the commonest
thing anybody does with a shop's details, especially in a town where everyone
knows where Sarafa Market is.
_Fixed: both numbers are now buttons, first in the action group. Both, not one
"Call" button, which would have to choose and would choose wrong half the
time._

### Low

**L1 · 80px of empty ivory on the Calculator** between the rate line and the
purity buttons — the app added `mt-8` on top of the component's own `mt-12`,
which exists for the website page it normally sits on. _Fixed._

**L2 · Dead code**: `RateScreen` exported a `Refresh` component "for the
Calculator screen, which shows the same line". The Calculator does not use it
and never did. _Removed._

**L3 · The category chip row had a visible scrollbar track.** _Fixed with the
existing `no-scrollbar` utility._

### Found, not changed — and why

- **Fonts are fetched from Google at runtime.** Offline, the app falls back to
  the phone's own faces, so the first launch in a basement is not in the
  shop's typeface. Bundling three woff2 files in the APK would fix it. Left
  alone: it adds binary assets and APK weight, and it is a decision about
  licensing and size that belongs to the owner, not to a polish pass.
- **The five tabs are the right five.** Rate is why the app exists; Pieces is
  the catalogue; Calculator is the one tool; Store is the address that matters
  when nothing will load at all. Saved is correctly a header heart rather than
  a fifth tab — it is a place you come back to, not one of the four things you
  open the app to do, and a fifth tab would also cost "Calculator" the width
  it needs at 360px. No change recommended.
- **`GoldValueCalculator` carries seven lines of explanatory prose between
  Purity and Weight** on a phone. It is a website component shared with two
  site pages; trimming it for the app would either fork the arithmetic or
  change the website. Worth a `compact` prop one day.
- **ESLint ignores `mobile/`.** Pre-existing (`eslint.config.js:11`). The app's
  code has never been linted by the repo's own config. Worth fixing on its
  own, not inside a UI change.

---

## 3. On the wider "international-standard luxury redesign" brief

The brief that prompted this document asks for a programme across the whole
product. Three things about it are worth settling before any of it starts.

1. **Most of its screen list does not exist here** — splash, onboarding,
   login, registration, OTP, profile, addresses, order history, notifications
   centre. See §1. Those are features to decide on and build, not screens to
   restyle, and several imply a customer auth system this business does not
   currently have.

2. **The palette it proposes is approximately the one already in use.** The
   site's tokens live in `src/styles.css` as OKLCH and already read as
   gold-on-ivory with a deep green. Replacing them with the hex values in the
   brief would be a lateral move that touches every component and every
   screenshot the shop has shared.

3. **The bottom bar it proposes — Home / Categories / Wishlist / Orders /
   Profile — would break this app**, which has no orders and no profile, and
   would displace the rate board, the single reason a customer in Mandi
   Bahauddin installs it.

What is genuinely worth doing from that brief, in order: the audit above
(done); the same audit for the website's own mobile layout; a `compact` prop
for the shared calculator and rate board so the app can borrow them without
borrowing a brochure; bundled fonts; and then, as separate product decisions,
anything involving accounts.
