-- Paying for an order through Easypaisa, after the shop has agreed the price.
--
-- The shop's rule is unchanged and this is built around it: nothing is paid
-- until the piece has been seen, weighed and priced against the day's rate.
-- So there is no checkout from the bag. An order arrives as it always did,
-- the conversation happens on WhatsApp, and only when the shop has agreed a
-- figure does it issue a pay link for that exact amount.
--
-- Three things here exist to make that safe:
--
--   orders.amount_due_pkr  what was agreed, which is not always what was
--                          quoted — the quote is rebuilt from the day's rate
--                          and the real weight is known only at the counter.
--                          Every amount sent to Easypaisa is read from this
--                          column server-side. None is ever taken from the
--                          browser.
--
--   orders.pay_token       the pay page is public, so it cannot be addressed
--                          by reference: AMJ-2611-0042 is sequential, and
--                          anyone could walk the series and read other
--                          people's orders. The token is random and the
--                          reference stays for humans to quote on the phone.
--
--   payments               one row per attempt, holding the provider's own
--                          answer. An order is marked paid from here, never
--                          from a browser redirect, which a customer can
--                          replay or edit.

-- An order can now be waiting for money, or have had it.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_field_limits;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_due_pkr integer,
  ADD COLUMN IF NOT EXISTS pay_token text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_pay_token_key
  ON public.orders (pay_token) WHERE pay_token IS NOT NULL;

ALTER TABLE public.orders ADD CONSTRAINT orders_field_limits CHECK (
  status IN ('new', 'confirmed', 'awaiting_payment', 'paid', 'completed', 'cancelled')
  AND length(btrim(name)) BETWEEN 2 AND 80
  AND length(btrim(phone)) BETWEEN 7 AND 25
  AND (city IS NULL OR length(city) <= 60)
  AND (notes IS NULL OR length(notes) <= 1000)
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) BETWEEN 1 AND 40
  AND item_count BETWEEN 1 AND 200
  AND total_pkr BETWEEN 0 AND 2000000000
  -- Nobody is asked for a figure the shop did not set.
  AND (amount_due_pkr IS NULL OR amount_due_pkr BETWEEN 1 AND 2000000000)
  -- Long enough that guessing one is not worth anyone's afternoon.
  AND (pay_token IS NULL OR length(pay_token) BETWEEN 24 AND 64)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'easypaisa',
  /* Copied from the order when the attempt starts, so a later re-quote cannot
     change what this attempt was for. */
  amount_pkr integer NOT NULL,
  /* Sent as orderRefNum. Unique per attempt: Easypaisa refuses a reference it
     has already seen, so a customer who abandons a payment and comes back
     needs a new one. */
  attempt_ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  auth_token text,
  /* Whatever the provider calls the money it moved, for reconciliation. */
  provider_txn_ref text,
  response_code text,
  response_desc text,
  /* The provider's answer as it arrived. Kept because a dispute is argued
     from what they said, not from our reading of it. */
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CONSTRAINT payments_field_limits CHECK (
    provider IN ('easypaisa')
    AND status IN ('pending', 'paid', 'failed', 'expired')
    AND amount_pkr BETWEEN 1 AND 2000000000
    AND length(attempt_ref) BETWEEN 6 AND 40
  )
);

CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_open_idx ON public.payments (created_at DESC)
  WHERE status = 'pending';

-- Money. Nobody reads this through the API but the shop.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;

DROP POLICY IF EXISTS "Admins may read payments" ON public.payments;
CREATE POLICY "Admins may read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_admin());

/*
 * The shop agrees a figure and gets back a link.
 *
 * Issuing a second link for the same order returns the same token, so a link
 * already sent on WhatsApp keeps working; the amount is updated, because a
 * re-quote is exactly why the shop would do this twice.
 */
CREATE OR REPLACE FUNCTION public.issue_payment_link(
  p_order_id uuid,
  p_amount_pkr integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the shop can issue a payment link';
  END IF;

  IF p_amount_pkr IS NULL OR p_amount_pkr < 1 THEN
    RAISE EXCEPTION 'A payment link needs an amount';
  END IF;

  UPDATE public.orders
     SET amount_due_pkr = p_amount_pkr,
         pay_token = COALESCE(pay_token, encode(gen_random_bytes(18), 'hex')),
         status = CASE WHEN status IN ('paid', 'completed', 'cancelled')
                       THEN status ELSE 'awaiting_payment' END
   WHERE id = p_order_id
   RETURNING pay_token INTO v_token;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'No such order';
  END IF;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_payment_link(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.issue_payment_link(uuid, integer) TO authenticated;

/*
 * What the pay page may show.
 *
 * Deliberately not the order row. The customer needs to recognise what they
 * are paying for and see the figure; they do not need their own phone number
 * read back to them by a URL that anyone holding the link can open.
 */
CREATE OR REPLACE FUNCTION public.payment_intent(p_token text)
RETURNS TABLE (
  reference text,
  amount_pkr integer,
  status text,
  item_count integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT o.reference,
         o.amount_due_pkr,
         o.status,
         o.item_count,
         /* Names and quantities only: enough to recognise the order. */
         (SELECT jsonb_agg(jsonb_build_object('name', i->>'name', 'quantity', i->'quantity'))
            FROM jsonb_array_elements(o.items) AS i)
    FROM public.orders o
   WHERE o.pay_token = p_token
     AND o.amount_due_pkr IS NOT NULL
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.payment_intent(text) FROM public;
GRANT EXECUTE ON FUNCTION public.payment_intent(text) TO anon, authenticated;

COMMENT ON TABLE public.payments IS
  'One row per Easypaisa attempt. An order is marked paid from a confirmed row here, never from a browser redirect.';
