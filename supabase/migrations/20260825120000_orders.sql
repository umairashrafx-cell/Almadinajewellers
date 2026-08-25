-- Order requests from the website's cart.
--
-- Not a checkout. The shop takes payment in store or on confirmed delivery, so
-- this records what a customer wants and at what price it was quoted, and the
-- conversation continues on WhatsApp. That is the same shape as enquiries, one
-- step further along.
--
-- The important column is `items`. Listed prices are rebuilt from the day's
-- gold rate on every page load, so the figure a customer saw is true only for
-- that day. Storing the line items and their unit prices as they stood at the
-- moment of ordering is what lets the shop honour, or knowingly re-quote, the
-- number the customer actually agreed to. A foreign key to products would give
-- today's price, which is precisely the wrong answer.

CREATE SEQUENCE IF NOT EXISTS public.orders_reference_seq;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Something a customer can quote over the phone. "AMJ-2608-0042" survives
  -- being read aloud in a way a uuid does not.
  reference text NOT NULL UNIQUE DEFAULT (
    'AMJ-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYMM') || '-' ||
    lpad(nextval('public.orders_reference_seq')::text, 4, '0')
  ),
  name text NOT NULL,
  phone text NOT NULL,
  city text,
  notes text,
  /* [{ sku, name, slug, karat, grossWeightG, unitPricePkr, quantity }] */
  items jsonb NOT NULL,
  item_count integer NOT NULL,
  total_pkr integer NOT NULL,
  /* The rate each line was priced against, so the quote can be audited. */
  rate_basis jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_open_idx ON public.orders (created_at DESC)
  WHERE status = 'new';

-- Limits enforced in the database, because anyone holding the anon key can post
-- straight at the API without going through the cart.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_field_limits') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_field_limits CHECK (
      status IN ('new', 'confirmed', 'completed', 'cancelled')
      AND length(btrim(name)) BETWEEN 2 AND 80
      AND length(btrim(phone)) BETWEEN 7 AND 25
      AND (city IS NULL OR length(city) <= 60)
      AND (notes IS NULL OR length(notes) <= 1000)
      AND jsonb_typeof(items) = 'array'
      -- An empty order is a bug, and a hundred-line one is abuse.
      AND jsonb_array_length(items) BETWEEN 1 AND 40
      AND item_count BETWEEN 1 AND 200
      AND total_pkr BETWEEN 0 AND 2000000000
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Same posture as enquiries: the public may submit and may not read. An order
-- carries a name, a phone number and a shopping list, and the anon key is
-- published in the page source.
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.orders FROM anon, authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.orders_reference_seq TO anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders'
      AND policyname = 'Anyone may place an order request'
  ) THEN
    CREATE POLICY "Anyone may place an order request" ON public.orders
      FOR INSERT TO anon, authenticated
      -- status is the shop's workflow flag; a submitter cannot pre-set it.
      WITH CHECK (status = 'new');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders'
      AND policyname = 'Admins may read orders'
  ) THEN
    CREATE POLICY "Admins may read orders" ON public.orders
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders'
      AND policyname = 'Admins may update orders'
  ) THEN
    CREATE POLICY "Admins may update orders" ON public.orders
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
