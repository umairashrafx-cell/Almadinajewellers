-- Enquiry capture: bridal consultations, callbacks, product enquiries, contact.
--
-- The enquiries table already exists in the live project, created outside this
-- migrations folder with the columns from the original brief (id, type, name,
-- phone, city, message, product_id, created_at). This migration adds the fields
-- the bridal consultation form needs and locks the table down.
--
-- SECURITY: the live table currently answers anonymous SELECT requests. It is
-- empty today, so nothing has been exposed, but the anon key is published in the
-- page source — any read permission here would make every customer's name and
-- phone number world-readable the moment a form is submitted. Below, all
-- existing policies are dropped and replaced with a single INSERT-only policy,
-- and SELECT/UPDATE/DELETE are revoked from anon and authenticated. The shop
-- reads leads with the service role or in the Supabase dashboard.
--
-- Nothing in the application reads this table, so revoking read access breaks
-- no existing behaviour. When an admin screen is built, add a SELECT policy
-- scoped to signed-in staff rather than re-opening it to anon.

CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  city text,
  message text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fields the bridal form and the admin workflow need.
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS wedding_date date,
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS preferred_time text,
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS handled boolean NOT NULL DEFAULT false;

-- Length and value limits, enforced in the database because anyone holding the
-- anon key can post straight at the API without going through the form.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_field_limits') THEN
    ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_field_limits CHECK (
      type IN ('product', 'callback', 'bridal', 'contact')
      AND length(btrim(name)) BETWEEN 2 AND 80
      AND length(btrim(phone)) BETWEEN 7 AND 25
      AND (city IS NULL OR length(city) <= 60)
      AND (message IS NULL OR length(message) <= 1000)
      AND (budget_range IS NULL OR length(budget_range) <= 40)
      AND (preferred_time IS NULL OR length(preferred_time) <= 40)
      AND (product_sku IS NULL OR length(product_sku) <= 40)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON public.enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_type_idx ON public.enquiries (type);
CREATE INDEX IF NOT EXISTS enquiries_unhandled_idx ON public.enquiries (created_at DESC) WHERE NOT handled;

-- ---------------------------------------------------------------------------
-- Lock down access
-- ---------------------------------------------------------------------------

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Clear whatever policies exist, so the end state is exactly one INSERT policy
-- regardless of what was configured before.
DO $$
DECLARE
  existing record;
BEGIN
  FOR existing IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enquiries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.enquiries', existing.policyname);
  END LOOP;
END $$;

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.enquiries FROM anon, authenticated;
GRANT INSERT ON public.enquiries TO anon, authenticated;
GRANT ALL ON public.enquiries TO service_role;

CREATE POLICY "Anyone may submit an enquiry" ON public.enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- handled is the shop's own workflow flag; a submitter cannot pre-set it.
    handled = false
  );
