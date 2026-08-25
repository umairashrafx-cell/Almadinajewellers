-- When a product last actually changed.
--
-- The sitemap reports a <lastmod> for every product page, and it had nothing
-- better to report than created_at — so a piece renamed, re-photographed or
-- re-priced through the admin panel this morning still told Google it had not
-- changed since the day it was added. A lastmod that is wrong in that direction
-- is worse than none: it is the value crawlers use to decide whether re-reading
-- the page is worth their time.
--
-- Same shape as gold_rates: a column with a BEFORE UPDATE trigger, so the
-- timestamp comes from the database's clock rather than from whatever the
-- machine in the shop thinks the time is.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Existing rows have never been touched since insert, as far as anyone knows,
-- so created_at is the honest starting value rather than "now".
UPDATE public.products SET updated_at = created_at WHERE updated_at > created_at;

CREATE OR REPLACE FUNCTION public.touch_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_touch ON public.products;

CREATE TRIGGER products_touch
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_product();
