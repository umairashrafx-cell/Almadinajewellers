-- Stone weight in grams.
--
-- It was recorded in carats, which is how stones are traded but not how this
-- shop weighs a piece. Everything else on a product — net, polish, gross — is
-- in grams, and one field in a different unit is how a 15.44 gets read as
-- grams and a necklace gains three grams of gold it does not have.
--
-- The carat column stays. It is what the existing rows were entered in, the
-- generated types still reference it, and dropping a column to save a few
-- bytes is not worth the risk.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stone_weight_g numeric;

-- One carat is a fifth of a gram, which is the conversion the gross weight
-- calculation has been doing inline all along.
UPDATE public.products
SET stone_weight_g = round((stone_weight_ct * 0.2)::numeric, 3)
WHERE stone_weight_g IS NULL AND stone_weight_ct IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stone_weight_g_limit') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_stone_weight_g_limit CHECK (
      stone_weight_g IS NULL OR (stone_weight_g >= 0 AND stone_weight_g <= 5000)
    );
  END IF;
END $$;

COMMENT ON COLUMN public.products.stone_weight_g IS
  'Stone weight in grams. Part of gross weight; never part of the metal value, which is priced on net gold alone.';
COMMENT ON COLUMN public.products.stone_weight_ct IS
  'Superseded by stone_weight_g. Kept for the rows that were entered in carats.';
