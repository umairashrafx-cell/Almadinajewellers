# Migration rollout checklist

Date written: 2026-11-02
Applies to the three migrations merged on 2026-11-02 and not yet applied to the
live database:

| Version        | File                             | What it changes                                                                                                          |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 20261102090000 | `sprint1_security_hardening.sql` | Revokes API execution of two trigger-only functions; replaces two overlapping review SELECT policies                     |
| 20261102100000 | `custom_order_upload_limits.sql` | 12 MB and image/audio-only on the `custom-orders` bucket; narrows the insert policy to the `photo/` and `voice/` folders |
| 20261102110000 | `request_throttle.sql`           | A PostgREST `db_pre_request` hook limiting writes per IP address                                                         |

Vercel deploys the website only. It does not run migrations, so until the push
below the site runs new code against the old database.

## Before pushing

1. Be on `master` with the merge commits present:

   ```bash
   git checkout master && git pull
   ```

2. Read the list `db push` prints before confirming it. Exactly the three
   versions above should be pending. If it offers to apply anything else, stop
   and find out what it is first — Supabase keys applied migrations on the
   version number alone, so a repeat version is applied once and silently
   skipped thereafter.

   ```bash
   bunx supabase db push
   ```

3. Two statements in these migrations need privileges the migration role may
   not hold: the `storage.objects` policy swap and `ALTER ROLE authenticator
SET pgrst.db_pre_request`. Both are wrapped so that a refusal raises a
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
- `public.check_request()` has never run against a live PostgREST. There is no
  staging database on this project. Every expression inside it was checked
  separately against the live database read-only; the function as a whole was
  not. That is what steps 5 and 6 above are for.
