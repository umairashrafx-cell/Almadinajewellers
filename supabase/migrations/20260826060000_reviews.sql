-- Customer reviews, per piece.
--
-- Search Console asks for aggregateRating and review on Product markup, and
-- the only honest way to supply them is to have real reviews. Inventing them
-- is against Google's structured data policy and against what this shop sells
-- itself on, so this is the machinery for collecting genuine ones.
--
-- Everything arrives as 'pending' and is published by hand. An open review form
-- on a public site is a spam target within days, and a shop that trades on
-- "weighed in front of you" cannot afford a wall of casino links under its
-- bridal sets.

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  -- Denormalised so a review still reads sensibly in the admin list, and so
  -- the public query can filter without joining.
  product_sku text NOT NULL,
  name text NOT NULL,
  city text,
  rating smallint NOT NULL,
  body text NOT NULL,
  /*
   * The order this review came from, when the reviewer supplied one. Never
   * exposed publicly — anon's SELECT grant is column-level and omits it — but
   * it is what lets the shop confirm a reviewer actually bought the piece.
   */
  order_reference text,
  /* Set by the shop at moderation time, not claimed by the reviewer. */
  verified_purchase boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_product_idx
  ON public.reviews (product_id, created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS reviews_pending_idx
  ON public.reviews (created_at DESC) WHERE status = 'pending';

-- Enforced in the database, because anyone holding the anon key can post at the
-- API without going through the form.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_field_limits') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_field_limits CHECK (
      status IN ('pending', 'approved', 'rejected')
      AND rating BETWEEN 1 AND 5
      AND length(btrim(name)) BETWEEN 2 AND 60
      AND (city IS NULL OR length(city) <= 60)
      AND length(btrim(body)) BETWEEN 10 AND 1500
      AND (order_reference IS NULL OR length(order_reference) <= 40)
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reviews FROM anon, authenticated;

-- Public reads are column-level: an approved review is public, but the order
-- reference behind it and the moderation status are not.
GRANT SELECT (id, product_id, product_sku, name, city, rating, body, verified_purchase, created_at)
  ON public.reviews TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews'
      AND policyname='Approved reviews are public'
  ) THEN
    CREATE POLICY "Approved reviews are public" ON public.reviews
      FOR SELECT TO anon, authenticated USING (status = 'approved');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews'
      AND policyname='Admins may read every review'
  ) THEN
    CREATE POLICY "Admins may read every review" ON public.reviews
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews'
      AND policyname='Admins may moderate reviews'
  ) THEN
    CREATE POLICY "Admins may moderate reviews" ON public.reviews
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews'
      AND policyname='Admins may delete reviews'
  ) THEN
    CREATE POLICY "Admins may delete reviews" ON public.reviews
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Leaving a review
-- ---------------------------------------------------------------------------

/*
 * A definer function rather than an INSERT grant.
 *
 * It pins status to 'pending' and verified_purchase to false where no policy
 * could — a WITH CHECK cannot stop a caller claiming a verified purchase and
 * then having it published by a distracted moderator. It also resolves the SKU
 * to a real product, so a review cannot be filed against a piece that does not
 * exist.
 */
CREATE OR REPLACE FUNCTION public.submit_review(
  p_sku text,
  p_name text,
  p_city text,
  p_rating smallint,
  p_body text,
  p_order_reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM public.products WHERE sku = btrim(p_sku);
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'unknown product';
  END IF;

  INSERT INTO public.reviews
    (product_id, product_sku, name, city, rating, body, order_reference, status, verified_purchase)
  VALUES (
    v_product_id,
    btrim(p_sku),
    btrim(p_name),
    nullif(btrim(coalesce(p_city, '')), ''),
    p_rating,
    btrim(p_body),
    nullif(btrim(coalesce(p_order_reference, '')), ''),
    'pending',
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(text, text, text, smallint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_review(text, text, text, smallint, text, text)
  TO anon, authenticated;
