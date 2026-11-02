# Sprint 1 Security Audit — Al-Madina Jewellers

Date: 2026-11-02
Repository: https://github.com/umairashrafx-cell/Almadinajewellers
Working branch: feature/sprint-1-security-hardening
Production impact: none. No live database changes were applied.

## Verified architecture

- Website: React 19, TypeScript, TanStack Start/Router, Vite 8, Tailwind CSS 4.
- Android: Capacitor 8 hybrid app; application ID com.almadinajeweller.app.
- Backend: Supabase PostgreSQL 17, Auth, Storage, Edge Functions.
- Mobile code is separated under mobile/ so it does not enter the Vercel website build.

## Database inventory observed

14 public tables; 333 gold-rate rows; 29 product rows; 15 category rows at audit time.
Existing business tables include products, categories, gold_rates, enquiries, orders, custom_orders, admin_users, reviews, newsletter_subscribers, push_devices, rate_alerts_sent, market_snapshot, counter_calculations, and app_config.

## Security findings

### 1. Trigger functions exposed as RPCs — fix prepared in migration

The SECURITY DEFINER trigger functions public.notify_new_enquiry() and public.notify_rates_published() had EXECUTE grants to anon and authenticated. These are trigger-only functions and should not be callable through the public PostgREST RPC surface.

Migration 20261102090000_sprint1_security_hardening.sql revokes EXECUTE from PUBLIC, anon, and authenticated. It leaves their triggers in place. Apply to staging and test enquiry, custom-order, order, and gold-rate notification triggers before production rollout.

### 2. Customer-facing SECURITY DEFINER RPCs — preserve and test

These are intentionally callable from the public client and should not be blindly disabled:
- place_order(...)
- submit_custom_order(...)
- submit_review(...)
- subscribe_newsletter(...)
- register_push_device(...)
- forget_push_device(...)

They write to otherwise protected tables. Their current definitions use a pinned search_path and table constraints exist for order/custom-order/review/newsletter fields. They still require abuse/rate-limit review and negative tests for invalid payloads. In particular, validate the token ownership assumptions for push-device deletion and verify order totals are treated as customer estimates, not authoritative final prices.

### 3. Admin helper

public.is_admin() is SECURITY DEFINER and EXECUTE is granted to authenticated only. It is used by admin RLS policies and must remain available to authenticated users. It uses a pinned search_path and checks auth.uid() against admin_users.

### 4. RLS enabled without policies — intentional private tables

The advisor reports app_config, market_snapshot, push_devices, and rate_alerts_sent. These currently have RLS enabled with no client policies. This is a deny-by-default posture and appears intentional. Do not add public policies to clear the informational lint. Verify service-role/Edge Function access separately.

### 5. Review SELECT policies — fix prepared in migration

The current policy set overlaps for authenticated users: Approved reviews are public applies to anon and authenticated, while Admins may read every review applies to authenticated. The migration splits anonymous approved-review access from authenticated access and retains admin moderation visibility through is_admin().

### 6. Auth leaked-password protection — dashboard action required

Supabase Advisor reports leaked-password protection disabled. Enable it in Supabase Dashboard → Authentication → Security and Password → Leaked password protection (wording may vary). This is an Auth configuration setting and is not changed by the migration.

### 7. pg_net extension schema warning — defer pending dependency review

Supabase Advisor reports pg_net installed in public. Do not move the extension blindly: notification trigger functions call net.http_post and extension relocation can affect function resolution and deployment. Review extension ownership, dependencies, and Supabase-supported relocation procedure in staging first.

## Performance observations

- Three foreign-key indexes are missing: counter_calculations.created_by, custom_orders.category_slug, products.category_slug. Confirm actual query patterns and index names before adding.
- Advisor marks eight existing indexes as unused. Do not drop them solely on this short observation window; some are for low-frequency admin/reporting flows.
- Review policy overlap is addressed in the prepared migration.

## Migration validation plan

1. Apply migration only to a staging Supabase project.
2. Confirm anon and authenticated cannot invoke the two trigger functions via RPC.
3. Insert a test enquiry, custom order, and order; verify trigger execution and notifications.
4. Publish/update a test gold-rate row and verify the rate trigger.
5. Confirm anon can read approved reviews only.
6. Confirm authenticated non-admin can read approved reviews only.
7. Confirm authenticated admin can read all reviews.
8. Run Supabase Security and Performance Advisors again.
9. Run website build, lint, Android build, and smoke tests.
10. Only then prepare a production rollout PR and explicit release approval.

## Explicitly not changed

- Production Supabase database, Auth settings, and Storage policies.
- master branch or production deployment.
- Android application ID, signing configuration, or Play Store identity.
- Existing customer, order, product, and rate data.

---

# Second pass: the MEDIUM and LOW leftovers

Date: 2026-11-02, after the two P0 items were applied and verified (see
`migration-rollout-checklist.md`). Every claim below was read out of the live
database at ref `uldsqxymxjwhifrmonis` or out of this repo. Two of the four
items are worth acting on and two are not; the reasoning for leaving the other
two is the point of this section, not an apology for it.

## A. No rate-change audit trail on gold_rates (MEDIUM) — done, migration written

The daily rate is what every price on the site derives from, and nothing
recorded a change to it.

- `publishRates()` (`src/lib/admin.ts`) upserts on `(rate_date, karat)`, so a
  correction during the day overwrites the figure and keeps nothing of what it
  replaced.
- `gold_rates_touch` (20260821180000) stamps `updated_at`. That says when a row
  was last revised, not what it said before or who revised it.
- The notify triggers `gold_rates_notify` and `gold_rates_notify_update` are
  `FOR EACH STATEMENT`; they read the day's rows to build a notification body
  and keep no history. Checked before writing anything: no history or audit
  table existed anywhere in `public` or `private`.
- Live policies on `gold_rates` allow admins to INSERT, UPDATE **and DELETE**.
- `admin_users` holds **two** rows, so "the shop changed it" does not identify
  anyone.
- Volume is 338 rows over 68 days — roughly five karats a day. A row trigger
  costs nothing at that rate.

`20261102120000_gold_rate_history.sql` adds `public.gold_rate_history` and an
`AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` trigger. SELECT is the only
privilege any API role holds on the table, and the SELECT policy is
`is_admin()`, so the record cannot be forged or erased through the Data API and
`anon` cannot see it at all.

Three choices in it that are deliberate and would otherwise look like
omissions:

- **No backfill.** The 338 existing rows no longer hold their original figures,
  so seeding them would record today's possibly-corrected value as the one
  first published. History starts the day the migration is applied.
- **An unchanged karat writes no row.** Every save sends the whole board, so
  without this one correction to 22K would log four no-op rows beside it.
- **No exception handler.** The notifiers swallow failures because a lost
  notification must not cost the shop its morning. An audit trail that can be
  skipped unnoticed is worse than none, because it would be believed.

Not applied. The owner applies it; see the rollout checklist for its checks.

## B. Leaked-password protection disabled (LOW) — cannot be enabled, left alone

This is not a setting anyone forgot to click.

- The organisation is on the **free** plan (`tier_free`).
- Supabase's own password-security guide states that leaked password protection
  is available on the Pro plan and above.

So the advisor will keep reporting `auth_leaked_password_protection` until the
org is upgraded, and that is expected rather than a regression. Finding 6 above
should be read with that correction: there is no dashboard toggle available to
this project today.

For whenever it does become available: the CLI (v2.122.0) carries
`password_hibp_enabled`, while the `config.toml` surface carries only
`minimum_password_length` and `password_requirements` — so today it is a
dashboard or Management API setting, not a `config push`.

**`config.toml` was deliberately not touched, and anyone adding auth settings
to it must `supabase config pull` first.** `supabase config pull --dry-run`
reports twelve remote-only differences, including `auth.site_url`,
`auth.email.enable_confirmations` and both TOTP MFA flags. A bare
`supabase config push` from a `config.toml` with no `[auth]` block would push
CLI defaults over all of them — it would turn email confirmations and MFA off
on production.

## C. pg_net in the public schema (LOW) — left alone; the textbook fix is impossible

Finding 7 deferred this pending a dependency review. That review is done, and
the answer is that there is nothing to move and no way to move it.

- The `pg_extension` row for `pg_net` has `extnamespace = public` and
  **`extrelocatable = false`**. A non-relocatable extension refuses
  `ALTER EXTENSION pg_net SET SCHEMA extensions` outright. There is no in-place
  move to attempt.
- All 28 of its member objects are in the `net` schema — one schema, three
  relations, twelve functions, twelve types. **Nothing belonging to `pg_net` is
  in `public`.** `net.http_post`, which the notifiers call, already lives
  outside it.

The lint is therefore about one bookkeeping row in `pg_extension`, not about
anything reachable in `public`, and closes no privilege-escalation path. The
only way to change it is `DROP EXTENSION` and recreate, which would take the
`net` schema and its request and response queues with it and invalidate
`notify_new_enquiry` and `notify_rates_published` — triggers live on
`enquiries`, `orders`, `custom_orders` and `gold_rates`. On a free project with
no staging copy and no local database available, that is not a trade worth
taking for a cosmetic warning. Leave the warning standing and this note beside
it.

## D. src/integrations/supabase/client.server.ts was dead code (LOW) — deleted

A repo-wide search for `client.server` and `supabaseAdmin` across `src/` and
`mobile/` returned the file's own body and its own usage comment and nothing
else. The remaining `SUPABASE_SERVICE_ROLE_KEY` hits are the Edge Functions
`market-rates` and `notify-enquiry`, which read it from Deno env and never
touch this file.

It is worth removing rather than ignoring because it was a service-role client
sitting inside the tree Vite bundles, and its own header warns that a top-level
import from a route or a `.functions.ts` file would ship it to the browser. A
dead file with that failure mode is a trap for whoever next writes a server
function. It is Lovable-generated, so Lovable may put it back; if it reappears,
it can be deleted again on the same reasoning.

## Also not changed in this pass

- `src/integrations/supabase/types.ts` was not regenerated. The migration is
  not applied yet and nothing in the app reads `gold_rate_history`, so
  regenerating now would either be premature or drag in unrelated drift.
- The four `rls_enabled_no_policy` INFO lints stand as finding 4 settled them:
  deny-by-default and intentional.
- The three missing foreign-key indexes and the eight unused-index reports
  under "Performance observations" are untouched. They are performance items,
  not security ones, and both still want query patterns confirmed first.
