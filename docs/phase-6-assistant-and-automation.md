# Phase 6 — an assistant, and the automations around it

A plan, not a build. The roadmap says to _plan_ the assistant and _propose_ the
n8n workflows, and it puts both behind a condition: "Only after data/security
foundations are verified." Those are verified — phases 1 to 5 are merged, the
throttle was checked against the live database with a real submission, and the
policies below were read out of production on 2 November 2026 rather than
assumed.

This document is what the shop would be agreeing to before a line of it is
written. It ends with the decisions that are the owner's, not mine.

---

## 1. What the assistant would stand on

The shop has more approved material than a project at this stage usually does.
None of it has to be written for the assistant; it already answers customers
on the site today.

**Curated prose, already written and already shown to customers**

| Source                  | What it holds                                                             |
| ----------------------- | ------------------------------------------------------------------------- |
| `src/lib/faq.ts`        | 173 lines of answers by topic — ordering, hallmarking, buy-back, delivery |
| `src/lib/roman-urdu.ts` | The same answers in Roman Urdu, under the rate board and the selling page |
| `src/lib/site.ts`       | `SITE` and `STORES`: address, hours, phones, the WhatsApp link            |

Both files carry the same rule in their own doc comments: nothing in them is
invented, every answer restates something the site says elsewhere, and a
question the shop has no answer to is left out rather than guessed at. That
rule is the assistant's rule too, and it is the reason this corpus is usable
as-is.

**Live data, publicly readable, confirmed in production**

`products`, `categories`, `gold_rates` and approved `reviews` each carry a
public read policy. The assistant can quote a piece's karat, weight and price,
today's board, and what a customer wrote about a piece — because the website
shows a stranger exactly the same things.

**The arithmetic already exists and is under test**

`sellingRateFor`, `buyingRateFor`, `livePriceFor` and `pricedWeightFor` are
covered by 46 tests as of phase 3. The assistant must call them rather than
work a price out in prose. A model doing arithmetic on a gold price is the
single worst thing this feature could do, and the way to prevent it is to
never ask it to.

---

## 2. The finding that shapes everything: order status cannot be a chat answer

The roadmap lists "order status updates" under automation, and it also says
"never invent ... order status". Reading the database settles how those two fit
together.

Every RPC an anonymous caller may execute is **write-only**:

```
place_order          submit_custom_order   submit_review
subscribe_newsletter register_push_device  forget_push_device
```

And every table that holds a customer's business is admin-read-only:
`orders`, `custom_orders`, `enquiries`, `newsletter_subscribers`,
`gold_rate_history`, `counter_calculations`. Four more — `app_config`,
`market_snapshot`, `push_devices`, `rate_alerts_sent` — carry no policies at
all and are sealed from anyone but the service role.

There are no customer accounts. The only thing a customer knows that identifies
their order is their phone number. So "where is my order?" answered over a
public endpoint means a lookup by phone number — and a lookup by phone number
is enumerable. Somebody could walk through numbers and read names, cities, item
lists and order totals belonging to strangers. That is a data breach with a
chat window in front of it.

**So the assistant never reads an order.** It says it cannot see orders, and
hands the customer to WhatsApp with their order reference already in the
message. That is not a limitation worked around later; it is the correct
answer, and it is what "use human handoff for uncertain or high-value
requests" means in this shop.

Status updates still reach the customer — but **outbound**, pushed by the shop
when it changes a status, to the phone number on that row. The shop initiates,
the recipient is the row's own contact, and nothing is exposed to a stranger.
That is workflow 4 below, and it needs no assistant at all.

---

## 3. What the assistant may say

Three tiers, and nothing outside them.

**Tier 1 — verbatim.** FAQ and Roman Urdu answers, returned as written. A
policy is never paraphrased. If the shop's answer about CNIC or buy-back
changes, it changes in one file and the assistant changes with it.

**Tier 2 — quoted from live data.** Today's board with its stamp; a piece's
karat, weight and price through the site's own pricing functions; which
categories exist; what approved reviews say. Every figure carries where it came
from and when, exactly as the board does.

**Tier 3 — refuse and hand off.** Anything about an order, an enquiry or a
custom order. Any valuation of gold the shop has not weighed. Availability it
cannot see. A discount not on the row. Anything it cannot answer from tiers 1
and 2. The refusal is a sentence and a WhatsApp link, in the customer's own
language — the pattern every form on the site already uses when it fails.

It never invents a price, a purity, availability, an order status, a delivery
date, a discount or a policy. Where it is unsure which tier applies, it is
tier 3.

**Language.** Answer in the language asked in: English, Roman Urdu, or Urdu
script. Roman Urdu is the one that matters most and `roman-urdu.ts` explains
why — the customer typing "mandi bahauddin sona rate" into a phone is typing
Latin letters. Urdu script is a separate job with its own `lang`, right-to-left
layout and a font that carries nastaliq properly; that file chose not to do it
badly, and neither should this.

---

## 4. Shape

An Edge Function, `supabase/functions/assistant`, following the two that exist:
Deno, secrets through `Deno.env.get`, `verify_jwt = false` with the reason
written into `supabase/config.toml`. The model's key lives there and never
reaches a browser or an APK.

Throttled by `public.check_request()`, which already guards every anonymous
write through the `pgrst.db_pre_request` hook. A question costs money to
answer, so the ceiling matters more here than on a form.

**No tools, first.** The function retrieves from the corpus itself — the
shop's own code, deterministic — and hands the model a question plus the
passages it is allowed to use. The model writes a sentence; it does not choose
what to read, and it cannot reach the database. Giving a model a query tool
against a jeweller's catalogue is a later decision that needs its own
argument, not a starting point.

### The smallest safe first change

Not the model. The corpus and the refusal rules, as ordinary code with tests,
plus a harness that answers from the corpus alone with no model involved.

That makes the dangerous properties provable before a model is anywhere near
the thing: that a question about an order always lands in tier 3, that no reply
contains a figure that did not come from `gold_rates` or a product row, that a
purity nobody published is never quoted. Those are the tests phase 3 wrote for
the rate maths, pointed at the assistant.

The model goes in last, behind a flag, when the shop has decided it wants one.

---

## 5. The n8n workflows

Each is a proposal; none is built. All four need an n8n instance and a
service-role credential held **in n8n**, never in this repository.

**1. Verified rate notification.** Worth saying plainly: this already ships
without n8n. `notify_rates_published` fires on publish, `notify-enquiry` sends
through FCM on the `rates` channel, and `rate_alerts_sent` stops a second send
the same day. n8n should not become a second sender racing the first. What it
could add is the **WhatsApp arm** — the same verified event, to customers who
gave a number rather than installed the app, with the same once-a-day guard
read from the same table.

**2. New enquiry to the shop.** Also already ships, which this document first
got wrong: `notify-enquiry` handles four sources, not one, and an enquiry
reaches the shop by email the moment it arrives. n8n would change the channel,
not add the notification — a WhatsApp message instead of an inbox to watch.

**3. Custom order to the shop.** The same correction: the trigger and the email
exist today. What n8n would add is WhatsApp delivery, plus the photograph and
the voice note as **signed URLs with a short expiry** — the bucket is private and must
stay private, and the migration that set its limits chose its allowed types one
by one for exactly that reason.

**4. Order status change to the customer.** The only one of the four that does
not exist in any form. The shop moves an order to confirmed, completed or
cancelled; the customer gets a message on the number on that row. This is
section 2's answer to order status, and the only safe one.

It splits in two, and the half that needs no infrastructure is built:
`order_status_history` (migration `20261102170000`) records every status change
with who made it and when, and `/admin/orders` shows the trail. Sending the
message is what still waits on a WhatsApp sender. Whatever eventually sends it
should read that table rather than race the UPDATE that caused the change.

The sender itself is costed in [whatsapp-sender.md](./whatsapp-sender.md).

---

## 6. Risks, and how each is held down

| Risk                         | Why it matters here                                                                       | Held down by                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A wrong price from a machine | A quote is an argument at the counter and a lost customer                                 | Tier 2 only, through the site's tested pricing functions; the model does no arithmetic |
| Prompt injection             | Reviews are customer-written and product names are editable; both would sit in the corpus | Corpus is delimited data, never instructions; no tools, so there is nothing to hijack  |
| A policy drifting            | Two copies of the buy-back rule is how they disagree                                      | Tier 1 is verbatim from `faq.ts`; no second copy is written                            |
| Cost                         | A chat box is a bill that scales with strangers                                           | `check_request` throttle, plus a per-day ceiling in the function                       |
| Exposure of customer data    | The worst outcome available                                                               | The assistant reads nothing admin-only; section 2                                      |

**Rollback.** The assistant is one Edge Function and one flag. Turning the flag
off removes the entry point; deleting the function removes it entirely. No
schema change is needed for the assistant itself, so there is nothing to
migrate back. The n8n workflows are rolled back by switching each off in n8n.

---

## 7. What is the owner's decision, not mine

1. **Is an assistant wanted before the automations?** Workflows 2, 3 and 4 are
   cheaper, lower risk, and arguably help the shop more per rupee than a chat
   box. My recommendation is to do those first.
2. **Which model, and who pays.** Every answered question costs money, and the
   ceiling has to be a number the shop chooses.
3. **Is there an n8n instance,** or does one need standing up — hosted or on a
   server the shop controls?
4. **Where does the assistant appear** — the website, the app's own screens, or
   both? The app's screens work offline today; an assistant does not, so it
   would need to say so.
5. **A WhatsApp sender.** Workflows 1 and 4 message customers. That needs a
   WhatsApp Business sender and the shop's agreement about what customers are
   told and how they stop it. Now costed, in
   [whatsapp-sender.md](./whatsapp-sender.md): the messages are pennies at this
   shop's volume and the fixed cost is the whole bill, so the recommendation
   there is to wait — and to close one phone-normalisation hole either way.

Nothing in this document has been implemented, and nothing should be until
those five are answered.
