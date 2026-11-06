# Paying through Easypaisa

A customer pays for an order the shop has already priced. There is no checkout
from the bag, and that is deliberate: a piece is quoted from the day's gold
rate against a catalogue weight, and the figure that matters is the one agreed
after it has been weighed. So the shop agrees the amount, issues a link, and
the customer pays that exact figure.

```
customer places an order         →  orders row, status "new"
shop weighs and agrees on WhatsApp
shop types the amount in /admin/orders, "Create a pay link"
                                 →  amount_due_pkr set, pay_token minted,
                                    status "awaiting_payment"
customer opens /pay/<token>      →  sees the agreed figure
      taps pay                   →  Edge Function signs the request
                                 →  Easypaisa's own hosted page
Easypaisa tells our server       →  payments row "paid", order "paid"
```

## What never happens

- **No amount comes from the browser.** The pay page displays a figure, but the
  one that is charged is read from `orders.amount_due_pkr` inside the Edge
  Function, and checked against that column again when the payment is reported.
- **No order is marked paid by a redirect.** The customer's browser comes back
  from Easypaisa with a result; the page says "confirming" and nothing else. The
  status changes only when Easypaisa's server tells ours, with a matching
  amount. A redirect can be edited and replayed; that notification cannot.
- **No card or account details touch this site.** Payment happens on
  Easypaisa's page. The site's existing claim about that stays true.

## Setting it up

The hash key is a secret. It belongs in Supabase, never in the repo, never in
a message, never in a screenshot of a terminal.

```bash
supabase secrets set EASYPAISA_STORE_ID=...
supabase secrets set EASYPAISA_HASH_KEY=...
supabase secrets set EASYPAISA_ENV=staging          # "live" when you are ready
supabase secrets set SITE_ORIGIN=https://www.almadinajeweller.com
supabase secrets set EASYPAISA_IPN_SECRET=...       # optional, see below
```

Then deploy the function so that Easypaisa can reach it without a Supabase key:

```bash
supabase functions deploy easypaisa --no-verify-jwt
```

In the Easypaisa merchant portal, under **Account Settings → IPN Attribute
Configurations**, set the notification URL to:

```
https://uldsqxymxjwhifrmonis.supabase.co/functions/v1/easypaisa/ipn
```

If the portal lets you add a header, add `x-easypaisa-secret` with the value of
`EASYPAISA_IPN_SECRET`. If it does not, leave that secret unset — the amount
check is the guard that does not depend on it, and a secret that is configured
but never sent would reject every real notification.

## Three things to check against your merchant PDF

Easypaisa publishes no public API documentation: the integration guide arrives
with the credentials. This was built from the documented shape of Easypay's
hosted checkout, and three details in `supabase/functions/easypaisa/index.ts`
are marked `SPEC` because they are the ones that vary between versions. Read
them off your own PDF before going live:

1. **The field list for `Index.jsf`** — currently `storeId`, `amount`,
   `postBackURL`, `orderRefNum`, `expiryDate`, `autoRedirect`,
   `merchantHashedReq`.
2. **The hash input** — currently every parameter above except the hash itself,
   sorted by name, joined as `key=value&key=value`, AES-ECB with your hash key,
   base64. Check the key length: 16 characters means AES-128, and a 24 or 32
   character key silently means something else.
3. **The IPN's field names** — the code accepts several spellings for the
   reference, the status and the amount, but not every spelling that exists.
   The log line `easypaisa: IPN with no reference` prints the field names that
   actually arrived, which is the fastest way to find the right ones.

## Testing it

`EASYPAISA_ENV=staging` points at `easypaystg.easypaisa.com.pk`. Use the test
credentials from your merchant pack — never a real account, and never a real
card. A full pass is: issue a link from the admin, open it, pay on the staging
page, and check that

- `payments` has one row for the attempt, moving from `pending` to `paid`,
- `orders.status` is `paid`,
- paying a second time on the same link is refused as already paid,
- an abandoned attempt leaves a `pending` row and the order untouched.

Worth testing once deliberately: change the amount in the form before it posts.
The hash should fail at Easypaisa's end. That is the check that matters most.

## When it goes live

Two pieces of site copy describe how payment works and will need a third
option adding — `/delivery-payment` and the FAQ both say payment is settled in
store or in full before the piece is posted. An Easypaisa link is a way of
paying in full before the piece is posted, so the statements stay true, but
they would be more helpful if they said so.

The privacy policy and the Play Store data-safety answers should also be
checked: no payment details reach this site, but an order's amount and status
now do get written against it.
