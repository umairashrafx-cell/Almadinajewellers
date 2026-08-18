-- Enquiry capture: bridal consultations, callbacks, product enquiries, contact.
--
-- SECURITY: this is the one table the public writes to. Anonymous visitors may
-- INSERT and nothing else — no SELECT, UPDATE or DELETE policy exists for anon
-- or authenticated, so submitted names and phone numbers cannot be read back
-- through the public API. The shop reads them with the service role (the admin
-- screen) or in the Supabase dashboard.

CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('product', 'callback', 'bridal', 'contact')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  phone text NOT NULL CHECK (length(btrim(phone)) BETWEEN 7 AND 25),
  city text CHECK (city IS NULL OR length(city) <= 60),
  message text CHECK (message IS NULL OR length(message) <= 1000),
  -- Bridal-specific
  wedding_date date,
  budget_range text CHECK (budget_range IS NULL OR length(budget_range) <= 40),
  preferred_time text CHECK (preferred_time IS NULL OR length(preferred_time) <= 40),
  -- Product enquiries and callbacks reference the piece in question.
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_sku text CHECK (product_sku IS NULL OR length(product_sku) <= 40),
  -- Set by the database, never by the client.
  created_at timestamptz NOT NULL DEFAULT now(),
  handled boolean NOT NULL DEFAULT false
);

CREATE INDEX enquiries_created_at_idx ON public.enquiries (created_at DESC);
CREATE INDEX enquiries_type_idx ON public.enquiries (type);
CREATE INDEX enquiries_unhandled_idx ON public.enquiries (created_at DESC) WHERE NOT handled;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Insert only. Deliberately no SELECT grant: the anon key is public, so any
-- read permission here would expose every customer's phone number.
GRANT INSERT ON public.enquiries TO anon, authenticated;
GRANT ALL ON public.enquiries TO service_role;

CREATE POLICY "Anyone may submit an enquiry" ON public.enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- handled is the shop's own workflow flag; a submitter cannot pre-set it.
    handled = false
  );
