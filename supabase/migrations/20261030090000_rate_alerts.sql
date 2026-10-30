-- Tell people the day's rates are in.
--
-- The shop publishes its rates each morning and then waits to be asked. The
-- Android app can now carry the answer out to whoever wanted it: one
-- notification a day, the morning the board is set.
--
-- Three pieces, in the order they are used:
--
--   1. push_devices — the phones that asked to be told. A device token and
--      nothing else: no name, no number, nothing that says who is holding the
--      phone. The table is closed to anon and authenticated alike; a phone
--      reaches it only through the two functions below, which is the same
--      arrangement place_order uses for the orders table and for the same
--      reason — the anon key is published in the page source.
--
--   2. rate_alerts_sent — one row per day, written by the trigger before it
--      sends anything. publishRates() upserts every karat in one statement, so
--      the statement trigger fires once; but the shop also corrects a rate
--      later in the day, and a correction is not news. The first publish of a
--      day wins and every later save that day stays quiet.
--
--   3. The trigger itself, which hands the published figures to the same Edge
--      Function the enquiry notifier already calls, with source 'gold_rates'.
--      It reuses that function's URL and shared secret from app_config, so
--      there is one notifier to deploy and one secret to keep, not two.
--
-- SETUP — dormant until these are done:
--   a) app_config already holds notify_function_url and notify_secret (see
--      20260818200000). If it does not, nothing here sends and nothing breaks.
--   b) supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<the service account
--      JSON from the Firebase project>'. Without it the function logs that
--      push is not configured and returns.
--   c) redeploy: supabase functions deploy notify-enquiry

-- ---------------------------------------------------------------------------
-- The phones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- An FCM registration token. Long and opaque; the bounds are here to keep a
  -- bored visitor from filling the table with two-character rows.
  token text NOT NULL UNIQUE CHECK (length(token) BETWEEN 64 AND 1024),
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Moved every time the app registers, which it does on each launch. A token
  -- that has not been seen for months is a phone that no longer has the app.
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
-- No policies and no grants: not readable, writable or countable by anyone
-- holding the anon key. Only the service role and the two functions below.
REVOKE ALL ON public.push_devices FROM anon, authenticated;
GRANT ALL ON public.push_devices TO service_role;

/*
 * A phone asking to be told.
 *
 * Definer rights, so the table itself can stay shut. The token is the only
 * argument because it is the only thing we want: this is deliberately not a
 * place where a device can leave anything about its owner.
 *
 * Called on every launch while alerts are on, not only the first time — FCM
 * reissues tokens, and an upsert is how a reissued one replaces the old.
 */
CREATE OR REPLACE FUNCTION public.register_push_device(p_token text, p_platform text DEFAULT 'android')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- Definer rights make an unqualified name a privilege escalation route.
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.push_devices (token, platform)
  VALUES (btrim(p_token), coalesce(nullif(btrim(p_platform), ''), 'android'))
  ON CONFLICT (token) DO UPDATE SET last_seen_at = now();
END;
$$;

/*
 * A phone asking to be left alone.
 *
 * Knowing the token is what authorises this, which is the same standing a
 * device has to register one. A token lives on the phone that owns it and is
 * never readable from here, so the only caller who can forget a device is the
 * device — or Google, when it tells the notifier a token is dead.
 */
CREATE OR REPLACE FUNCTION public.forget_push_device(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.push_devices WHERE token = btrim(p_token);
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_device(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forget_push_device(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forget_push_device(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- One notification a day
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_alerts_sent (
  rate_date date PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_alerts_sent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_alerts_sent FROM anon, authenticated;
GRANT ALL ON public.rate_alerts_sent TO service_role;

CREATE OR REPLACE FUNCTION public.notify_rates_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
DECLARE
  v_date date;
  v_rates jsonb;
  function_url text;
  shared_secret text;
BEGIN
  /*
   * Gold only, and the day those gold rows belong to.
   *
   * The shop sometimes saves silver on its own, and a notification headed
   * "today's gold rate" that quoted silver would be wrong twice over — once in
   * what it said, and once in using up the day's single alert before the gold
   * was even set. The karats are the ones GOLD_KARATS lists in
   * src/lib/rates.ts; a fourth one added there belongs here too.
   */
  SELECT max(rate_date) INTO v_date
    FROM new_rows
   WHERE karat IN ('24K', '23.65K', '22K');

  IF v_date IS NULL THEN
    RETURN NULL;
  END IF;

  /*
   * Only today's board, read in Pakistan rather than in UTC — the database
   * keeps time in UTC, and at nine in the morning in Mandi Bahauddin that is
   * still four. Backfilling an old day, or setting tomorrow's rates in
   * advance, must not tell anyone that today's rates are in.
   */
  IF v_date <> (now() AT TIME ZONE 'Asia/Karachi')::date THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.rate_alerts_sent (rate_date) VALUES (v_date) ON CONFLICT DO NOTHING;
  -- Already sent today. A correction to the board is not a second morning.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT value INTO function_url FROM public.app_config WHERE key = 'notify_function_url';
  IF function_url IS NULL OR function_url = '' THEN
    RETURN NULL;
  END IF;

  SELECT value INTO shared_secret FROM public.app_config WHERE key = 'notify_secret';

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
        'source', 'gold_rates',
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

DROP TRIGGER IF EXISTS gold_rates_notify ON public.gold_rates;

/*
 * Per statement, not per row: the board is four rows and one save, and a
 * customer wants one notification, not four. The transition table is what lets
 * a statement trigger see which day was touched.
 */
CREATE TRIGGER gold_rates_notify
  AFTER INSERT ON public.gold_rates
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_rates_published();

/*
 * The day's first save is usually an insert, but the shop sometimes sets the
 * rates in two passes — gold first, silver after — and the second pass updates
 * rows that already exist. Both are the same morning, and rate_alerts_sent
 * keeps the second one quiet.
 */
DROP TRIGGER IF EXISTS gold_rates_notify_update ON public.gold_rates;

CREATE TRIGGER gold_rates_notify_update
  AFTER UPDATE ON public.gold_rates
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_rates_published();
