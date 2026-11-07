-- Appointments: somebody telling the shop when they are coming in.
--
-- Until now this rode on `enquiries` as a 'callback' row with the day written
-- into the subject line. That was the right thing to do while nothing had ever
-- been submitted -- a table nobody writes to is a table nobody maintains --
-- but it cannot answer the one question the shop actually has, which is "who
-- is coming on Saturday". A text subject does not sort into a diary.
--
-- Four things here that the enquiries row could not do:
--
--   * the day is a date and the window is its own column, so a day's visits
--     can be counted and listed in order;
--   * the status is the life of a booking rather than a handled flag --
--     requested, confirmed, cancelled, came, missed;
--   * what the shop AGREED is kept apart from what the customer ASKED for, so
--     a booking moved on the phone still remembers the original. A customer
--     who rings back saying "but I said Tuesday" is then right or wrong on the
--     record rather than on somebody's memory;
--   * a reference, which is what the shop quotes back.
--
-- WHAT THIS STILL DOES NOT DO: it does not confirm anything. Nothing in this
-- schema knows whether the shop is free, so every booking starts as a request
-- and a person agrees it on the phone. The app's wording says so and must go
-- on saying so. Capacity per window is deliberately not capped here either --
-- the shop has never said how many people it can see at once, and a number
-- invented in a migration would start turning real customers away. The admin
-- screen shows the count per window instead and lets the shop judge.
--
-- Additive: nothing is dropped, altered or backfilled, and the enquiries table
-- is untouched. Any 'callback' rows already filed there stay exactly as they
-- are and go on showing in the enquiries list.

CREATE SEQUENCE IF NOT EXISTS public.appointments_reference_seq;

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /* V for visit: AMJ-O- is an order and AMJ-C- a custom order. */
  reference text NOT NULL UNIQUE DEFAULT (
    'AMJ-V-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYMM') || '-' ||
    lpad(nextval('public.appointments_reference_seq')::text, 4, '0')
  ),
  name text NOT NULL,
  phone text NOT NULL,
  /* What was asked for. Never rewritten; see agreed_day below. */
  day date NOT NULL,
  /*
   * The window, as the customer was shown it.
   *
   * Stored as the label rather than as a time range or an enum, and not
   * checked against a list of allowed windows, on purpose. The shop's windows
   * live in the app's copy; if the database also held them, a day when the app
   * ships a new window before the migration lands is a day when every booking
   * fails for everybody. A window the shop does not recognise is a visible
   * oddity in the diary, which is a far cheaper failure.
   */
  slot text NOT NULL,
  /* Why they are coming, so the right tray is out. Optional. */
  reason text,
  message text,
  status text NOT NULL DEFAULT 'requested',
  /* What was settled on the phone, when it is not what was asked for. */
  agreed_day date,
  agreed_slot text,
  /* The shop's own line: "bringing her mother", "wants the 22K set out". */
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* The diary: everything on a day, in the order it will happen. */
CREATE INDEX IF NOT EXISTS appointments_when_idx
  ON public.appointments (coalesce(agreed_day, day), slot);
/* The morning's work: what nobody has rung back about yet. */
CREATE INDEX IF NOT EXISTS appointments_open_idx
  ON public.appointments (created_at DESC)
  WHERE status = 'requested';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_limits') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_limits CHECK (
      status IN ('requested', 'confirmed', 'cancelled', 'came', 'missed')
      AND length(btrim(name)) BETWEEN 2 AND 80
      AND length(btrim(phone)) BETWEEN 7 AND 25
      AND length(btrim(slot)) BETWEEN 1 AND 40
      AND (reason IS NULL OR length(reason) <= 60)
      AND (message IS NULL OR length(message) <= 1000)
      AND (agreed_slot IS NULL OR length(btrim(agreed_slot)) BETWEEN 1 AND 40)
      AND (note IS NULL OR length(note) <= 500)
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
--
-- The same shape as custom_orders: nothing readable by the public at all, and
-- writing done through a definer function rather than an INSERT grant. These
-- rows are strangers' names, phone numbers and whereabouts on a given
-- afternoon, which is a list worth rather more to the wrong person than a
-- product catalogue is.

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.appointments FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT USAGE ON SEQUENCE public.appointments_reference_seq TO anon, authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='appointments' AND policyname='Admins may read appointments') THEN
    CREATE POLICY "Admins may read appointments" ON public.appointments
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='appointments' AND policyname='Admins may update appointments') THEN
    CREATE POLICY "Admins may update appointments" ON public.appointments
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='appointments' AND policyname='Admins may delete appointments') THEN
    CREATE POLICY "Admins may delete appointments" ON public.appointments
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

/*
 * Asking for a time.
 *
 * The three refusals here are the same three the app's schema makes, said
 * again on this side of the wire. Not belt and braces for its own sake: the
 * app's copy of the rule is what gives somebody a useful message under the
 * field, and this copy is what makes the rule true. A request that does not
 * come from the app has no validation at all otherwise, and a Friday booking
 * filed by a script sends somebody to a closed shop.
 *
 * Friday is read in Asia/Karachi. The day arrives as a date with no timezone
 * and a server thinking in UTC is five hours behind the shop; close enough to
 * midnight, that is a different day of the week.
 */
CREATE OR REPLACE FUNCTION public.request_appointment(
  p_name text,
  p_phone text,
  p_day date,
  p_slot text,
  p_reason text,
  p_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Karachi')::date;
  v_reference text;
BEGIN
  IF p_day IS NULL THEN
    RAISE EXCEPTION 'Please choose a day.';
  END IF;

  IF p_day < v_today THEN
    RAISE EXCEPTION 'Please choose today or a day after it.';
  END IF;

  /*
   * Six months out. Not a rule the shop has, a guard against a slipped
   * finger: a counter visit booked for 2031 is a typo, and it would sit at
   * the bottom of the diary for five years looking like work.
   */
  IF p_day > v_today + 180 THEN
    RAISE EXCEPTION 'Please choose a day in the next six months.';
  END IF;

  IF extract(isodow FROM p_day) = 5 THEN
    RAISE EXCEPTION 'The shop is closed on Friday.';
  END IF;

  INSERT INTO public.appointments (name, phone, day, slot, reason, message, status)
  VALUES (
    btrim(p_name),
    btrim(p_phone),
    p_day,
    btrim(p_slot),
    nullif(btrim(coalesce(p_reason, '')), ''),
    nullif(btrim(coalesce(p_message, '')), ''),
    'requested'
  )
  RETURNING reference INTO v_reference;

  RETURN v_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.request_appointment(text,text,date,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_appointment(text,text,date,text,text,text)
  TO anon, authenticated;
