-- Track when a rate was last revised, not only when it was first created.
--
-- publishRates() upserts on (rate_date, karat), so republishing during the day
-- takes the UPDATE path. A column default only fires on INSERT, which means
-- created_at kept the moment the day's first rate was saved no matter how many
-- times the figures were corrected afterwards.
--
-- The website stamps the rate table with that timestamp, so the page could show
-- "Updated 12:12 pm" while quoting a rate the shop had revised at four in the
-- afternoon. For a jeweller whose prices now move with that rate, publishing a
-- correction and having the site still claim the morning's time is worse than
-- showing no time at all.

ALTER TABLE public.gold_rates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Existing rows: created_at is the only evidence we have of when they were set,
-- and it is the honest floor. Adding the column defaulted every row to the
-- moment this migration ran, which would claim every historic rate was revised
-- today. The next publish writes a real value.
UPDATE public.gold_rates SET updated_at = created_at;

CREATE OR REPLACE FUNCTION public.touch_gold_rate()
RETURNS trigger
LANGUAGE plpgsql
-- Pinned search_path: this runs on every rate write and must not resolve names
-- through a caller-controlled path.
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gold_rates_touch ON public.gold_rates;

-- Server-side rather than sent from the browser: the timestamp on a published
-- price should come from the database's clock, not from whatever time the
-- machine in the shop happens to think it is.
CREATE TRIGGER gold_rates_touch
  BEFORE UPDATE ON public.gold_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_gold_rate();
