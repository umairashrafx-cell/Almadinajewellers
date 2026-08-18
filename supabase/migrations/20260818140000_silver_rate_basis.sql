-- Rebase silver pieces onto the published 925 rate.
--
-- The 925 row was inserted at Rs. 345/g by the previous migration and has since
-- been updated to Rs. 600/g, which left silver products valued against the old
-- figure while the rate table published the new one.
--
-- Unlike gold, silver retail is labour-dominated rather than metal-dominated: a
-- 7 g silver cuff holds a few thousand rupees of metal in a twenty-thousand
-- rupee piece. So the listed prices stand as merchandised and the making charge
-- absorbs the difference, rather than the price moving with the metal.
UPDATE public.products p SET
  rate_basis_pkr_per_g = r.rate_per_gram_pkr,
  metal_value_pkr = round(p.net_weight_g * r.rate_per_gram_pkr),
  making_charges_pkr = p.price_pkr - round(p.net_weight_g * r.rate_per_gram_pkr) - p.stone_value_pkr
FROM public.gold_rates r
WHERE r.karat = '925'
  AND p.karat = '925'
  AND r.rate_date = (SELECT max(rate_date) FROM public.gold_rates)
  AND p.net_weight_g IS NOT NULL
  AND p.stone_value_pkr IS NOT NULL
  AND r.rate_per_gram_pkr <> p.rate_basis_pkr_per_g
  -- Never leave a negative making charge behind. At Rs. 600/g every current
  -- silver piece clears this comfortably; the guard is for future rate rises.
  AND p.price_pkr > round(p.net_weight_g * r.rate_per_gram_pkr) + p.stone_value_pkr;
