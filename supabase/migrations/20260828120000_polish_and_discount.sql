-- Polish, and a discount in rupees.
--
-- Two things the shop works in that the form did not have.
--
-- Polish is quoted per tola of net metal — "two grams per tola" — and is what
-- separates net metal weight from the gross weight on the bill. Gross has been
-- typed by hand until now, which let the three numbers disagree.
--
--     gross = net + stones + (net / tola) x polish
--
-- That is not a new rule; it is the one already in the data. Backing polish out
-- of the existing rows reproduces every stored gross weight to within 3e-17, so
-- nothing is re-weighed by adding the column.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS polish_g_per_tola numeric,
  ADD COLUMN IF NOT EXISTS discount_pkr integer;

-- 11.6638 g to the tola, the same constant the site prices with.
-- Clamped at zero. Thirteen of the seeded rows come out fractionally negative
-- — the worst is -0.011 g per tola — because their gross was rounded to two
-- decimals when the catalogue was first loaded. A negative polish is not a real
-- quantity, so it is read as none.
UPDATE public.products
SET polish_g_per_tola = greatest(0, round(
      ((gross_weight_g - net_weight_g - coalesce(stone_weight_ct, 0) * 0.2)
       / (net_weight_g / 11.6638))::numeric, 4))
WHERE polish_g_per_tola IS NULL
  AND net_weight_g IS NOT NULL
  AND net_weight_g > 0;

-- Sale prices were an absolute figure; the shop thinks in "ten thousand off".
UPDATE public.products
SET discount_pkr = price_pkr - sale_price_pkr
WHERE discount_pkr IS NULL AND sale_price_pkr IS NOT NULL AND sale_price_pkr < price_pkr;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_polish_discount_limits') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_polish_discount_limits CHECK (
      -- A negative polish would mean the gross weighs less than the metal in it.
      (polish_g_per_tola IS NULL OR (polish_g_per_tola >= 0 AND polish_g_per_tola <= 50))
      -- A discount at or above the price is a giveaway, and almost always a typo.
      AND (discount_pkr IS NULL OR (discount_pkr >= 0 AND discount_pkr < price_pkr))
    );
  END IF;
END $$;

COMMENT ON COLUMN public.products.polish_g_per_tola IS
  'Grams of polish per tola of net metal. gross = net + stones + (net/11.6638)*polish.';
COMMENT ON COLUMN public.products.discount_pkr IS
  'Rupees off the listed price. sale_price_pkr is kept in step with it.';
