-- Product detail page support + gold rate corrections.
--
-- Three things happen here:
--   1. gold_rates is brought fully under migration control. The table already
--      exists in the live project (created outside this folder), so every
--      statement below is written to be safe against that.
--   2. products gains the fields the detail page needs, including a three-part
--      price decomposition (metal + making + stones) that always sums to the
--      listed price. That panel is the trust builder in this market, so the
--      arithmetic has to survive a customer checking it on a calculator.
--   3. Pieces whose listed price sat below their own metal value are lifted to a
--      12% making floor. Roughly half the seeded catalogue was in that state.

-- ---------------------------------------------------------------------------
-- Gold rates
-- ---------------------------------------------------------------------------

-- karat holds '24K'/'22K'/'21K'/'18K' for gold and '925' for sterling silver,
-- so every product has a metal rate to price against. The public rate table
-- shows only the gold rows.
CREATE TABLE IF NOT EXISTS public.gold_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date date NOT NULL,
  karat text NOT NULL,
  rate_per_gram_pkr integer NOT NULL,
  rate_per_tola_pkr integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gold_rates_date_idx ON public.gold_rates (rate_date DESC);

-- One row per karat per day.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gold_rates_rate_date_karat_key'
  ) THEN
    ALTER TABLE public.gold_rates
      ADD CONSTRAINT gold_rates_rate_date_karat_key UNIQUE (rate_date, karat);
  END IF;
END $$;

GRANT SELECT ON public.gold_rates TO anon, authenticated;
GRANT ALL ON public.gold_rates TO service_role;
ALTER TABLE public.gold_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gold_rates'
      AND policyname = 'Gold rates are publicly readable'
  ) THEN
    CREATE POLICY "Gold rates are publicly readable" ON public.gold_rates
      FOR SELECT USING (true);
  END IF;
END $$;

-- The 24K per-tola figure is inconsistent with its own per-gram rate:
-- 27,850 × 11.6638 = 324,837, not 445,000. Every other karat already agrees
-- with its per-gram rate, so the per-tola value is the one at fault.
UPDATE public.gold_rates
SET rate_per_tola_pkr = round(rate_per_gram_pkr * 11.6638)
WHERE karat = '24K'
  AND rate_per_tola_pkr <> round(rate_per_gram_pkr * 11.6638);

-- Sterling silver rate, needed so silver pieces can be valued too. Added
-- against the most recent published day rather than today, so it joins the
-- rates already in the table.
INSERT INTO public.gold_rates (rate_date, karat, rate_per_gram_pkr, rate_per_tola_pkr)
SELECT max(rate_date), '925', 345, round(345 * 11.6638)
FROM public.gold_rates
WHERE EXISTS (SELECT 1 FROM public.gold_rates)
ON CONFLICT (rate_date, karat) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Product detail fields
-- ---------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS net_weight_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS stone_weight_ct numeric(10,2),
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metal_value_pkr integer,
  ADD COLUMN IF NOT EXISTS making_charges_pkr integer,
  ADD COLUMN IF NOT EXISTS stone_value_pkr integer,
  ADD COLUMN IF NOT EXISTS rate_basis_pkr_per_g integer;

-- Physical specs, copy, and the rate this piece is priced against. Joined on
-- the latest published rates, which are not necessarily today's.
UPDATE public.products p SET
  net_weight_g = round(p.gross_weight_g * CASE WHEN p.stones IN ('Plain polished gold', 'Hand-engraved, no stones') THEN 1.0 ELSE 0.94 END, 2),
  stone_weight_ct = CASE
    WHEN p.stones = 'Certified Diamond 0.32 ct' THEN 0.32
    WHEN p.stones IN ('Plain polished gold', 'Hand-engraved, no stones') THEN NULL
    ELSE round(p.gross_weight_g * 0.06 * 5, 2)
  END,
  rate_basis_pkr_per_g = r.rate_per_gram_pkr,
  dimensions = CASE p.category_slug
    WHEN 'bridal-sets' THEN 'Necklace 18 cm drop · Earrings 5.2 cm · Tikka 6 cm'
    WHEN 'gold-bangles' THEN 'Inner diameter 6.4 cm · Width 12 mm'
    WHEN 'rings' THEN 'Band width 4 mm'
    WHEN 'earrings' THEN 'Drop 4.8 cm · Width 2.2 cm'
    WHEN 'lockets-chains' THEN 'Pendant 2.6 cm · Chain 46 cm'
    ELSE 'Adjustable'
  END,
  sizes = CASE WHEN p.category_slug = 'rings' THEN ARRAY['12','14','16','18','20','22','24'] ELSE '{}'::text[] END,
  description = CASE p.category_slug
    WHEN 'bridal-sets' THEN 'A complete bridal suite from our own workshop — necklace, earrings and tikka, finished by hand and hallmarked before it leaves the counter.'
    WHEN 'gold-bangles' THEN 'Hand-finished karay made to be worn, not stored. The gold is hallmarked and the weight is checked in front of you.'
    WHEN 'rings' THEN 'An everyday ring, finished by hand in the workshop. Sizing is adjusted in store at no charge.'
    WHEN 'earrings' THEN 'Light enough to wear all day, detailed enough for the occasion. Posts and clasps are checked by hand before dispatch.'
    WHEN 'lockets-chains' THEN 'A locket for keeping. Hallmarked gold, hand-polished, and the kind of piece that gets worn for years.'
    ELSE '925 sterling silver, properly stamped and hand-finished. Made for daily wear.'
  END || ' Finished in ' || p.karat || CASE p.metal WHEN 'silver' THEN ' sterling silver' ELSE ' gold' END
    || ' at ' || to_char(p.gross_weight_g, 'FM999990.00') || ' g gross, ' || lower(p.stones) || '.'
FROM public.gold_rates r
WHERE r.karat = p.karat
  AND r.rate_date = (SELECT max(rate_date) FROM public.gold_rates);

-- Metal value at the basis rate, and stone value at trade per-carat figures.
UPDATE public.products SET
  metal_value_pkr = round(net_weight_g * rate_basis_pkr_per_g),
  stone_value_pkr = round(coalesce(stone_weight_ct, 0) * CASE stones
    WHEN 'Certified Diamond 0.32 ct' THEN 180000
    WHEN 'Emerald & Pearl' THEN 3500
    WHEN 'Kundan & Pearl' THEN 2500
    WHEN 'Pearl drop' THEN 1800
    WHEN 'Meenakari, Zircon & Pearl' THEN 1500
    WHEN 'Ruby & Zircon' THEN 1200
    WHEN 'Cubic zircon' THEN 600
    ELSE 0
  END)
WHERE net_weight_g IS NOT NULL AND rate_basis_pkr_per_g IS NOT NULL;

-- Making charges are the remainder of the listed price, which keeps the shop's
-- own pricing intact. Where the listed price sat below metal + stone value the
-- piece was priced under its own melt value, so the price is lifted to a 12%
-- making floor instead. Sale prices keep their original discount.
UPDATE public.products p SET
  price_pkr = n.new_price,
  sale_price_pkr = CASE
    WHEN p.sale_price_pkr IS NOT NULL
      THEN (round(n.new_price * (p.sale_price_pkr::numeric / p.price_pkr) / 1000) * 1000)::int
    ELSE NULL
  END
FROM (
  SELECT id,
    (round((metal_value_pkr
            + greatest(price_pkr - metal_value_pkr - stone_value_pkr, round(metal_value_pkr * 0.12))
            + stone_value_pkr) / 1000.0) * 1000)::int AS new_price
  FROM public.products
  WHERE metal_value_pkr IS NOT NULL AND stone_value_pkr IS NOT NULL
) n
WHERE n.id = p.id;

-- Making charges absorb the rounding, so the three parts always sum to the
-- listed price exactly.
UPDATE public.products SET
  making_charges_pkr = price_pkr - metal_value_pkr - stone_value_pkr
WHERE metal_value_pkr IS NOT NULL AND stone_value_pkr IS NOT NULL;

-- The detail page only renders the breakdown when all three parts are present,
-- so the invariant is enforced on that same condition.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_price_parts_sum'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT products_price_parts_sum CHECK (
      metal_value_pkr IS NULL
      OR making_charges_pkr IS NULL
      OR stone_value_pkr IS NULL
      OR metal_value_pkr + making_charges_pkr + stone_value_pkr = price_pkr
    );
  END IF;
END $$;
