# A WhatsApp sender — what it would cost and what it needs

This answers question 5 of [phase-6-assistant-and-automation.md](./phase-6-assistant-and-automation.md):
the WhatsApp Business sender that workflows 1 and 4 both wait on. It is a
costing, not a plan to build one.

**The short answer: not worth buying yet.** The messages themselves are nearly
free at this shop's volume. Everything expensive about a sender is fixed cost —
a second phone number, business verification, a monthly platform fee — and the
shop already does this by hand, from a link that sits on every page of the site
and beside every row in the admin panel. The recorded half is shipped and costs
nothing to keep. Revisit the sending half when orders reach roughly fifteen or
twenty a month.

---

## 1. What the shop's volume actually is

Read from production on 3 November 2026, counts only:

| Table                    | rows ever | last 90 days | last 30 days |
| ------------------------ | --------- | ------------ | ------------ |
| `orders`                 | 1         | 1            | 0            |
| `custom_orders`          | 1         | 1            | 0            |
| `enquiries`              | 2         | 2            | 0            |
| `newsletter_subscribers` | 0         | 0            | 0            |
| `push_devices`           | 0         | 0            | 0            |

Four customer events in the whole life of the site, and none in the last thirty
days. Every figure below has to be read against that, because it is what turns a
per-message rate into a decision.

---

## 2. The per-message cost, and why it is not the number that matters

Meta prices per template message now rather than per conversation. Pakistan is
its own market on the rate card and an expensive one — the comparison that made
the local press is that Pakistan pays roughly eleven times India's utility rate.

| Category       | Pakistan, per message        | What it would be used for here                |
| -------------- | ---------------------------- | --------------------------------------------- |
| Marketing      | $0.0473                      | Nothing. The shop runs no campaign            |
| Utility        | $0.0150                      | Order status — the thing actually in question |
| Authentication | $0.0150                      | Nothing. There are no customer accounts       |
| Service        | $0.0150 beyond the free tier | A reply inside the 24-hour window             |

**How much to trust those figures.** Meta's own documentation confirms the
structure, that Pakistan's utility and authentication rates rose on 1 April 2026
and again on 1 October 2026, that each business number gets 1,000 free service
messages a month which do not roll over, and that service messages became
chargeable beyond that tier on 1 October 2026. It does not print the Pakistan
numbers — those live in a rate-card CSV this costing could not read. The figures
in the table come from third-party sources that agree with one another. Treat
them as right to the nearest half-cent, not as quoted from Meta.

Now the arithmetic, which is the point:

- **Today.** One order a quarter, two status messages each (confirmed, then
  completed): **about three cents a quarter.**
- **At twenty orders a month,** three messages each: 60 × $0.0150 = **90 cents a
  month.**
- It would take somewhere near **550 orders a month** before the messages cost as
  much as an $8-a-month platform fee.

The messaging is not the cost. Everything that follows is.

---

## 3. What it needs — and this is where the money goes

| Requirement                                           | What it means here                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Meta Business Manager and a WhatsApp Business Account | Free, a form                                                                                       |
| **A phone number not in use on the WhatsApp app**     | The catch. See below                                                                               |
| Business verification                                 | Documents, and days to weeks of waiting                                                            |
| An approved utility template                          | Every word fixed in advance; only the variables move. Re-approval to change the wording            |
| Opt-in, with proof                                    | The customer has to have agreed to be messaged, and the shop has to be able to show when and where |
| An n8n instance                                       | Hosted, or standing one up on a server the shop controls                                           |
| A service-role credential held in n8n                 | Never in this repository                                                                           |

**The phone number is the part that is easy to miss.** The Cloud API takes
exclusive ownership of whatever number it registers: that number stops working in
the WhatsApp app. The shop's number is `92546502244` — the `wa.me` number printed
on every page of the site, behind the floating button, and in the admin panel's
own reply links, in daily manual use. Registering _that_ number for the API would
end manual WhatsApp on it. So a sender almost certainly means **a second number**,
and then the shop is running two WhatsApp identities, with customers replying to
whichever one messaged them.

**Two routes, and a reseller is not technically required:**

- **Meta Cloud API direct.** No platform fee — Meta's per-message rates and
  nothing else. n8n can call the Cloud API itself, so no reseller is needed to
  make it work. The open question is whether Meta accepts a payment method a
  Pakistani business can actually present; this costing could not confirm that,
  and it is worth checking before anything else, because a no there decides the
  route.
- **A provider (BSP).** Roughly $10–50 a month in platform fees, local ones
  billing in PKR by bank transfer, international ones in USD by card. What the
  fee buys is onboarding, support and someone to call.

At this shop's volume the fee is the whole bill. Ten dollars a month is about
₨33,000 a year to deliver something like eight messages.

---

## 4. What this codebase would need first

Two things, and the second is a real finding rather than a formality.

**Every order carries a phone number and no order carries an email.** Confirmed
against the live schema: `orders.phone`, `custom_orders.phone` and
`enquiries.phone` are all `text NOT NULL`, and there is no email column on any of
them. This is why a status message has to go by WhatsApp rather than through the
mailer that already exists.

**The stored numbers are in three different shapes.** Read from production,
shapes only, never the numbers:

| Shape                       | Length        | Count |
| --------------------------- | ------------- | ----- |
| `+92` and ten digits        | 13 characters | 1     |
| Leading zero, eleven digits | 11 characters | 2     |
| With spaces                 | 15 characters | 1     |

`whatsappNumber()` in [src/lib/admin.ts](../src/lib/admin.ts) already normalises
all three correctly — run against each shape, every one comes out in
`923217759959` form. That is not a gap, and no existing `wa.me` link in the admin
panel is wrong.

**It had one hole, now closed.** The `PHONE` validator used by the order,
enquiry and custom-order forms is `/^(\+?92|0)?[\s-]?\d{2,4}[\s-]?\d{6,8}$/`, in
which the country code is **optional**. So a bare `3217759959` passed validation
and `whatsappNumber()` returned it unchanged, producing a link to a number in
some other country. `whatsappNumber()` had no tests.

That was harmless while a person in the admin panel reads the link before
pressing send. An automated sender removes the person, and one customer's order
details arriving at a stranger's phone is the single worst failure available to
this feature — much worse than not sending at all.

The first instinct was to tighten the validator and require a prefix. That would
have been the wrong trade. The looseness is deliberate and documented: somebody
typing their own number into a Pakistani shop's website leaves the zero off as
often as not, and the database's CHECK constraints say the same thing. Rejecting
those customers to make the normaliser's job easier helps nobody.

**So the normaliser learned the case instead.** No prefix means a national number
with the trunk zero left off, and Pakistan is the only country these forms claim
to serve. It also drops a trunk zero written _after_ the country code, which
produced a thirteen-digit number WhatsApp cannot deliver to.

The change that matters is that the two halves now live together, in
[src/lib/phone.ts](../src/lib/phone.ts). The pattern had been copied into three
form modules while the normaliser sat in `admin.ts`, which is how they came to
disagree in the first place. `phone.test.ts` pins the invariant that was
violated: **every number `PHONE` accepts, `whatsappNumber` places in Pakistan.**
Note the scope — `whatsappNumber` is not a validator and must not be used as one.
Handed `+1 555 0100` it would return nonsense; `PHONE` is what refuses that, and
the two only hold as a pair.

**The recorded half is already shipped.** `order_status_history` (migration
`20261102170000`) and the History panel on `/admin/orders` record every status
change with who made it and when — verified against production on 3 November 2026. Whatever eventually sends a message reads that table rather than racing the
`UPDATE` that caused the change.

---

## 5. Recommendation

**Do not buy a sender yet.**

- Zero orders in the last thirty days. A second phone number, business
  verification and a monthly fee, to send roughly eight messages a quarter.
- The shop already answers on WhatsApp by hand, from the button on every page and
  the reply link beside every order. At one order a quarter, by hand is faster
  than the setup would be, never mind the fee.
- Nothing is lost by waiting. The trail is being recorded from now on, so a
  sender bought in a year's time arrives to a table with a year of history in it.

**Revisit when** either orders reach roughly fifteen to twenty a month, or the
shop wants the morning rate board going to customers on WhatsApp rather than only
to the app (workflow 1). That second one is the higher-volume use and the one that
would actually justify the fixed cost — and it is worth knowing before paying for
it that `push_devices` is **0**, so the FCM arm that already exists currently
reaches nobody at all.

**Done already, because it cost nothing:** the phone-normalisation hole is
closed and tested (section 4). It was the one item here that needed no decision,
helps the manual links today, and is a prerequisite for anything automated later.

---

## Sources

Rates and requirements, consulted 3 November 2026:

- [Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing) — Meta's own documentation: structure, the April and October 2026 Pakistan increases, the 1,000 free service messages per number per month, and the 24-hour customer service window. No Pakistan figures in the page itself.
- [WhatsApp Business Platform pricing](https://whatsappbusiness.com/products/platform-pricing/) — Meta's pricing site; Pakistan is in the market selector but the figures are not in the page.
- [Meta charges Pakistan 11x more than India for WhatsApp business messages](https://propakistani.pk/2026/09/15/meta-charges-pakistan-11x-more-than-india-for-whatsapp-business-messages/) — ProPakistani, the fullest Pakistan table found: marketing $0.0473, utility, authentication and service $0.0150, effective 1 October 2026.
- [WhatsApp Business API Pricing (Oct 2026): Rates by Country](https://www.flowcall.co/blog/whatsapp-business-api-pricing) and [WhatsApp Business API Pricing in Pakistan (2026)](https://digiteazy.com/whatsapp-business-api-pricing-pakistan/) — third-party rate tables agreeing with the above, the second also on PKR billing by local providers.
- [Template Messages](https://docs.360dialog.com/docs/whatsapp-api/whatsapp-api/template-messaging) — template categories, the rule that mixed utility and marketing content is classified as marketing, and approval timing.
