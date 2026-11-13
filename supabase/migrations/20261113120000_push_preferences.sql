-- Let a phone choose what it is told.
--
-- Until now a phone in push_devices was subscribed to exactly one thing: one
-- notification the morning the board is set. The app's Settings screen offers
-- two more, and this is where they are kept and where they are acted on:
--
--   * the rate, every time the shop changes it — not only the first publish
--     of a day but each later save that actually moves a gold figure;
--   * new pieces — when the shop adds to the catalogue, at most once a day.
--
-- Nothing here removes or rewrites anything. Two columns are added to
-- push_devices, with defaults that describe every row already in it — a phone
-- that asked for the daily rate and nothing else — so the phones subscribed
-- today are sent exactly what they were sent yesterday. register_push_device
-- and forget_push_device are untouched, because the app on people's phones
-- right now calls them and will go on calling them until it is updated.
--
-- DEPLOY ORDER. Redeploy the notify-enquiry Edge Function BEFORE applying
-- this. The triggers below post two sources the old function has never heard
-- of ('gold_rates_update' and 'new_pieces'), and what it does with a source it
-- does not know is treat the body as a customer enquiry and email it to the
-- shop. The new function, on a database that has not been migrated, simply
-- carries on sending the morning's rate to everybody — so function first, then
-- this, is safe at every moment in between; the other order is not.

-- ---------------------------------------------------------------------------
-- What each phone asked for
-- ---------------------------------------------------------------------------

ALTER TABLE public.push_devices
  -- 'daily' is the first publish of a day; 'every' is that and each later
  -- change; 'off' is a phone that only wants to hear about new pieces. The
  -- default is what every existing row already means.
  ADD COLUMN IF NOT EXISTS rate_alerts text NOT NULL DEFAULT 'daily'
    CHECK (rate_alerts IN ('off', 'daily', 'every')),
  -- Off by default, and off for every existing row: nobody subscribed today
  -- was ever asked about this, so nobody is opted into it.
  ADD COLUMN IF NOT EXISTS new_pieces boolean NOT NULL DEFAULT false;

/*
 * A phone saying what it wants, or changing its mind.
 *
 * The same standing as register_push_device: definer rights so the table can
 * stay shut, and the token as the only thing that identifies anybody. A value
 * for p_rate_alerts that is not one of the three is refused by the column's
 * own check rather than quietly stored as something else.
 *
 * An upsert, and called on every launch as well as on every change. A row
 * that has gone missing is made again as what the phone chose, not as the
 * default — which is the whole reason the app sends its choices with the
 * token each time instead of only when they change.
 *
 * It does not delete. A phone with nothing left switched on calls
 * forget_push_device instead, so there is one way for a row to go.
 */
CREATE OR REPLACE FUNCTION public.set_push_preferences(
  p_token text,
  p_platform text DEFAULT 'android',
  p_rate_alerts text DEFAULT 'daily',
  p_new_pieces boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- Definer rights make an unqualified name a privilege escalation route.
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.push_devices (token, platform, rate_alerts, new_pieces)
  VALUES (
    btrim(p_token),
    coalesce(nullif(btrim(p_platform), ''), 'android'),
    coalesce(p_rate_alerts, 'daily'),
    coalesce(p_new_pieces, false)
  )
  ON CONFLICT (token) DO UPDATE
    SET rate_alerts = EXCLUDED.rate_alerts,
        new_pieces = EXCLUDED.new_pieces,
        last_seen_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_push_preferences(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_push_preferences(text, text, text, boolean)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- The rate, when it changes
-- ---------------------------------------------------------------------------

/*
 * The same function as before, with one more outcome.
 *
 * It used to end at "already sent today": the first publish of a day was
 * announced and every later save that day was silence. That is still exactly
 * what happens for a phone on 'daily'. What is new is that a later save which
 * moves a gold figure is now posted too, under its own source, and the
 * notifier sends that one only to the phones that asked for every change.
 *
 * "Moves a gold figure" is checked, not assumed. The shop saves the board in
 * passes — gold, then silver — and re-saves it to fix something that is not a
 * rate at all; each of those is an UPDATE of the day's rows, and none of them
 * is news. So the old rows are compared with the new, and only a per-tola
 * gold rate that is actually different sends anything.
 *
 * old_rows exists only when this runs for the UPDATE trigger. The statement
 * that reads it is reached only when TG_OP is UPDATE, and plpgsql plans a
 * statement when it first runs it, not when the function is created — so the
 * INSERT trigger, which has no old rows to offer, never meets the name.
 *
 * A gold row INSERTED on a day already announced stays quiet, as it always
 * has. Announcing it would mean that one save which adds a karat and corrects
 * another fires both triggers and sends two notifications for one press of
 * the button; a karat arriving late is rare, and a doubled notification is
 * the kind of thing that gets an app's notifications switched off.
 */
CREATE OR REPLACE FUNCTION public.notify_rates_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
DECLARE
  v_date date;
  v_rates jsonb;
  v_source text;
  function_url text;
  shared_secret text;
BEGIN
  /*
   * Gold only, and the day those gold rows belong to. The karats are the ones
   * GOLD_KARATS lists in src/lib/rates.ts; a fourth one added there belongs
   * here too, in both places it is written.
   */
  SELECT max(rate_date) INTO v_date
    FROM new_rows
   WHERE karat IN ('24K', '23.65K', '22K');

  IF v_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- Only today's board, read in Pakistan rather than in UTC.
  IF v_date <> (now() AT TIME ZONE 'Asia/Karachi')::date THEN
    RETURN NULL;
  END IF;

  -- The notifier first, the day's mark second: see 20261030090000.
  SELECT value INTO function_url FROM public.app_config WHERE key = 'notify_function_url';
  IF function_url IS NULL OR function_url = '' THEN
    RETURN NULL;
  END IF;

  SELECT value INTO shared_secret FROM public.app_config WHERE key = 'notify_secret';

  INSERT INTO public.rate_alerts_sent (rate_date) VALUES (v_date) ON CONFLICT DO NOTHING;

  IF FOUND THEN
    -- The first publish of the day. Everybody who asked for the rate.
    v_source := 'gold_rates';
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM 1
       FROM new_rows n
       JOIN old_rows o ON o.id = n.id
      WHERE n.rate_date = v_date
        AND n.karat IN ('24K', '23.65K', '22K')
        AND n.rate_per_tola_pkr IS DISTINCT FROM o.rate_per_tola_pkr;

    -- Saved again with the gold where it was. Not news to anybody.
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    v_source := 'gold_rates_update';
  ELSE
    RETURN NULL;
  END IF;

  /*
   * The figures as published, read back from the table rather than worked out
   * again here. Whatever the notification quotes is what the board says.
   */
  SELECT jsonb_agg(
           jsonb_build_object(
             'karat', karat,
             'per_tola_pkr', rate_per_tola_pkr,
             'per_gram_pkr', rate_per_gram_pkr
           )
           ORDER BY karat
         )
    INTO v_rates
    FROM public.gold_rates
   WHERE rate_date = v_date;

  BEGIN
    PERFORM net.http_post(
      url := function_url,
      body := jsonb_build_object(
        'source', v_source,
        'record', jsonb_build_object('rate_date', v_date, 'rates', v_rates)
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', coalesce(shared_secret, '')
      ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- The rates are published and on the board either way. A notification that
    -- could not be queued must never cost the shop its morning's work.
    RAISE WARNING 'notify_rates_published failed for %: %', v_date, SQLERRM;
  END;

  RETURN NULL;
END;
$$;

-- Replacing a function keeps its privileges, but this one must never be
-- callable as an RPC and saying so twice costs nothing: see 20261102090000.
REVOKE EXECUTE ON FUNCTION public.notify_rates_published() FROM PUBLIC, anon, authenticated;

/*
 * The UPDATE trigger again, this time able to see what the rows were.
 *
 * Dropped and made rather than altered: a trigger's transition tables cannot
 * be changed in place. The INSERT trigger from 20261030090000 is left exactly
 * as it is.
 */
DROP TRIGGER IF EXISTS gold_rates_notify_update ON public.gold_rates;

CREATE TRIGGER gold_rates_notify_update
  AFTER UPDATE ON public.gold_rates
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_rates_published();

-- ---------------------------------------------------------------------------
-- New pieces, once a day
-- ---------------------------------------------------------------------------

/*
 * One row per day, the same arrangement as rate_alerts_sent and for the same
 * reason. The shop adds pieces through a form, one at a time, and a morning
 * spent photographing twelve of them is twelve inserts. Twelve notifications
 * would be the last ones anybody allowed this app to send; the first insert
 * of the day announces and the rest stay quiet.
 */
CREATE TABLE IF NOT EXISTS public.piece_alerts_sent (
  alert_date date PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.piece_alerts_sent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.piece_alerts_sent FROM anon, authenticated;
GRANT ALL ON public.piece_alerts_sent TO service_role;

/*
 * Tells the notifier that pieces arrived.
 *
 * It names the first piece and counts the rest, and that is all it sends: the
 * name the shop typed and the collection it filed the piece under. No price
 * and no description — the notification says a piece has come in, and the
 * catalogue says what it is.
 *
 * The whole body sits inside one handler, which the rate notifier's does not.
 * That one runs on a table only the rate form writes to; this one runs on
 * every piece the shop adds, and a fault in here that reached the INSERT
 * would mean the shop could not add stock until somebody fixed a notification.
 * Whatever goes wrong below is a warning in the log and nothing else.
 */
CREATE OR REPLACE FUNCTION public.notify_pieces_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Karachi')::date;
  v_count integer;
  v_name text;
  v_category text;
  function_url text;
  shared_secret text;
BEGIN
  SELECT count(*) INTO v_count FROM new_rows;
  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  -- The notifier first, the day's mark second, as with the rates: a day must
  -- not be spent on a notifier that is not there to send anything.
  SELECT value INTO function_url FROM public.app_config WHERE key = 'notify_function_url';
  IF function_url IS NULL OR function_url = '' THEN
    RETURN NULL;
  END IF;

  SELECT value INTO shared_secret FROM public.app_config WHERE key = 'notify_secret';

  INSERT INTO public.piece_alerts_sent (alert_date) VALUES (v_today) ON CONFLICT DO NOTHING;
  -- Already announced today.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT n.name, c.name
    INTO v_name, v_category
    FROM new_rows n
    LEFT JOIN public.categories c ON c.slug = n.category_slug
   ORDER BY n.name
   LIMIT 1;

  PERFORM net.http_post(
    url := function_url,
    body := jsonb_build_object(
      'source', 'new_pieces',
      'record', jsonb_build_object(
        'alert_date', v_today,
        'count', v_count,
        'name', v_name,
        'category', v_category
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', coalesce(shared_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_pieces_added failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- A trigger function, never an RPC.
REVOKE EXECUTE ON FUNCTION public.notify_pieces_added() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_notify_new ON public.products;

/*
 * Per statement, so an import of forty rows is one notification that says
 * "and 39 more" rather than forty triggers racing for the day's one mark.
 */
CREATE TRIGGER products_notify_new
  AFTER INSERT ON public.products
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_pieces_added();
