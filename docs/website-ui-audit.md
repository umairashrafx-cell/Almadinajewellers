# The website and admin: UI/UX audit

Companion to [`app-ui-audit.md`](./app-ui-audit.md), which covers the Android
app's own bundled screens and carries the technology discovery for the whole
project. This document covers `src/` — the live website — and says what could
not be seen.

Measured on 6 November 2026 against the dev server, at 375×812 (phone) and
1280×900 (desktop), on live Supabase data.

## How this was measured

Not by eye alone. For each route: the DOM was walked for elements extending
past the viewport, for every link/button/field under 44px, and for heading
order; images were counted for `alt`, lazy loading and intrinsic sizing; and
colour contrast was computed per WCAG 2.1 with colours resolved through a
canvas (`getComputedStyle` returns `oklch()` here, which a naive rgb parser
reads as nonsense — an early pass of this audit produced a page of false
contrast failures that way, and they are not in this document). The contrast
maths was sanity-checked against white-on-black, which returned 21.0.

Routes exercised: `/`, `/collections`, `/collections/bridal-sets`,
`/products/noor-e-shahana-bridal-set`, `/cart`, `/wishlist`, `/custom-order`,
`/gold-rate-in-mandi-bahauddin-today`, `/stores`, `/admin`.

---

## High

### W1 · The floating WhatsApp button lands on the arrival view — fixed

At 375×812 the fixed WhatsApp button (`56×56` at x 295, y 732 —
`src/components/layout/FloatingWhatsApp.tsx`) sits inside the text column.
There is no gutter to put it in at that width: a 56px circle inset 24px from
the right edge of a 375px screen is 16px inside the content's own margin. So
the question was never whether it covers something, but what, and when.

Re-measured by intersecting the circle against the rendered glyphs of every
visible text node, and against every control's box, on arrival, with nothing
scrolled:

| Route                                          | Under the circle on arrival                          |
| ---------------------------------------------- | ---------------------------------------------------- |
| `/collections`                                 | the **Bridal Sets** link — a live control            |
| `/collections/bridal-sets`                     | the first card's **ENQUIRE** button — a live control |
| `/products/:slug`                              | the `<h1>`, tail of line one                         |
| `/cart`                                        | **"Nothing chosen yet"** and the line under it       |
| `/wishlist`                                    | "Tap the heart on any piece to keep it here…"        |
| `/`, `/custom-order`, `/stores`, `/gold-rate…` | nothing                                              |

Five of the nine public routes, and the first draft of this document named
only one of them. Two are live controls — a thumb reaching for the first
collection, or for the first product's own Enquire button, meets the WhatsApp
circle instead — and two more are the single sentence that tells a customer
who has found an empty page what to do next.

Every one of them is an **arrival** overlap. Nothing had been scrolled past,
so nothing could be scrolled back to: the circle was sitting on the first
impression and staying there until the customer worked out they had to move
the page to read it.

**Fixed in this change.** The button keeps off the first screen and fades in
once the page has moved 120px — about the height of the button and its pulse
ring, so whatever the arrival view put in that corner has cleared the band by
then. A page too short to scroll that far shows it at once.

At every width, not only on phones. The margin the circle would need in order
to sit beside the content rather than inside it does not appear until roughly
1400px: the column is `max-w-7xl` inside `px-4 sm:px-6 lg:px-8`, so on
`/collections/bridal-sets` the circle still covers the first card's ENQUIRE
button at 640, 768, 900, 1024, 1180 and 1280px. Where it clears depends on
what a page puts in that corner as much as on the viewport, so there is no
breakpoint worth picking.

Waiting costs the shop no reach. WhatsApp is not only this button: the
announcement bar carries the number and the header carries the same icon, both
on the first screen of every page, above whatever the circle was covering.

What is deliberately **not** fixed is the same circle floating over the middle
of a long page once you are reading it — at 300px down the product page it
covers part of a weight in the specification table. That is the ordinary cost
of a floating button, it can be scrolled away from, and removing it would mean
removing the button.

### W2 · Three competing gold palettes in one stylesheet

`src/styles.css` defines three overlapping sets of brand colours:

|            | gold                    | deep gold                    | ivory                    |
| ---------- | ----------------------- | ---------------------------- | ------------------------ |
| site       | `--gold` `#C9A24B`      | `--gold-deep` `#7C5E13`      | `--ivory` `#FAF7F2`      |
| rate board | `--rate-gold` `#c9a24a` | `--rate-gold-deep` `#8a6a18` | `--rate-ivory` `#f8f5ec` |
| "lux"      | `--lux-gold` `#b8892d`  | `--lux-gold-deep` `#a97820`  | `--lux-ivory` `#fcfaf6`  |

Three golds, three deep golds, three ivories, two creams, two inks. The first
two golds differ by one hex digit — close enough that nobody will spot it and
far enough that they will never quite match.

The `rate-*` fork has a defensible reason: the board is also the picture the
shop forwards on WhatsApp, so it is a self-contained artwork. It is used in
nine files — the three `components/rate/` pieces, the four
`components/sell/` ones, and the two routes that embed them.

The `lux-*` fork has no such reason. It is used by **exactly one component**,
`src/components/layout/Header.tsx`, which means the site's header is drawn in
a slightly different gold from the site underneath it.

This is the "inconsistent colours" item in the brief, and it is the real
design-system debt. The fix is to fold `lux-*` into the site palette, not to
add a fourth set.

---

## Medium

### W3 · Tap targets under the minimum, site-wide — fixed

Every control on the nine public routes was measured at 375×812: its box, and
where it carries a hit area reaching past its ink, that. Before: **49 under 44
pixels on the product page alone**, most of them the same handful repeated,
because they live in the shared chrome.

| Element                                   | Was           | Now                 |
| ----------------------------------------- | ------------- | ------------------- |
| Search / Cart / WhatsApp / Menu           | 40×40         | 44×44               |
| Announcement bar WhatsApp link            | 174×17        | 174×44 (hit area)   |
| Breadcrumb links, all sixteen copies      | 38×13, 82×13  | ≥44 tall (hit area) |
| Footer column links, ~24 of them          | ~17 tall      | 44×44 on touch      |
| Footer phone, social, Admin, build credit | 17–32         | 44                  |
| Product-card wishlist heart               | 36×36         | 44×44               |
| Product-card ENQUIRE bar                  | 164×41        | 164×45              |
| Save to wishlist / Share / Book a viewing | 142–155×17    | 44 tall             |
| Review stars, review form fields          | 32×32, ×42    | 44×44, ×44          |
| Collection FILTER button and sort select  | 98×35, 192×34 | 44 tall             |
| Hero pause button                         | 40×40         | 44×44               |
| Our Story / Full rate table / Confirm     | 80–232×23     | 44 tall             |
| Store phone and WhatsApp links            | 116–126×17    | 44 tall             |

After: **nothing under 44 on any of the nine routes** except inline links
inside sentences, which are excluded below.

#### Three ways, chosen per control

**Real height** wherever there was room for it — the header icons, the card
hearts, the phone numbers, the form controls, the standalone calls to action.
A control a thumb aims at should be the size it claims to be.

**A hit area reaching past the ink** (`.tap-44` in `src/styles.css`) where
growing the box would push the page around: the announcement strip, which is
already sixty-six pixels of every phone screen; the breadcrumb, which would
open a gap under itself; and the twenty-two review links on the home page,
where real height added six hundred pixels to a page that is twelve screens
tall. The box is transparent and takes no space. It can reach over a
neighbour and steal its tap, so it is only used where the neighbours are
plain text — each one was checked by hit-testing the points around it.

**Left alone: links inside a sentence.** "privacy policy" on the home page,
"Send it there instead" on `/custom-order`, "Leave a review on Google" on
`/stores`. WCAG 2.5.5 and 2.5.8 both except a target whose size is
constrained by the line-height of the text around it, and that is exactly
these: a 44px box around a word in a paragraph would reach into the lines
above and below and take their taps. Also left alone is the
`www.almadinajeweller.com` link inside the rate board, which is part of the
artwork the shop forwards on WhatsApp, and the `sr-only` radios in the
calculator, whose labels are the real targets and are already large.

#### What it costs

The footer goes from **1,542px to 2,078px on a touch device — plus 536px on
every page**, isolated by neutralising the rules and re-measuring. Twenty-four
links cannot each be 44px tall for free.

Gated on `pointer: coarse` rather than on width, so a mouse keeps the compact
footer: the predicate is whether a finger is doing the pointing, which is the
thing 44px is for. Worth a second opinion, given that the same instinct to
gate W1 by width was wrong — there the overlap existed at every width, so the
breakpoint was answering the wrong question. Here it is not the viewport that
decides whether 44px is needed.

### W11 · The product card's ENQUIRE bar cannot be reached on a phone

Found while fixing W3, and **not fixed**.

The card's one call to action is `translate-y-full` until the card is
hovered. On a touch device there is no hover, so it is never untranslated:
measured, it sits at `translate: 0px 100%`, its top edge exactly on the image
box's bottom edge, and the image box is `overflow: hidden`. A tap at its
centre lands on the product name below the card. Keyboard and screen-reader
users are fine — `focus-visible:translate-y-0` slides it in.

The same hover-only treatment hid the wishlist heart, which _was_ fixed,
because it was invisible and still tappable: a thumb brushing the top-right of
a photograph silently saved the piece, and there was no visible way to save
one on purpose. That is a defect with one answer. This is not: showing the bar
on touch means a permanent gold band across the bottom of every product image
on every phone, which is a decision about how the grid should look, not a bug
to clear. The shortcut is lost, not the route — tapping the card still opens
the piece, which has its own enquiry buttons.

### W4 · Heading hierarchy skips levels

- `/collections/bridal-sets`: `H1 Bridal Sets` → `H3 Refine`, `H3 Metal`,
  `H3 Purity`, `H3 Price`, `H3 Weight`, `H3 Stones`. No H2 anywhere.
- `/products/:slug`: `H1` → `H3 Description`, `H3 Care instructions`,
  `H3 Certification & hallmarking`, `H3 Delivery & buy-back` → _then_
  `H2 Customer reviews`. An H3 block precedes the page's first H2.
- Every page ends with four `H3`s that are footer column labels
  (COLLECTIONS / INFORMATION / VISIT US / CONNECT), so every document outline
  terminates in site furniture.

Costs: screen-reader navigation by heading, and the outline Google reads.

### W5 · The announcement bar costs 66px of a phone screen on every page

At 375px the left-hand message wraps to three lines ("FREE INSURED / DELIVERY
ON FULL / PAYMENT") beside the WhatsApp number, making the strip 66px tall —
8% of the viewport, above the header, before any content, on every route.

### W6 · Page lengths on a phone

| Route                                 | Height at 375px | Screens |
| ------------------------------------- | --------------- | ------- |
| `/`                                   | 9,494px         | ~12     |
| `/gold-rate-in-mandi-bahauddin-today` | 8,341px         | ~10     |
| `/products/:slug`                     | 5,786px         | ~7      |
| `/custom-order`                       | 4,918px         | ~6      |
| `/collections`                        | 4,238px         | ~5      |
| `/stores`                             | 3,579px         | ~4      |

The home page carries eleven sections. None of this is wrong by itself, but
it is the brief's "avoid overcrowding" and "weak visual hierarchy" made
countable, and it is where a thumb-length audit should start.

### W7 · Images without reserved space

Nine images on the home page have neither `width`/`height` attributes nor an
aspect-ratio container, so the layout moves as they arrive. On a jewellery
site the photographs are most of the page, which makes this the main source
of layout shift.

---

## Low

- **W8 · 33 of 55 `src/components/ui/*` primitives are unused**, carrying
  about thirty `@radix-ui/*` entries in `package.json` (alert-dialog, avatar,
  calendar, chart, command, menubar, pagination, resizable, sidebar, table,
  and more). Vite tree-shakes them, so **this is not bundle weight for
  customers** — it is install size, upgrade churn and supply-chain surface.
  Scaffolding left from the Lovable starter.
- **W9 · The `/custom-order` photo field** is a zero-height `<input
type="file">` with no label; the styled trigger beside it needs to carry the
  accessible name. The page's other five fields are 44–46px and properly
  labelled.
- **W10 · `/stores` embeds a Google Map iframe** — confirm it has a `title`.

---

## Measured and found clean

Worth recording, because a redesign brief assumes the opposite:

- **No horizontal overflow anywhere tested.** `scrollWidth === clientWidth`
  on all nine public routes at 375px and on `/` at 1280px. The carousels and
  the one `min-w-[420px]` table overflow their own scroll containers by
  design, not the page.
- **No colour-contrast failures against solid backgrounds** on any page
  measured. The only items the checker flagged were text over photographs,
  which it cannot evaluate; each of those sits on a
  `linear-gradient(to top, oklch(0.16 0.035 160) …)` scrim, which is the right
  way to do it.
- **Every image has `alt`**, and lazy loading is applied except above the fold.
- **Corner radii and button heights are already tokenised and consistent** —
  `--radius: 2px` throughout, and `ActionButton` is the single button shape.
- **Typography is already a system**: Cormorant Garamond for display, Inter
  for body, Montserrat for navigation, declared once as `--font-display` /
  `--font-sans` / `--font-nav`.

## Not audited

**The seven admin routes.** `/admin` is a staff sign-in ("Accounts are created
in the Supabase dashboard… there is no sign-up and no password reset by
design"). I have no credentials and did not attempt to obtain any, so
`/admin/products`, `/admin/orders`, `/admin/rates`, `/admin/categories`,
`/admin/custom-orders`, `/admin/reviews` and `/admin/calculator` were not seen
running. They can be audited from source, or with a throwaway staff account
the owner creates.

**Tablet and large-phone widths**, and **real devices**. Everything here is
375×812 and 1280×900 in a desktop WebView.

---

## Phase 2: the proposed palette against the existing one

The brief offers its tokens as "starting values". Set beside what is already
in `src/styles.css`, they are nearly the same palette:

| Brief                    | Nearest existing token      |                                             |
| ------------------------ | --------------------------- | ------------------------------------------- |
| Primary Gold `#C6A15B`   | `--gold` `#C9A24B`          | all but identical                           |
| Deep Gold `#A9823D`      | `--lux-gold-deep` `#A97820` | close; `--gold-deep` `#7C5E13` is darker    |
| Warm Ivory `#FAF8F3`     | `--ivory` `#FAF7F2`         | all but identical                           |
| Soft Cream `#F3EFE6`     | `--lux-cream` `#F8F4EC`     | close                                       |
| Charcoal `#242321`       | `--ink` `#1E1C18`           | close                                       |
| Secondary Text `#77736B` | `--warmgrey` `#67635A`      | close, existing is darker (better contrast) |
| Border `#E9E3D8`         | `--lux-border` `#E8DCC7`    | close                                       |
| Error `#B74747`          | `--rose` `#9B2C3F`          | existing is deeper                          |
| Success `#39845A`        | **nothing**                 | genuine gap                                 |

Two conclusions:

1. **Adopting the brief's hex values wholesale would be a lateral move** that
   touches every component and invalidates every screenshot the shop has
   shared, for differences mostly invisible side by side. It would also lose
   the OKLCH authoring, which is what makes the existing ramps perceptually
   even.
2. **The real gaps are structural, not chromatic**: there is no `success`
   token and no semantic layer at all (`--success`, `--warning`, `--info`
   separate from the brand green and the bridal rose), and there are three
   forks of the brand palette (W2). A design-system sprint should fix those
   two things and leave the hues alone.

The brief's one unambiguous colour instruction — "use gold as an accent rather
than making every component gold" — is already how the site is built: gold is
borders, rules and one button variant, on ivory, with deep green for weight.

---

## Suggested order of work

1. ~~**W1** — the FAB over the arrival view.~~ Done: one component, every route.
2. ~~**W3** — tap targets in the shared chrome.~~ Done: 49 under-sized
   controls on the product page alone, now none on any route bar the inline
   exceptions. Left behind it: **W11**, below.
3. **W2 + the semantic-token gap** — fold `lux-*` into the site palette, add
   `success`/`warning`. This is the "design system" sprint, and it is smaller
   than it sounds because two thirds of the system already exists.
4. **W4, W7** — heading order and reserved image space. Quiet, mechanical,
   good for SEO and for CLS.
5. **W5, W6** — the announcement bar and the length of the home page. These
   are editorial decisions about what the shop wants said first, not CSS, and
   they need the owner.
6. **W8–W10** — housekeeping.

Everything above Sprint 5 of the brief is covered by that list. Sprints
touching accounts, orders and profiles are blocked on a product decision, not
on design: see [`app-ui-audit.md` §1](./app-ui-audit.md) for what does and
does not exist.
