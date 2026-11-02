-- Keep a record of how an order got to where it is.
--
-- An order carries a status -- new, confirmed, completed, cancelled -- that the
-- shop moves by hand from /admin/orders. setOrderStatus() does a plain UPDATE,
-- so the old value is written over and nothing anywhere records that the move
-- happened, when, or which of the two people in admin_users made it. created_at
-- says when the customer placed it and the status says where it is now; there
-- is nothing in between.
--
-- That gap is worth closing on its own: "when did this go to completed" is a
-- question the shop will eventually ask about an order a customer is standing
-- in front of asking about. It is also the half of the roadmap's "order status
-- updates" that can be built today. Telling the CUSTOMER a status changed needs
-- somewhere to send it -- an order carries a phone number and no email -- and
-- that needs a WhatsApp Business sender, which is a decision and a cost, not
-- code. This records the event. Whatever eventually sends the message reads it
-- from here rather than racing the UPDATE that caused it.
--
-- The shape follows gold_rate_history (20261102120000) closely and for the same
-- reasons, so the two read alike: one append-only table, one row trigger, admin
-- read and nobody write.
--
-- HISTORY STARTS WHEN THIS IS APPLIED. Orders already in the table are not
-- backfilled. Their earlier statuses are gone -- the column holds only where
-- each one got to -- so seeding them would record today's status as though it
-- were the one it was placed with. An empty trail on an old order means "this
-- predates the trigger", not "nobody touched it".

-- ---------------------------------------------------------------------------
-- The record
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_status_history (
  -- An identity column rather than a uuid, as in gold_rate_history: this is a
  -- log, and reading it back in the order it was written is most of what
  -- anyone wants from it. GENERATED ALWAYS so an id cannot come from outside.
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Which order. No foreign key, deliberately, for the reason the rate history
  -- carries none: the point of the table is that what it says about a past
  -- change stays said, and a row that disappears with the thing it describes
  -- is not a record of it. Orders have no DELETE policy, so this cannot happen
  -- through the Data API at all -- but service_role and the SQL editor are not
  -- bound by policies, and an audit trail should not depend on nobody ever
  -- reaching for them.
  order_id uuid NOT NULL,

  -- Copied in rather than joined at read time, for the same reason, and
  -- because the reference is what the shop and the customer both say out loud.
  reference text NOT NULL,

  -- 'placed' is the order arriving, 'changed' is the shop moving it. Said in
  -- the shop's words rather than the trigger's: INSERT and UPDATE are how it
  -- happens, not what happened.
  action text NOT NULL CHECK (action IN ('placed', 'changed')),

  -- Null on 'placed'. There was no status before the order existed, and that
  -- is different from not knowing what it was.
  old_status text,
  new_status text NOT NULL,

  -- Null when the change did not come from a signed-in request. Two cases, and
  -- both are worth being able to tell apart from an admin: the customer
  -- placing the order, who is anonymous by design, and a service-role write or
  -- a statement run in the dashboard.
  changed_by uuid,
  /*
   * Copied in rather than joined on changed_by at read time. An admin who
   * leaves is removed from admin_users, and this table's job is to still say
   * who moved an order last March.
   */
  changed_by_email text,

  changed_at timestamptz NOT NULL DEFAULT now()
);

-- The two ways this gets read: the trail of one order, and the last few
-- changes across all of them.
CREATE INDEX IF NOT EXISTS order_status_history_order_idx
  ON public.order_status_history (order_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS order_status_history_changed_at_idx
  ON public.order_status_history (changed_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

/*
 * Admins read it; nobody writes it.
 *
 * SELECT is the only privilege granted to any API role, so the append-only
 * property does not rest on the absence of a policy alone -- there is no
 * INSERT, UPDATE or DELETE privilege to exercise even if a policy were added
 * by mistake later. anon is given nothing, and here that matters more than it
 * does for rates: these rows carry an order reference, and orders themselves
 * are admin-read-only precisely so that a stranger cannot walk them.
 */
REVOKE ALL ON public.order_status_history FROM anon, authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;

DROP POLICY IF EXISTS "Admins may read order status history" ON public.order_status_history;

CREATE POLICY "Admins may read order status history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- The trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
-- Definer rights because the table grants nothing to the role doing the
-- writing -- not to the admin updating the order, and not to the anonymous
-- caller whose place_order() inserted it. The trigger is the only writer.
SECURITY DEFINER
-- Pinned: this runs on every order write and must not resolve names through a
-- caller-controlled search path.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_email text;
BEGIN
  -- An update that left the status alone is not a status change. The shop can
  -- edit an order's notes without that belonging in a trail of where it got to.
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NULL;
  END IF;

  /*
   * Who. auth.uid() reads the JWT of the request that caused the write, so it
   * is the signed-in admin for anything done through the admin panel, and null
   * for the customer placing the order -- they have no account and are not
   * meant to. The email is taken from admin_users where it can be, and from
   * the token itself otherwise, so a write by somebody signed in who is not an
   * admin still leaves a name rather than a blank.
   */
  v_uid := auth.uid();

  IF v_uid IS NOT NULL THEN
    SELECT a.email INTO v_email FROM public.admin_users a WHERE a.user_id = v_uid;

    IF v_email IS NULL THEN
      v_email := nullif(btrim(coalesce(current_setting('request.jwt.claims', true), '')), '')::json ->> 'email';
    END IF;
  END IF;

  /*
   * No exception handler, the same decision gold_rate_history made and for the
   * same reason. The notifiers swallow their failures on purpose, because a
   * notification that could not be queued must never cost a customer their
   * order. An audit trail is the opposite case: one that can be skipped
   * without anyone noticing is worse than none, because it would be believed.
   * There is nothing here that can realistically fail -- no foreign key, no
   * unique constraint, every value either computed here or copied off the row
   * being written.
   */
  INSERT INTO public.order_status_history (
    order_id, reference, action,
    old_status, new_status,
    changed_by, changed_by_email
  ) VALUES (
    NEW.id,
    NEW.reference,
    CASE WHEN TG_OP = 'INSERT' THEN 'placed' ELSE 'changed' END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
    NEW.status,
    v_uid, v_email
  );

  RETURN NULL;
END $$;

-- Nothing calls this but the trigger. The hardening migration took the same
-- grants off the two notifiers for the same reason: a trigger function has no
-- business on the RPC surface.
REVOKE ALL ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_status_history ON public.orders;

/*
 * Per row, and AFTER.
 *
 * Per row because the before and after of one order is the whole point, and
 * only a row trigger sees it. AFTER so an order that failed its own
 * constraints leaves no record of having been placed, and so the record rolls
 * back with the change if the transaction does -- which is what keeps the log
 * honest rather than merely full.
 *
 * No DELETE. Orders carry no DELETE policy, so one cannot be removed through
 * the Data API, and a deleted order has not had its status changed -- it has
 * been destroyed, which is a different event and not one this table claims to
 * record.
 */
CREATE TRIGGER orders_status_history
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();
