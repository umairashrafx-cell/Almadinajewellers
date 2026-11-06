# Getting found: the off-site work

The site itself is not the problem. It renders for crawlers, its structured data
is in place, it carries a `JewelryStore` node with real coordinates, and the
September audit found nothing left to fix. What it does not have is anybody
pointing at it. Zero inbound links, and a Business Profile that exists but is
mostly empty.

That is a better position than it sounds. **No other jeweller in Mandi Bahauddin
has a website at all.** The usual local-SEO fight — a dozen competitors with
tidy listings and years of reviews — is not happening here. The work below is
not about overtaking anyone. It is about being the only shop in the bazaar that
a phone can find, which is a thing that can be finished rather than contested.

Everything here is the owner's to do. None of it is code, and none of it should
be done on the shop's behalf by an agent: a Business Profile is an identity, and
it is claimed and written by the person who owns it.

## The one rule: every listing says exactly the same thing

Google decides that a website, a Business Profile and a Facebook page are one
business by comparing the name, address and phone across them. A mismatch does
not merely fail to help — it splits the shop into two half-businesses, each with
half the evidence.

The site is the source of truth, and it is all in
[`src/lib/site.ts`](../src/lib/site.ts). Copy these strings, do not retype them:

| Field           | The exact value                                    |
| --------------- | -------------------------------------------------- |
| Name            | `Al-Madina Jewellers`                              |
| Address         | `Sarafa Market, Mandi Bahauddin, Punjab, Pakistan` |
| Phone (primary) | `+92 321 7759959`                                  |
| Phone (second)  | `+92 321 7744282`                                  |
| WhatsApp        | `+92 54 6502244`                                   |
| Website         | `https://www.almadinajeweller.com`                 |
| Hours           | Saturday to Thursday, 11:00am – 8:00pm             |
| Closed          | Friday                                             |
| Founded         | 1980                                               |
| Proprietor      | `Haji Ashraf Siddiqui & Sons`                      |

Three traps in that table, all of them already paid for once:

- **`Al-Madina`, with the hyphen.** Not "Al Madina", not "AlMadina". The site,
  the Play Store listing and the bills all use the hyphen.
- **`Sarafa Market`, not "Sarafa Bazar".** The same street under two names. The
  repo had this inconsistency and it was deliberately aligned on _Market_ —
  there is a comment in `site.ts` about it. Picking the other one now
  reintroduces the split.
- **`www.` in the website.** `almadinajeweller.com` and
  `www.almadinajeweller.com` are different strings to a directory form, and the
  canonical origin has the `www`.

## 1. The Business Profile, properly filled in

This is not one task among several. In Pakistan, local discovery happens in
Google Maps, and for a shop with no competing websites, a complete profile is
most of the available win. Everything else on this page is worth a fraction of
it.

The profile is already claimed: its place ID is `ChIJxX07bsF9HzkR428mpQWvxm8`,
and the coordinates in `site.ts` were read off it. Manage it at
[business.google.com](https://business.google.com/), or from the Google Maps app
while signed in as the owner.

**Categories.** The primary category decides which searches the shop can appear
in at all, so it is "Jewelry store" and nothing else. Then add secondary
categories for what the shop actually does — search the picker for _jewelry
buyer_, _goldsmith_, _jewelry repair_ and _jewelry designer_, and add the ones
that match. The buy-back one matters: "gold buyer near me" is a search with
intent behind it and almost no local supply.

**Description** (Google allows 750 characters; this is about 690):

> Al-Madina Jewellers has been in Sarafa Market, Mandi Bahauddin since 1980,
> run by Haji Ashraf Siddiqui & Sons. We make and sell 22k and 21k gold
> jewellery — bridal sets, necklaces, bangles, rings, earrings and chains — and
> we buy gold back, including pieces bought elsewhere.
>
> Every piece is weighed in front of you on a counter scale, and the price is
> worked out from that day's rate with the making charges shown separately, so
> you can see how the figure was reached before you agree to it. Today's rate is
> published on our website.
>
> We deliver across Pakistan, insured and free on full payment. Custom and
> bridal work is made to order. Closed Fridays.

**Hours.** Saturday to Thursday, 11:00am to 8:00pm, and set Friday to _Closed_
rather than leaving it blank — a blank day shows as "Hours might differ", which
sends somebody on a wasted Friday trip. Use the _Special hours_ section for Eid
and for Ramadan timings; those are the two stretches each year when the posted
hours are wrong and somebody drives to a shut shop.

**Attributes.** Set the ones that are true: _identifies as family-owned_,
_in-store shopping_, _delivery_, and the payment attributes once Easypaisa is
live. Accessibility attributes only if they are honestly true.

**Photos.** This is where the profile is thinnest and where the effort pays.
Google shows photos in the local pack, and a listing with ten real photographs
beats a listing with a logo in the eye of a customer well before it does in any
algorithm. In rough order of value:

1. **The shop front**, in daylight, with the name board readable. This is the
   photo that tells someone standing in the bazaar they have found the right
   door.
2. **A piece on the counter scale, with the reading visible.** Nobody else in the
   market has this photograph, and it is the entire proposition of the business
   in one image.
3. The interior, looking in from the door, so it is clear what kind of shop it
   is before anyone walks in.
4. Six to ten pieces — bridal sets first, then bangles, then rings and chains.
   Daylight, plain background, no filter. These double as catalogue photography:
   the site still shows placeholder images for much of the catalogue.
5. The team at the counter. A shop that looks open and staffed gets walked into.

Avoid the two things that make a profile look abandoned: a logo as the cover
photo, and screenshots of other people's jewellery.

**Products.** The profile has a Products section; put six to ten pieces in it
with real prices or ranges. It costs an afternoon, and it is the only place in
Google where the shop's own prices appear.

**The website link** is `https://www.almadinajeweller.com`. There is also a slot
for the Android app — the Play Store listing for `com.almadinajeweller.app` is
already a real, indexed page that links back to the site, which makes it the
shop's first genuine inbound link.

## 2. Reviews, which are the part that compounds

A profile with four reviews and a profile with forty behave differently in
search, and reviews are the only thing here that a competitor cannot copy in an
afternoon.

The site already builds the direct review link. For this branch it is:

```
https://search.google.com/local/writereview?placeid=ChIJxX07bsF9HzkR428mpQWvxm8
```

That URL opens the review box already addressed to the shop — no searching, no
scrolling, no finding the right listing among the neighbours. Send it on
WhatsApp after a sale, the same day, while the customer still has the box in
their hand. A fortnight later is too late.

Something like this, in whichever language the conversation was already in:

> Shukriya for shopping with us today. If you were happy with the piece, a short
> Google review helps people in Mandi Bahauddin find us:
> https://search.google.com/local/writereview?placeid=ChIJxX07bsF9HzkR428mpQWvxm8

Two things not to do, and the reason is not only ethical. **Do not buy reviews,
and do not have staff write them.** Google removes them in batches and
penalises the profile they were aimed at, so the downside is losing the real
ones too. And for this shop in particular, what is being sold is that the scale
is honest — a profile caught carrying invented reviews undermines the one claim
the whole business rests on.

Reply to every review, including the bad ones, in a sentence. The replies are
public, and they are read by the next customer rather than by the reviewer.

## 3. Seed the Q&A with the questions you answer daily anyway

The Business Profile has a public questions section that anybody can post to,
and anybody can answer. An empty one is a liability: the first question asked
gets answered by a stranger if it is not already answered by the shop. The owner
may post questions and answer them, which is both allowed and the intended use.

The site's FAQ in [`src/lib/faq.ts`](../src/lib/faq.ts) is already a list of what
customers ask. The eight worth putting on the profile:

- Where is the shop and when is it open?
- What karat is your jewellery?
- Is my piece weighed in front of me?
- How is the price of a piece calculated?
- Do you buy back what you sell?
- Can I sell jewellery bought from another shop?
- Can you make a piece to my design?
- Do you deliver outside Mandi Bahauddin?

Answer each in two or three sentences, in the same words the site uses, and put
the relevant page link at the end of the ones that have one.

## 4. Posts, and the one post worth making weekly

Google Posts drop off the profile after a week, which makes most of them a waste
of an afternoon. There is one exception here, and it is unusually strong: the
shop publishes today's gold rate on its own site, and "gold rate today" is among
the highest-volume searches in Pakistan.

A weekly post with the current 22k rate per tola, linking to the rate page, is
the rare case where the content is genuinely wanted, genuinely fresh and
genuinely the shop's own. Not daily — that reads as a bot, and the rate page is
where a customer should land for the live figure anyway. Weekly, plus one
whenever the rate moves sharply.

Beyond that: bridal season, Eid timings, and a new-piece post when there is a
photograph worth showing. If there is nothing to say, say nothing.

## 5. The other platforms, honestly ranked

Most of the "free Pakistani business directory" sites that come up in a search
are directories promoting themselves. They are cheap to submit to and worth
close to nothing — nobody reads them, and Google has discounted that whole class
of link for years. Submitting to thirty of them is a wasted week. A paid link
package is worse than wasted.

These are worth the time, in order:

1. **Facebook page** — already live at
   [facebook.com/madinajewellerz](https://www.facebook.com/madinajewellerz).
   A lot of Pakistani local discovery actually happens on Facebook. Make the
   About section carry the address, hours, phone and website exactly as in the
   table above. Highest-value item after the Business Profile, and mostly
   already done.
2. **WhatsApp Business profile** — the shop's real front door. Its profile
   fields (address, hours, website, catalogue) are seen by every customer who
   opens the chat, and most of them never visit the website at all. Put the same
   six to ten catalogue pieces in the WhatsApp catalogue.
3. **Instagram and TikTok** — both live
   ([@almadina.jewellers](https://www.instagram.com/almadina.jewellers),
   [@almadinaj](https://www.tiktok.com/@almadinaj)). The only job here is that
   the bio link points at `https://www.almadinajeweller.com` and the name field
   reads `Al-Madina Jewellers`. Both are declared in the site's structured data
   as `sameAs`, which is how Google confirms they are the same business — so the
   names have to match for that to do its job.
4. **Bing Places** — [bingplaces.com](https://www.bingplaces.com/). Free, half
   an hour. Little direct traffic, but Bing's index feeds several AI assistants,
   which is increasingly where "jeweller in Mandi Bahauddin" gets asked.
5. **OpenStreetMap** — [openstreetmap.org](https://www.openstreetmap.org/).
   Free, no account politics, and it feeds a long tail of apps that do not use
   Google's data. The shop is a `shop=jewelry` node; add `name`, `phone`,
   `website` and `opening_hours` along with the address tags. This one is also
   just a true improvement to a public map.
6. **Apple Maps**, via Apple Business Connect at
   [business.apple.com](https://business.apple.com/). I could not confirm that
   Pakistan is among the supported countries — Apple does not publish a list,
   and what is written about it is mostly about the European rollout. Worth ten
   minutes to try the sign-up and abandon it if the country picker refuses.

A few Pakistani directories do get indexed and cost nothing, so if there is an
idle evening, pick two or three rather than thirty and fill them in with the
exact strings from the table. The value is in the consistency of the data, not
in the link.

## 6. Real links, which are the hard part

Zero inbound links is the actual gap, and no directory closes it. Links that
would count, in descending order of plausibility:

- **The Play Store listing**, which already exists and already points at the
  site. Check that the app listing's website field is filled in.
- **The local jewellers' association or market committee**, if Sarafa Market has
  one with any web presence at all. A link from the market's own page is exactly
  the kind that is hard to fake and easy to earn by asking.
- **Wedding vendors** — photographers, halls and salons in Mandi Bahauddin and
  Gujrat who publish vendor lists. Bridal sets are the shop's highest-value line,
  and these are the people whose customers are buying them.
- **Suppliers**, if any of them publish a stockist list.
- **The gold rate**, again. A shop publishing a daily local rate is useful to
  local news pages and Facebook groups, and that usefulness is linkable in a way
  that a shop page is not.

One honest caveat: for a town this size the realistic ceiling is a handful of
links, and that is fine. Five real local links and sixty reviews will beat
anything a competitor in Mandi Bahauddin can assemble, because none of them has
started.

## The checklist

- [ ] Primary category set to Jewelry store
- [ ] Secondary categories added (buyer, goldsmith, repair, designer)
- [ ] Description pasted
- [ ] Hours set, Friday explicitly Closed
- [ ] Special hours set for the next Eid and for Ramadan
- [ ] Ten photographs uploaded, shop front and counter scale first
- [ ] Six to ten products added with prices
- [ ] Website and app links set
- [ ] Eight Q&A pairs posted
- [ ] First weekly rate post
- [ ] Review link saved as a WhatsApp quick reply
- [ ] Facebook About section matched to the table
- [ ] WhatsApp Business profile and catalogue filled in
- [ ] Instagram and TikTok bio links pointing at the site
- [ ] Bing Places submitted
- [ ] OpenStreetMap node added
- [ ] Apple Business Connect attempted

The first five lines are most of the value. If only one evening is ever spent on
this, spend it on the photographs and the hours.
