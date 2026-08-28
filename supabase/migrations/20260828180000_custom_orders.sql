-- Custom order enquiries.
--
-- Someone wants a piece made and describes it however they can — a photograph
-- of something they saw, a few sentences, or a voice note, because describing
-- jewellery in writing is hard and speaking it is not. The form takes any of
-- the three and insists on at least one.

CREATE SEQUENCE IF NOT EXISTS public.custom_orders_reference_seq;

CREATE TABLE IF NOT EXISTS public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT (
    'AMJ-C-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYMM') || '-' ||
    lpad(nextval('public.custom_orders_reference_seq')::text, 4, '0')
  ),
  name text NOT NULL,
  phone text NOT NULL,
  city text,
  /* Where it belongs in the catalogue, when the customer knows. */
  category_slug text REFERENCES public.categories(slug) ON UPDATE CASCADE ON DELETE SET NULL,
  /* Ring or bangle size. Free text: the shop takes several sizing systems. */
  size text,
  description text,
  /* Storage object paths in the private custom-orders bucket. */
  image_path text,
  voice_path text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_orders_created_idx ON public.custom_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS custom_orders_open_idx ON public.custom_orders (created_at DESC)
  WHERE status = 'new';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_orders_limits') THEN
    ALTER TABLE public.custom_orders ADD CONSTRAINT custom_orders_limits CHECK (
      status IN ('new', 'discussed', 'quoted', 'closed')
      AND length(btrim(name)) BETWEEN 2 AND 80
      AND length(btrim(phone)) BETWEEN 7 AND 25
      AND (city IS NULL OR length(city) <= 60)
      AND (size IS NULL OR length(size) <= 40)
      AND (description IS NULL OR length(description) <= 2000)
      -- The whole point of the page: an enquiry with nothing in it is not one.
      AND (description IS NOT NULL OR image_path IS NOT NULL OR voice_path IS NOT NULL)
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.custom_orders FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.custom_orders TO authenticated;
GRANT ALL ON public.custom_orders TO service_role;
GRANT USAGE ON SEQUENCE public.custom_orders_reference_seq TO anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='custom_orders' AND policyname='Admins may read custom orders') THEN
    CREATE POLICY "Admins may read custom orders" ON public.custom_orders
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='custom_orders' AND policyname='Admins may update custom orders') THEN
    CREATE POLICY "Admins may update custom orders" ON public.custom_orders
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='custom_orders' AND policyname='Admins may delete custom orders') THEN
    CREATE POLICY "Admins may delete custom orders" ON public.custom_orders
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

/*
 * Filing an enquiry.
 *
 * A definer function rather than an INSERT grant, for the same reason orders
 * use one: the customer is handed back a reference, and returning it from a
 * plain insert would need SELECT on a table holding other people's phone
 * numbers and photographs.
 */
CREATE OR REPLACE FUNCTION public.submit_custom_order(
  p_name text,
  p_phone text,
  p_city text,
  p_category_slug text,
  p_size text,
  p_description text,
  p_image_path text,
  p_voice_path text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reference text;
BEGIN
  INSERT INTO public.custom_orders
    (name, phone, city, category_slug, size, description, image_path, voice_path, status)
  VALUES (
    btrim(p_name),
    btrim(p_phone),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_category_slug, '')), ''),
    nullif(btrim(coalesce(p_size, '')), ''),
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_image_path, '')), ''),
    nullif(btrim(coalesce(p_voice_path, '')), ''),
    'new'
  )
  RETURNING reference INTO v_reference;

  RETURN v_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_custom_order(text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_custom_order(text,text,text,text,text,text,text,text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Private, unlike product-images. These are a stranger's photographs and their
-- recorded voice; the shop reads them through a signed link, and nobody who
-- guesses a URL reads them at all.
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-orders', 'custom-orders', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
                 AND tablename='objects' AND policyname='Anyone may attach to a custom order') THEN
    CREATE POLICY "Anyone may attach to a custom order" ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'custom-orders');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
                 AND tablename='objects' AND policyname='Admins may read custom order files') THEN
    CREATE POLICY "Admins may read custom order files" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'custom-orders' AND public.is_admin())
      WITH CHECK (bucket_id = 'custom-orders' AND public.is_admin());
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not create storage policies for custom-orders — add them from the dashboard.';
END $$;
