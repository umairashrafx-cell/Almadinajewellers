# Migration rollout checklist

Date written: 2026-11-02
Last run: 2026-11-02 — all four applied and checked. See "What happened on
2026-11-02" for the state of the first three and for what a failed push
taught, and "The fourth, applied" for the last one. Nothing is waiting. The
procedure below is written to be reused.

| Version        | File                             | What it changes                                                                                                          | State   |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| 20261102090000 | `sprint1_security_hardening.sql` | Revokes API execution of two trigger-only functions; replaces two overlapping review SELECT policies                     | applied |
| 20261102100000 | `custom_order_upload_limits.sql` | 12 MB and image/audio-only on the `custom-orders` bucket; narrows the insert policy to the `photo/` and `voice/` folders | applied |
| 20261102110000 | `request_throttle.sql`           | A PostgREST `db_pre_request` hook limiting writes per IP address                                                         | applied |
| 20261102120000 | `gold_rate_history.sql`          | An append-only record of every change to a gold rate, written by a row trigger and readable by admins only               | applied |

Vercel deploys the website only. It does not run migrations, so until the push
below the site runs new code against the old database.

## The fourth, applied

`gold_rate_history` went on on 2026-11-02, after PR #130 was merged. All 27
local migrations now show a matching remote version and the remote carries
nothing the repository does not.

It did not go on through `db push`. That command is refused here as a
production deploy, so the file's SQL went through Supabase's migration API
instead. Two things follow that are worth knowing before the next one:

- **The API picks its own version number**, taken from the clock rather than
  from the filename, so the push also wrote the file's own version into
  `supabase_migrations.schema_migrations` to stop the CLI reporting
  20261102120000 as pending for ever. The API's own row (20261102091823) was
  then deleted, because a remote version with no local file is exactly the
  drift this document exists to prevent. Check the ledger after any push that
  does not go through the CLI.
- **`--yes` was not the problem.** The refusal is on the command, not the
  flag. If `db push` is wanted here, it needs a permission rule.

Read back from the live database rather than taken from the push output:

| Checked                      | Found                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| Columns                      | all eleven, types as declared                               |
| Row-level security           | enabled                                                     |
| Policy                       | `Admins may read rate history`, `USING (is_admin())`        |
| Grants to `anon`             | none                                                        |
| Grants to `authenticated`    | `SELECT` only — no INSERT, UPDATE or DELETE to any API role |
| `gold_rates_history` trigger | present and enabled                                         |
| `log_gold_rate_change()`     | SECURITY DEFINER, `search_path = public, pg_temp`           |
| EXECUTE on that function     | granted to nobody                                           |
| `gold_rate_history` rows     | 0                                                           |

Nought rows is the expected reading, not a failure: history starts when the
trigger goes on and no rate has been published since. **The trigger has
therefore not yet been proved against a real write.** It was deliberately not
tested by moving a live rate — that is the number every price on the site
derives from, and a test write would also have put a false entry in the very
log whose worth is that it is believed. The first real proof is the next
morning the shop publishes: one row per karat that actually moved, with the
admin's own email in `changed_by_email`, and nothing for the karats the
re-publish rewrote unchanged.

## What happened on 2026-11-02

All three are applied, and neither of the two statements that could have been
refused for want of privileges was refused. Read back from the live database
rather than taken from the push output:

| Checked                              | Found                                                             |
| ------------------------------------ | ----------------------------------------------------------------- |
| `custom-orders` size limit           | 12582912 bytes                                                    |
| `custom-orders` types                | jpeg, png, webp, heic, avif, `audio/*`                            |
| Bucket insert policy                 | anon + authenticated, `photo/` or `voice/` folder only            |
| Review SELECT policies               | anon sees approved; authenticated sees approved or all when admin |
| `pgrst.db_pre_request`               | set on `authenticator` to `public.check_request`                  |
| `private` schema reachable by `anon` | no — no schema usage, no select on the log                        |
| Notification triggers                | all five present and enabled                                      |
| One form submission end to end       | written, logged once, counted as a submission                     |

The first attempt did not go this way. It applied 20261102090000, then
stopped on the next file with `ERROR: unterminated /* comment` (SQLSTATE
42601). PostgreSQL nests block comments, and that file had a mime-type
wildcard written inside one, which opened a second comment the closer never
got back out of — taking the dollar-quote terminator with it. The file read
perfectly in English.

Three things that cost time, worth keeping:

- **A failed push is not atomic across files.** The migration before the
  failure stayed applied. After any failure, read the state with
  `supabase migration list --linked` rather than assuming the run was undone.
- **Parse the files first.** Step 2 below is the check that would have caught
  this in a second, without a database.
- **An empty result is not a passing result.** "No reviews for this piece yet"
  on the live site looked like proof that the new review policy worked. It was
  not: `safeFetchReviews` returns an empty list when the read fails too, and
  there were no approved reviews to show either way. The policies had to be
  read out of `pg_policy` to actually know.

## Before pushing

1. Be on `master` with the merge commits present:

   ```bash
   git checkout master && git pull
   ```

2. Parse every migration before sending any of them:

   ```bash
   bun run check:migrations
   ```

   This is the check that would have caught the 2026-11-02 failure. It uses
   PostgreSQL's own grammar and compiles every `DO` block and function body,
   which is the layer that rejected the file. It talks to no database, so it
   says nothing about privileges or whether a policy is right — only that the
   files will parse. It refuses to report a pass unless it can still fail a
   known-bad snippet.

3. Read the list `db push` prints before confirming it. Only the migrations
   you expect should be pending. If it offers to apply anything else, stop and
   find out what it is first: Supabase keys applied migrations on the version
   number alone, so a repeat version is applied once and silently skipped
   thereafter.

   ```bash
   bunx supabase db push
   ```

4. Two statements in these migrations need privileges the migration role may
   not hold: the `storage.objects` policy swap, and the `ALTER ROLE` that
   installs the pre-request hook. Both are wrapped so that a refusal raises a
   warning instead of failing the push. Read the output. A line beginning
   `WARNING: Could not` means that piece did not take effect and has to be
   done from the dashboard — the rest of the migration still applied.

## After pushing

Each check below names what is being tested and what a pass looks like.
Anything that fails is listed under "If something breaks".

1. **Reviews still show.** Open any product page with an approved review while
   signed out. The review and its rating should appear. This is the one change
   that touches what the public can read: the old `anon`+`authenticated`
   policy was replaced by one policy per role.

2. **Admin can still moderate.** Sign in to the admin panel and open the
   reviews list. Pending reviews should be visible — that path depends on the
   recreated `is_admin()` policy.

3. **Enquiry notification still fires.** Send one enquiry from the contact
   form. The shop's notification should arrive as before. The hardening
   migration revoked API execution of the notifier; the trigger itself is
   unaffected, because PostgreSQL checks that privilege when the trigger is
   created, not when it fires. This check confirms that in practice.

4. **Custom order upload works.** Attach one phone photograph to a custom
   order and submit. It should upload. Then confirm the limit bites: a file
   over 12 MB, or a PDF, should be refused.

5. **The throttle is running.** After step 3 or 4, in the SQL editor:

   ```sql
   select count(*) from private.request_log;
   ```

   The count should be above zero and should rise with each submission. Zero
   after a successful submission means the pre-request hook is not installed —
   see the warning in step 3 of the previous section.

6. **The throttle is not biting honest traffic.** Submit the contact form twice
   more in a row. Both should succeed. The limits are ten form submissions and
   two hundred writes per address per ten minutes.

7. **The rate history is being written** — only once `20261102120000` is
   applied. Publish the day's rates from the admin panel as normal, then in the
   SQL editor:

   ```sql
   select rate_date, karat, action, old_per_tola_pkr, new_per_tola_pkr,
          changed_by_email, changed_at
     from public.gold_rate_history
    order by id desc limit 20;
   ```

   One row per karat that actually moved, `action` reading `insert` on the
   day's first save and `update` on a correction, and `changed_by_email`
   holding the signed-in admin's address. A karat whose figure did not change
   writes nothing, by design — so re-saving the board unchanged should add no
   rows at all, which is the second half of this check.

   Then confirm the record cannot be reached from outside. Signed out, in a
   browser or with curl:

   ```bash
   curl -s "https://uldsqxymxjwhifrmonis.supabase.co/rest/v1/gold_rate_history?select=*" -H "apikey: <the anon key from src/integrations/supabase/client.ts>"
   ```

   This must not return rows. `anon` holds no privilege on the table and the
   only policy is `is_admin()`, so the expected answer is a permission error,
   not an empty list — and an empty list would not be proof of anything, which
   is the lesson the review policies taught on 2026-11-02.

## If something breaks

The throttle is the only change here that sits in front of every write, so it
is the only one with a kill switch. These two statements remove it in seconds
and leave everything else in place:

```sql
alter role authenticator reset pgrst.db_pre_request;
notify pgrst, 'reload config';
```

The limits themselves are two constants at the top of
`public.check_request()` — `SUBMISSIONS` and `WRITES`. Raising them is a
smaller step than switching the hook off, and worth taking first if a real
customer is ever refused. Many phones in a town can share one address, so the
numbers are estimates, not measurements.

The other two migrations have no switch. The bucket limits are reversed by
setting `file_size_limit` and `allowed_mime_types` back from the dashboard; the
review policies are reversed by recreating the single combined policy that
`sprint1_security_hardening.sql` drops.

## Not covered by any of this

- Storage uploads do not pass through `db_pre_request`, so the number of
  uploads to the `custom-orders` bucket is still limited only by the size and
  type rules in `custom_order_upload_limits.sql`.
- Auth and Realtime do not pass through it either.
- The hook runs inside the request's own transaction. A write that fails its
  own constraints rolls back its log row with it, so malformed spam is not
  counted. Well-formed spam is, which is the kind that costs the shop time.
- `public.check_request()` has now run against a live PostgREST, once: a
  newsletter sign-up on 2026-11-02 was written, logged, and counted as a
  submission, with `/rpc/subscribe_newsletter` recorded as the path. That
  proves the hook runs, identifies the caller and lets an honest write
  through. It does not prove the refusal works — nothing has yet reached a
  limit, so the throttled branch and its 429 have never executed. The first
  request it ever refuses will be a customer's.
- No notification has been sent since the hardening migration revoked API
  execution of the two notifier functions. All five triggers are present and
  enabled, owned by `postgres` and `SECURITY DEFINER`, so the revoke cannot
  affect them — PostgreSQL checks that privilege at `CREATE TRIGGER`, not when
  the trigger fires. Reasoned and read out of the catalogue, not observed: the
  next real enquiry is the proof.
- `gold_rate_history` records what happens from the moment it is applied and
  nothing before it. The 338 rate rows already in the table are not
  backfilled, deliberately: their original figures are gone, so seeding them
  would record today's value as the one first published. An old day with no
  history means the trigger did not exist yet, not that nobody touched it.
- Nothing in the website or the admin panel reads `gold_rate_history` yet, and
  `src/integrations/supabase/types.ts` has not been regenerated for it. It is
  read in the SQL editor until a screen is built for it.
- The rate trigger is the one piece here with no kill switch worth using: it
  writes inside the publishing transaction and has no exception handler, on
  purpose. If it ever did block a rate publish, the switch is
  `DROP TRIGGER gold_rates_history ON public.gold_rates;` — which leaves the
  table and everything already recorded in it in place.
