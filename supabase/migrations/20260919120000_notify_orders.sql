-- Notify the shop about orders and custom orders too, not just enquiries.
--
-- The enquiry notifier has been in place since August. An order placed from the
-- cart and a custom order sent from /custom-order both land in their tables and
-- wait for somebody to open the dashboard — which is the same problem the
-- enquiry trigger was added to solve, on the two tables where the customer has
-- gone furthest and is most likely to be waiting for an answer.
--
-- The existing notify_new_enquiry() is generalised rather than copied. It now
-- sends { source, record } instead of the bare row, so the Edge Function can
-- tell an order from an enquiry and write a sensible subject line. The old
-- function name is kept: it is referenced by the trigger created in
-- 20260818200000, and renaming it would mean dropping and recreating that
-- trigger for no gain.
--
-- The two properties the original migration cared about still hold:
--
--   1. A notification failure must never lose or roll back a submission. The
--      body is wrapped in an exception handler, and pg_net queues the request
--      asynchronously rather than making the customer wait on an outbound call.
--      This matters more here than it did for enquiries: place_order() returns
--      the reference the customer is shown, so a blocking notifier would put an
--      outbound HTTP call in the middle of a checkout.
--
--   2. Nothing is hardcoded. The function URL and shared secret stay in
--      app_config, readable only with the service role.
--
-- Still dormant until app_config holds notify_function_url — see the setup
-- steps at the foot of 20260818200000_enquiry_notifications.sql. This migration
-- adds no new configuration: once that row exists, all three tables notify.

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
      -- TG_TABLE_NAME rather than a per-trigger argument, so one function
      -- serves all three tables and a fourth needs only a CREATE TRIGGER.
      body := jsonb_build_object('source', TG_TABLE_NAME, 'record', to_jsonb(NEW)),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', coalesce(shared_secret, '')
      ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never let a notification problem cost us the submission.
    RAISE WARNING 'notify_new_enquiry failed for %.%: %', TG_TABLE_NAME, NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- place_order() inserts into public.orders with definer rights, and an AFTER
-- INSERT trigger fires for that exactly as it does for a direct insert.
DROP TRIGGER IF EXISTS orders_notify ON public.orders;

CREATE TRIGGER orders_notify
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_enquiry();

DROP TRIGGER IF EXISTS custom_orders_notify ON public.custom_orders;

CREATE TRIGGER custom_orders_notify
  AFTER INSERT ON public.custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_enquiry();
