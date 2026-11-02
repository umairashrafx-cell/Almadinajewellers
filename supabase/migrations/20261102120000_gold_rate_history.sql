-- Keep a record of who moved the rate, and what it was before.
--
-- The daily rate is the one number every price on this site is derived from.
-- A product's listed price is metal plus making plus stones, and the metal
-- part comes straight off this table. Move the rate and the whole catalogue
-- moves with it.
--
-- Until now nothing recorded a change to it. publishRates() upserts on
-- (rate_date, karat), so correcting a rate during the day takes the UPDATE
-- path and writes over the old figure; gold_rates_touch (20260821180000)
-- stamps updated_at, which says when a row was last revised but not what it
-- used to say or who revised it. Admins may also DELETE a rate row outright.
-- And there are two people in admin_users, not one, so "the shop changed it"
-- is not an answer to "who changed it".
--
-- What this adds is one append-only table and one row trigger. The table is
-- readable by admins and by nobody else, and no API role is granted INSERT,
-- UPDATE or DELETE on it at all -- so a rate change cannot be written into it
-- falsely, and a recorded change cannot be erased, through the Data API. Only
-- the trigger writes it.
--
-- HISTORY STARTS WHEN THIS IS APPLIED. The rate rows already in the table are
-- not backfilled, deliberately. Their original figures are gone -- a row
-- corrected last week holds the corrected number -- so seeding them would
-- record today's value as though it were the one first published. An empty
-- history for an old day means "this predates the trigger", not "nobody
-- touched it".

-- ---------------------------------------------------------------------------
-- The record
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gold_rate_history (
  -- An identity column rather than a uuid, which is what the rest of the
  -- schema uses: this is a log, and reading it back in the order it was
  -- written is most of what anyone will want from it. GENERATED ALWAYS so an
  -- id cannot be supplied from outside.
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Which rate, not which row: the gold_rates row may since have been deleted,
  -- so this deliberately carries no foreign key to it.
  rate_date date NOT NULL,
  karat text NOT NULL,

  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),

  -- Null on the side that does not exist: no old figures for an insert, no new
  -- ones for a delete.
  old_per_tola_pkr integer,
  new_per_tola_pkr integer,
  old_per_gram_pkr integer,
  new_per_gram_pkr integer,

  -- Null when the change did not come from a signed-in request -- a
  -- service-role write, or a statement run in the SQL editor. That is itself
  -- worth knowing.
  changed_by uuid,
  /*
   * Copied in rather than joined on changed_by at read time. An admin who
   * leaves is removed from admin_users, and the point of this table is that
   * what it says about a past change stays said.
   */
  changed_by_email text,

  changed_at timestamptz NOT NULL DEFAULT now()
);

-- The two ways this gets read: everything about one day's board, and the last
-- few changes across all of them.
CREATE INDEX IF NOT EXISTS gold_rate_history_rate_idx
  ON public.gold_rate_history (rate_date DESC, karat);
CREATE INDEX IF NOT EXISTS gold_rate_history_changed_at_idx
  ON public.gold_rate_history (changed_at DESC);

ALTER TABLE public.gold_rate_history ENABLE ROW LEVEL SECURITY;

/*
 * Admins read it; nobody writes it.
 *
 * SELECT is the only privilege granted to any API role, so the append-only
 * property does not rest on the absence of a policy alone -- there is no
 * INSERT, UPDATE or DELETE privilege to exercise even if a policy were added
 * by mistake later. anon is given nothing: the public has no business knowing
 * the shop corrected a rate at four in the afternoon.
 */
REVOKE ALL ON public.gold_rate_history FROM anon, authenticated;
GRANT SELECT ON public.gold_rate_history TO authenticated;
GRANT ALL ON public.gold_rate_history TO service_role;

DROP POLICY IF EXISTS "Admins may read rate history" ON public.gold_rate_history;

CREATE POLICY "Admins may read rate history" ON public.gold_rate_history
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- The trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_gold_rate_change()
RETURNS trigger
LANGUAGE plpgsql
-- Definer rights because the table grants nothing to the role doing the
-- writing. The trigger is the only writer, which is the whole arrangement.
SECURITY DEFINER
-- Pinned: this runs on every rate write and must not resolve names through a
-- caller-controlled path.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_email text;
BEGIN
  /*
   * A re-publish that changed nothing is not a change.
   *
   * publishRates() sends every karat on the board in one upsert, every time.
   * The shop correcting 22K at noon therefore also rewrites 24K, 23.65K and
   * 925 with the figures they already held. Logging those would bury the one
   * row that matters under four that do not.
   */
  IF TG_OP = 'UPDATE'
     AND OLD.rate_per_tola_pkr = NEW.rate_per_tola_pkr
     AND OLD.rate_per_gram_pkr = NEW.rate_per_gram_pkr THEN
    RETURN NULL;
  END IF;

  /*
   * Who. auth.uid() reads the JWT of the request that caused the write, so it
   * is the signed-in admin for anything done through the admin panel and null
   * for a service-role write or a statement run in the dashboard. The email is
   * taken from admin_users where it can be, and from the token itself
   * otherwise -- a write by somebody signed in who is not an admin should
   * still leave a name, not a blank.
   */
  v_uid := auth.uid();

  IF v_uid IS NOT NULL THEN
    SELECT a.email INTO v_email FROM public.admin_users a WHERE a.user_id = v_uid;

    IF v_email IS NULL THEN
      v_email := nullif(btrim(coalesce(current_setting('request.jwt.claims', true), '')), '')::json ->> 'email';
    END IF;
  END IF;

  /*
   * No exception handler here, unlike the notifiers.
   *
   * notify_rates_published() swallows its failures on purpose: a notification
   * that could not be queued must never cost the shop its morning's work. An
   * audit trail is the opposite case -- one that can be skipped without anyone
   * noticing is not one, and would be worse than none, because it would be
   * believed. There is nothing in this insert that can realistically fail: no
   * foreign key, no unique constraint, and every value either computed here or
   * copied from the row being written.
   */
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.gold_rate_history (
      rate_date, karat, action,
      old_per_tola_pkr, old_per_gram_pkr,
      changed_by, changed_by_email
    ) VALUES (
      OLD.rate_date, OLD.karat, 'delete',
      OLD.rate_per_tola_pkr, OLD.rate_per_gram_pkr,
      v_uid, v_email
    );

    RETURN NULL;
  END IF;

  INSERT INTO public.gold_rate_history (
    rate_date, karat, action,
    old_per_tola_pkr, old_per_gram_pkr,
    new_per_tola_pkr, new_per_gram_pkr,
    changed_by, changed_by_email
  ) VALUES (
    NEW.rate_date, NEW.karat, lower(TG_OP),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.rate_per_tola_pkr END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.rate_per_gram_pkr END,
    NEW.rate_per_tola_pkr, NEW.rate_per_gram_pkr,
    v_uid, v_email
  );

  RETURN NULL;
END;
$$;

-- Nothing calls this but the trigger. The hardening migration took the same
-- grants off the two notifiers for the same reason: a trigger function has no
-- business on the RPC surface.
REVOKE ALL ON FUNCTION public.log_gold_rate_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS gold_rates_history ON public.gold_rates;

/*
 * Per row, where the notifiers are per statement.
 *
 * They want one notification for the whole board; this wants the before and
 * after of each karat, which only a row trigger sees. AFTER, so a rate that
 * failed its own constraints leaves no record of having been set -- and the
 * record rolls back with the change if the transaction does, which is what
 * keeps the log honest rather than merely full.
 */
CREATE TRIGGER gold_rates_history
  AFTER INSERT OR UPDATE OR DELETE ON public.gold_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.log_gold_rate_change();
