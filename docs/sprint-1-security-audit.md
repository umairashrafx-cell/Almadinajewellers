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
