-- Notify the shop when an enquiry is submitted.
--
-- An enquiry currently sits in the table until somebody opens the dashboard,
-- which means a bridal booking can go unanswered for days. This adds an
-- AFTER INSERT trigger that calls the notify-enquiry Edge Function.
--
-- Two properties matter more than the notification itself:
--
--   1. A notification failure must never lose or roll back an enquiry. The
--      trigger is wrapped in an exception handler, and pg_net queues the request
--      asynchronously rather than making the customer's form submission wait on
--      an outbound HTTP call.
--
--   2. Nothing is hardcoded. The function URL and shared secret live in a
--      service-role-only config table, so no key is baked into a migration and
--      the anon key cannot read them.
--
-- SETUP — the trigger stays dormant until these are done:
--   a) supabase functions deploy notify-enquiry
--   b) supabase secrets set NOTIFY_SECRET=... plus either NOTIFY_WEBHOOK_URL=...
--      or RESEND_API_KEY=... NOTIFY_EMAIL_TO=... NOTIFY_EMAIL_FROM=...
--   c) insert the function URL and the same secret into app_config (see the
--      commented INSERT at the foot of this file).

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Private key/value config. No policy and no grants to anon or authenticated,
-- so this is reachable only with the service role.
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_config FROM anon, authenticated;
GRANT ALL ON public.app_config TO service_role;

CREATE OR REPLACE FUNCTION public.notify_new_enquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Pinned search_path: a SECURITY DEFINER function must not resolve names
-- through a caller-controlled path.
SET search_path = public, net, pg_temp
AS $$
DECLARE
  function_url text;
  shared_secret text;
BEGIN
  SELECT value INTO function_url FROM public.app_config WHERE key = 'notify_function_url';

  -- Dormant until configured. An unconfigured notifier must not be an error.
  IF function_url IS NULL OR function_url = '' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO shared_secret FROM public.app_config WHERE key = 'notify_secret';

  BEGIN
    PERFORM net.http_post(
      url := function_url,
      body := to_jsonb(NEW),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', coalesce(shared_secret, '')
      ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never let a notification problem cost us the enquiry.
    RAISE WARNING 'notify_new_enquiry failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enquiries_notify ON public.enquiries;

CREATE TRIGGER enquiries_notify
  AFTER INSERT ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_enquiry();

-- Step (c). Run this once, with your own values, after deploying the function:
--
--   INSERT INTO public.app_config (key, value) VALUES
--     ('notify_function_url', 'https://<project-ref>.supabase.co/functions/v1/notify-enquiry'),
--     ('notify_secret', '<the same value as the NOTIFY_SECRET function secret>')
--   ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
