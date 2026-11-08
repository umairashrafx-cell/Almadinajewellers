# Safepay — what it would cost and what it needs

A costing and design note for putting card payments on the site, written before
any of it is built. It replaces [easypaisa.md](./easypaisa.md): the decision was
to adopt one gateway, not run two.

**The short answer: the integration is small and well documented. The fee is the
problem.** Safepay charges **2.9% + Rs 30** per successful card charge. This
shop's average catalogue piece is **PKR 524,401**, which makes the fee **Rs
15,238 on one sale**. Seventeen of the thirty-six pieces on the site are above
PKR 500,000, where the fee runs **Rs 21,611 to Rs 39,189 each**. The shop
currently pays nothing, because the pay page shows a till number and the
customer transfers by hand.

So the recommendation is not "don't do it" and not "do it as asked". It is:
**take a deposit online, not the whole price.** The database already supports
this and needs no change. Section 6 has the arithmetic.

---

## 1. What a charge actually costs

From Safepay's published pricing, read 7 November 2026:

| Item                           | Price                         |
| ------------------------------ | ----------------------------- |
| Domestic cards                 | **2.9% + Rs 30** per charge   |
| International cards            | +0.3%                         |
| Wallets                        | 1.5%                          |
| Raast                          | up to 1.5%                    |
| Disputes (chargebacks)         | **Rs 3,000** each             |
| Setup fee, monthly fee         | **none**                      |
| Hosted Checkout, Payment Links | included, no fee of their own |
| SDKs, WooCommerce plugin       | included, no fee of their own |
| Sandbox account                | free                          |

There is a Rs 15,000/month "Routing" plan. It is for forwarding payments through
a gateway you already have. It is not what this shop wants and is listed only so
nobody buys it by mistake.

Safepay is regulated by the State Bank of Pakistan, which is the reassurance
worth having and also the reason onboarding asks for KYC (section 7).

## 2. What that fee does to this catalogue

Read from production on 7 November 2026 — 36 priced pieces, average PKR 524,401,
cheapest PKR 16,493, dearest PKR 1,742,187:

| Price band  | Pieces | Average price | Safepay fee on one sale |
| ----------- | ------ | ------------- | ----------------------- |
| under 50k   | 2      | 18,056        | **554**                 |
| 50k – 150k  | 6      | 117,529       | **3,438**               |
| 150k – 500k | 11     | 223,231       | **6,504**               |
| 500k – 1m   | 12     | 744,175       | **21,611**              |
| over 1m     | 5      | 1,350,304     | **39,189**              |

2.9% is an ordinary e-commerce rate. It is ordinary because ordinary
e-commerce sells things with a wide margin. Gold does not: the shop's margin is
in the making charges, not the metal, and the metal is nearly all of the price.
A percentage fee on the full price of a gold set is therefore charged largely
against gold the shop bought at rate and sold at rate.

This is not an argument against cards. It is an argument against putting the
**whole** price through a card.

## 3. How the integration works

Safepay's "Express Checkout" is a hosted page: the customer leaves the site,
pays on Safepay's page, and comes back. The shop never touches a card number, so
there is no PCI burden on us. (Safepay also documents a raw-card flow with a
seven-step 3-D Secure dance and a PCI certificate requirement. We are not doing
that.)

Three calls from our edge function, all authenticated with the header
`X-SFPY-MERCHANT-SECRET`:

1. **`POST /order/payments/v3/`** — body carries `merchant_api_key`, `intent`
   (`CYBERSOURCE` or `MPGS`), `mode: "payment"`, `currency: "PKR"`, `amount`,
   and `metadata`. Returns `data.tracker.token`, a `track_…` string.
2. **`POST /client/passport/v1/token`** — returns a short-lived token. **It
   lasts one hour**, and the checkout page dies with it.
3. **Build the checkout URL** from the tracker, that token, `source: "hosted"`,
   a `redirect_url` and a `cancel_url`, then redirect the customer to it.

The REST hosts are `https://sandbox.api.getsafepay.com` and, live,
`https://api.getsafepay.com`. **The hosted checkout page does not follow that
pattern:** sandbox is `sandbox.api.getsafepay.com/embedded/` but production is
`getsafepay.com/embedded/`, with no `api.` at all. Safepay's guide shows only
the sandbox URL and leaves the obvious inference, which is wrong — a mistake
that would work all through testing and only fail on live customers. The three
values are read from their own SDK and are now pinned by a test.

Two details worth writing down because they are easy to get wrong:

- **`amount` is in the lowest denomination.** PKR 6,000 is sent as `600000`.
  Our `amount_due_pkr` is whole rupees, so every amount is multiplied by 100 on
  the way out and divided by 100 on the way back. Getting this wrong by a factor
  of a hundred is the kind of mistake that only shows up on a real invoice.
- **`metadata` comes back on the webhook.** Putting our order reference in
  `metadata.order_id` is what ties Safepay's event to our row, and it is how the
  Shopify and WooCommerce plugins do it too.

## 4. How we learn the payment succeeded

This is the part Easypaisa left us guessing at, and the reason the switch is
worth making even setting the fee aside. Safepay documents it fully.

- The outcome arrives as a **`payment.succeeded`** webhook (also
  `payment.failed`, `payment.refunded`, `authorization.succeeded`,
  `authorization.reversed`, `void.succeeded`; all at version `2.0.0`).
- Every event carries a signature in the **`X-SFPY-SIGNATURE`** header. It is
  **HMAC-SHA512 over the raw JSON body, hex-encoded**, keyed with the endpoint's
  shared secret from Dashboard → Developers → Endpoints → View shared secret.
  **Sandbox and live have different keys.**
- Verify the signature _before_ doing anything, acknowledge with a 200 _before_
  applying any business logic, and do both **within 10 seconds** or the event
  goes to a retry queue.
- The payload gives `data.tracker`, `data.amount`, `data.currency`,
  `data.net` and `data.fee` — so we can record what Safepay actually kept — plus
  `data.metadata.order_id`, our own reference, back again.

One trap to design for: **the customer can retry on the hosted page, and each
attempt sends its own webhook with the same tracker.** The handler has to be
idempotent. Our `payments.attempt_ref` is `UNIQUE`, which helps, but the
"already settled" case has to be a quiet success rather than an error, or a
retried payment will look like a failure.

Belt and braces, as Safepay's own guide recommends: on return the customer lands
on `redirect_url?tracker=track_…`, and we confirm with
**`GET /reporter/api/v1/payments/{tracker}`**, looking for
`tracker.state === "TRACKER_ENDED"`. The webhook is the source of truth; this is
what the thank-you page reads so it does not have to wait.

## 5. What changes in this repository

Small, and mostly deletion. The plumbing below is **built**; the pay page is
deliberately not switched over yet, so Easypaisa keeps taking payments until a
test card has gone through Safepay end to end.

- **`supabase/functions/safepay/`** — `protocol.ts` holds the pure parts (host
  table, URL assembly, rupees-to-paisa, signature verification, reading an
  event) and `index.ts` the two actions, `start` and `webhook`. Roughly the size
  of the easypaisa function, minus all the hashing.
- **`src/lib/payments.ts`** — `PaymentHandoff` was `{ action, fields }`, which
  assumes a form POST, because that is what Easypay wanted. It is now a union
  with `{ url }`, and `handOffToProvider` either submits the form or navigates.
  `startPayment` takes a provider and still defaults to Easypaisa, so nothing
  the page does today has changed.
- **`payments.provider`** already distinguishes gateways, so no migration: the
  function passes `'safepay'` explicitly and the `'easypaisa'` default is left
  alone for the old rows.
- **No schema change for amounts.** `orders.total_pkr` and
  `orders.amount_due_pkr` are already separate columns, and `amount_due_pkr` is
  already nullable. The deposit model in section 6 is a matter of what the shop
  types into one field, not a migration.
- **Deleted, once Safepay is proven:** `supabase/functions/easypaisa/`,
  `docs/easypaisa.md`, and the four `EASYPAISA_*` secrets.

Secrets the owner sets (four, and none of them ever in this repository — it is
public):

`SAFEPAY_SECRET_KEY`, `SAFEPAY_MERCHANT_API_KEY`, `SAFEPAY_WEBHOOK_SECRET`,
`SAFEPAY_ENV`.

### Two things this retires

The Easypaisa hash key we were handed is 64 characters, which makes the current
code ask Node for `aes-512-ecb` — a cipher that does not exist. We never have to
solve that now. **It also means open PR #157, which adds a guard refusing a hash
key AES cannot take, is about to become dead code.** Worth closing rather than
merging.

## 6. The recommendation: charge a deposit, not the price

Nobody buys a PKR 1.3 million gold set on a website without speaking to the
shop. What the site is actually for is **securing the piece** — the customer
commits, the shop sets it aside, and the balance is settled in person at the
counter where it always was.

So let the pay page collect a deposit, and leave `amount_due_pkr` to the shop:

| Deposit collected | Safepay fee | Fee as % of a 744,175 sale |
| ----------------- | ----------- | -------------------------- |
| 5,000             | **175**     | 0.02%                      |
| 10,000            | **320**     | 0.04%                      |
| 25,000            | **755**     | 0.10%                      |
| 50,000            | **1,480**   | 0.20%                      |

Rs 755 to hold a three-quarter-million-rupee sale is a cost the shop will not
notice. Rs 21,611 is a cost it will argue about. Same gateway, same code, same
customer experience — the only difference is the number in one field.

There is also an API flag, **`include_fees: true`**, which adds the fee to the
customer's total instead. On a Rs 25,000 deposit that is Rs 755 and nobody
blinks. On a full-price sale it is Rs 21,611 shown to the customer, which is
worse than absorbing it. Use it on deposits or not at all.

And the cheapest option of all, which deserves saying plainly: **Payment Links
need no code.** The owner generates a link in the Safepay dashboard and sends it
over WhatsApp — same 2.9%, nothing to build, nothing to maintain. Given that
`orders` is empty in production today, that is an honest place to start, and it
would tell us whether customers will pay by card at all before we spend anything
proving it in software.

## 7. What the owner has to do, and what blocks what

Nothing here can be done from this session — it is an account and a bank
relationship, not code.

1. **Create the free sandbox account** at getsafepay.com. Nothing can be built
   or tested before this. _(Blocking.)_
2. Copy the sandbox secret key, merchant API key and webhook shared secret into
   Supabase secrets. **Not into the repo, and not into this chat** — the
   repository is public and I never need to see them.
3. Add the webhook endpoint in the sandbox dashboard and subscribe to the
   `2.0.0` payment events.
4. For live: a production account, the **KYC onboarding form**, and Safepay's
   approval. This is the slow step and it is out of our hands.

The sensible order of work: build against sandbox, prove a test card end to end,
then switch hosts and remove Easypaisa. **Easypaisa stays in place until then,
so the shop is never left with no way to pay.**

## 8. How much to trust the figures above

The integration details — endpoints, headers, the HMAC-SHA512 signature, the
event payloads, the one-hour token, minor-unit amounts — are quoted from
Safepay's own API reference and developer documentation, read 7 November 2026.
The prices are from Safepay's public pricing page the same day. The catalogue
figures are counted from this project's production database, not estimated.

**The one thing that was not pinned down now is.** Safepay's guide says you may
build the checkout URL manually and then only shows its Node SDK doing it. That
question is settled: the URL format and the three host values were read from
`@sfpy/node-core` 0.3.5 (`cjs/Checkout.js`) and are reproduced exactly in
`supabase/functions/safepay/protocol.ts`, down to the parameter ordering. Doing
so turned up the production-host trap in section 3, which is the one thing here
the documentation would have led us into.

Two smaller caveats, both harmless: the guide mentions a `success: true` field on
`payment.succeeded` that the published example payload does not contain, so the
handler should key off `type` and `state` rather than that field; and the fee the
shop ultimately pays may differ from the published rate if Safepay negotiates
custom pricing during onboarding, which their pricing page invites for volume.
