-- Placing an order, and getting its reference back.
--
-- The cart needs two things that pull in opposite directions: the customer must
-- be told their reference number, and the public must not be able to read the
-- orders table — it holds names, phone numbers and shopping lists, and the anon
-- key is published in the page source.
--
-- A plain `INSERT ... RETURNING reference` cannot do both. RETURNING requires
-- SELECT privilege on the column and a SELECT policy that admits the new row,
-- so satisfying it would mean opening reads to anon and relying on the policy
-- alone to close them again. Routing the insert through a SECURITY DEFINER
-- function keeps anon with no SELECT on the table at all, and returns exactly
-- one column: the reference belonging to the row the caller just created.

CREATE OR REPLACE FUNCTION public.place_order(
  p_name text,
  p_phone text,
  p_city text,
  p_notes text,
  p_items jsonb,
  p_item_count integer,
  p_total_pkr integer,
  p_rate_basis jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- Definer rights make an unqualified name a privilege escalation route.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reference text;
BEGIN
  -- Definer rights bypass RLS, so the WITH CHECK on the insert policy no longer
  -- applies. status is pinned here instead: a caller cannot file an order that
  -- is already confirmed. Every other limit is a table CHECK constraint, which
  -- applies to definer and invoker alike.
  INSERT INTO public.orders (name, phone, city, notes, items, item_count, total_pkr, rate_basis, status)
  VALUES (
    btrim(p_name),
    btrim(p_phone),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_items,
    p_item_count,
    p_total_pkr,
    p_rate_basis,
    'new'
  )
  RETURNING reference INTO v_reference;

  RETURN v_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, jsonb, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, jsonb, integer, integer, jsonb)
  TO anon, authenticated;
