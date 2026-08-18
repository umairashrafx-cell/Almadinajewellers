-- Product detail page support + rate rebasing.
--
-- Four things happen here:
--   1. gold_rates is brought under migration control. The table already exists
--      in the live project (created outside this folder), so every statement is
--      written to be safe against that.
--   2. Per-tola is treated as the authoritative rate. 24K and 22K were updated
--      to real market figures (450,000 and 412,500 per tola, exactly in purity
--      ratio with each other) while 21K and 18K were left at stale values, and
--      every per-gram figure was left behind entirely. All four karats are now
--      derived from the 24K per-tola anchor by purity ratio, and per-gram is
--      derived from per-tola. 1 tola = 11.6638 g.
--   3. products gains the fields the detail page needs, including a three-part
--      price decomposition (metal + making + stones) that always sums to the
--      listed price. That panel is the trust builder in this market, so the
--      arithmetic has to survive a customer checking it on a calculator.
--   4. The catalogue is rebased onto the corrected rates. Each piece keeps the
--      making percentage its listed price implied, floored at 12% for the pieces
--      that were priced below their own metal value. Gold pieces rise 33-110%;
--      silver is unaffected because the silver rate does not change.

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

-- Sterling silver rate, needed so silver pieces can be valued too. Inserted
-- before the products backfill so silver rows are not skipped. Silver is quoted
-- per gram in practice; the per-tola figure is filled in for consistency.
INSERT INTO public.gold_rates (rate_date, karat, rate_per_gram_pkr, rate_per_tola_pkr)
SELECT max(rate_date), '925', 345, round(345 * 11.6638)
FROM public.gold_rates
HAVING max(rate_date) IS NOT NULL
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

-- Physical specs and copy. Stone-set pieces lose ~6% of gross weight to
-- stones; 1 g = 5 ct.
UPDATE public.products p SET
  net_weight_g = round(p.gross_weight_g * CASE WHEN p.stones IN ('Plain polished gold', 'Hand-engraved, no stones') THEN 1.0 ELSE 0.94 END, 2),
  stone_weight_ct = CASE
    WHEN p.stones = 'Certified Diamond 0.32 ct' THEN 0.32
    WHEN p.stones IN ('Plain polished gold', 'Hand-engraved, no stones') THEN NULL
    ELSE round(p.gross_weight_g * 0.06 * 5, 2)
  END,
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
    || ' at ' || to_char(p.gross_weight_g, 'FM999990.00') || ' g gross, ' || lower(p.stones) || '.';

-- Stone value at trade per-carat figures. Independent of the metal rate.
UPDATE public.products SET
  stone_value_pkr = round(coalesce(stone_weight_ct, 0) * CASE stones
    WHEN 'Certified Diamond 0.32 ct' THEN 180000
    WHEN 'Emerald & Pearl' THEN 3500
    WHEN 'Kundan & Pearl' THEN 2500
    WHEN 'Pearl drop' THEN 1800
    WHEN 'Meenakari, Zircon & Pearl' THEN 1500
    WHEN 'Ruby & Zircon' THEN 1200
    WHEN 'Cubic zircon' THEN 600
    ELSE 0
  END);

-- Metal value and making charges at the PRE-correction rates, so each piece's
-- implied making percentage can be read off its current listed price. Making is
-- floored at 12% of metal for pieces listed below their own metal value.
UPDATE public.products p SET
  rate_basis_pkr_per_g = r.rate_per_gram_pkr,
  metal_value_pkr = round(p.net_weight_g * r.rate_per_gram_pkr),
  making_charges_pkr = greatest(
    p.price_pkr - round(p.net_weight_g * r.rate_per_gram_pkr) - p.stone_value_pkr,
    round(round(p.net_weight_g * r.rate_per_gram_pkr) * 0.12)
  )
FROM public.gold_rates r
WHERE r.karat = p.karat
  AND r.rate_date = (SELECT max(rate_date) FROM public.gold_rates);

-- ---------------------------------------------------------------------------
-- Rate correction: per-tola is authoritative
-- ---------------------------------------------------------------------------

-- All four karats derive from the 24K per-tola anchor by purity ratio, and
-- per-gram derives from per-tola. 22K already agrees with the anchor, so it is
-- unchanged; 21K and 18K are lifted off their stale values.
UPDATE public.gold_rates g SET
  rate_per_tola_pkr = t.tola,
  rate_per_gram_pkr = round(t.tola / 11.6638)
FROM (
  SELECT g2.id,
    round(
      a.tola24 * (CASE g2.karat WHEN '24K' THEN 24 WHEN '22K' THEN 22 WHEN '21K' THEN 21 WHEN '18K' THEN 18 END)::numeric / 24
    ) AS tola
  FROM public.gold_rates g2
  CROSS JOIN (
    SELECT rate_date, rate_per_tola_pkr AS tola24
    FROM public.gold_rates
    WHERE karat = '24K'
    ORDER BY rate_date DESC
    LIMIT 1
  ) a
  WHERE g2.rate_date = a.rate_date
    AND g2.karat IN ('24K', '22K', '21K', '18K')
) t
WHERE t.id = g.id;

-- ---------------------------------------------------------------------------
-- Rebase the catalogue onto the corrected rates
-- ---------------------------------------------------------------------------

-- Each piece keeps the making percentage it implied before, applied to its new
-- metal value. Sale prices keep their original discount.
UPDATE public.products p SET
  rate_basis_pkr_per_g = n.new_rate,
  metal_value_pkr = n.new_metal,
  price_pkr = n.new_price,
  sale_price_pkr = CASE
    WHEN p.sale_price_pkr IS NOT NULL
      THEN (round(n.new_price * (p.sale_price_pkr::numeric / p.price_pkr) / 1000) * 1000)::int
    ELSE NULL
  END
FROM (
  SELECT p2.id,
    r.rate_per_gram_pkr AS new_rate,
    round(p2.net_weight_g * r.rate_per_gram_pkr)::int AS new_metal,
    greatest(
      (round(
        (round(p2.net_weight_g * r.rate_per_gram_pkr)
          * (1 + p2.making_charges_pkr::numeric / p2.metal_value_pkr)
          + p2.stone_value_pkr) / 1000
      ) * 1000)::int,
      1000
    ) AS new_price
  FROM public.products p2
  JOIN public.gold_rates r
    ON r.karat = p2.karat
   AND r.rate_date = (SELECT max(rate_date) FROM public.gold_rates)
  WHERE p2.metal_value_pkr IS NOT NULL
    AND p2.metal_value_pkr > 0
    AND p2.making_charges_pkr IS NOT NULL
    AND p2.stone_value_pkr IS NOT NULL
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
