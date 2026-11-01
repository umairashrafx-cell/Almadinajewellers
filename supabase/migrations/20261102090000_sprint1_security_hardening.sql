-- Sprint 1 security hardening.
--
-- This migration intentionally changes no table data and does not alter the
-- customer-facing RPC permissions. It only closes direct API execution of
-- trigger-only notification functions and removes overlapping review SELECT
-- policies while preserving the existing visibility rules.
--
-- Apply to a staging Supabase project first. Do not apply to production until
-- the website, admin panel, order flows, and notification triggers pass QA.

BEGIN;

-- These functions are invoked by PostgreSQL triggers. Callers do not need
-- EXECUTE on a trigger function at row-change time; the privilege is checked
-- when CREATE TRIGGER is issued. They must not be exposed as PostgREST RPCs.
REVOKE EXECUTE ON FUNCTION public.notify_new_enquiry()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_rates_published()
  FROM PUBLIC, anon, authenticated;

-- Preserve public access to approved reviews, but avoid overlapping
-- authenticated SELECT policies. Anonymous users see approved reviews only.
-- Signed-in customers see approved reviews; admins can additionally see all
-- reviews for moderation through the existing is_admin() SECURITY DEFINER gate.
DROP POLICY IF EXISTS "Approved reviews are public" ON public.reviews;

CREATE POLICY "Approved reviews are public"
  ON public.reviews
  FOR SELECT
  TO anon
  USING (status = 'approved');

DROP POLICY IF EXISTS "Admins may read every review" ON public.reviews;

CREATE POLICY "Admins may read every review"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (status = 'approved' OR public.is_admin());

COMMIT;
