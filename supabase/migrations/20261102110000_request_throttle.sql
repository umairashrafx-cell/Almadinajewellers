-- A limit on how often one address may write.
--
-- Every customer-facing write on this site is open to anybody: an enquiry, an
-- order request, a review, a newsletter sign-up, a custom order. That is as it
-- should be — a customer should not have to make an account to ask a question.
-- What was missing was any ceiling at all. The input checks are strict, so
-- nobody can store nonsense; but nothing stopped one script from storing ten
-- thousand perfectly well-formed enquiries, and the cost of that falls on
-- whoever has to read them in the morning.
--
-- This is PostgREST's pre-request hook, which Supabase documents for exactly
-- this. The function below runs before every Data API request, counts what
-- this address has done lately, and refuses when it is plainly not a person.
--
-- WHAT IT DOES NOT COVER
-- The hook belongs to the Data API. Storage uploads do not pass through it, so
-- the custom-order bucket is still limited only by size and type (see the
-- custom_order_upload_limits migration). Nor does Auth or Realtime.
--
-- TO TURN IT OFF, if it ever gets in the way of real customers:
--
--   ALTER ROLE authenticator RESET pgrst.db_pre_request;
--   NOTIFY pgrst, 'reload config';
--
-- That takes effect in seconds and leaves everything else here in place.

CREATE SCHEMA IF NOT EXISTS private;

-- Not in the exposed schemas, so none of this is reachable over the API.
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.request_log (
  ip inet NOT NULL,
  /* Kept for reading the log back, not for the decision: see `submission`. */
  path text,
  /* One of the open customer forms, which carry the tighter limit. */
  submission boolean NOT NULL DEFAULT false,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS request_log_ip_at_idx ON private.request_log (ip, at DESC);
CREATE INDEX IF NOT EXISTS request_log_at_idx ON private.request_log (at);

/*
 * How much is too much, in ten minutes, from one address.
 *
 * SUBMISSIONS is the number of times one address may use the open forms. A
 * customer sends one enquiry, perhaps an order after it. Ten leaves room for
 * a family sharing a phone's hotspot and for somebody who tries again because
 * the first attempt looked like it had not gone; it does not leave room for a
 * script. WRITES is the blunt ceiling over everything else.
 *
 * Both are judgement calls rather than measurements, and both are one number
 * in one place so they can be changed when the shop knows better. Mandi
 * Bahauddin is a town where a great many phones sit behind few addresses, so
 * if either ever turns somebody real away, raise it — that failure costs a
 * customer, and the one it guards against costs an hour of reading.
 */
CREATE OR REPLACE FUNCTION public.check_request()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, private, pg_temp
AS $$
DECLARE
  SUBMISSIONS constant integer := 10;
  WRITES constant integer := 200;
  WINDOW_ constant interval := interval '10 minutes';

  req_method text;
  req_path text;
  req_role text;
  req_ip inet;

  recent integer;
  recent_submissions integer;
  tight boolean;
  block boolean := false;
BEGIN
  /*
   * Everything that decides happens inside this block, and anything it does
   * not expect lets the request through.
   *
   * This function sits in front of every write the site makes. A throttle
   * that stops working is a nuisance; a throttle that throws is the shop
   * unable to take an order, so the only way out of here is the deliberate
   * refusal at the bottom.
   */
  BEGIN
    req_method := current_setting('request.method', true);

    -- Reads are not limited. They cannot be: GET and HEAD run read-only and
    -- may be served by a replica, which cannot write the log.
    IF req_method IS NULL OR req_method IN ('GET', 'HEAD') THEN
      RETURN;
    END IF;

    req_role := current_setting('request.jwt.claims', true)::json ->> 'role';

    -- Our own server, which the edge functions use to write the market board.
    IF req_role = 'service_role' THEN
      RETURN;
    END IF;

    req_ip := nullif(
      split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
      ''
    )::inet;

    -- No address to count against. Rather than put every such request in one
    -- shared bucket — which would have them throttle each other — this lets
    -- them past. An unenforced limit is better than one that fires at random.
    IF req_ip IS NULL THEN
      RETURN;
    END IF;

    /*
     * The open forms. Matched on the end of the path, because what PostgREST
     * reports depends on how the request reached it.
     *
     * Push registration is deliberately not here. The app registers its token
     * on launch, and somebody opening the app ten times while watching the
     * rate is a good customer, not an attack. It is still covered by WRITES.
     */
    req_path := coalesce(current_setting('request.path', true), '');
    tight := req_path LIKE '%/enquiries'
          OR req_path LIKE '%/rpc/place_order'
          OR req_path LIKE '%/rpc/submit_custom_order'
          OR req_path LIKE '%/rpc/submit_review'
          OR req_path LIKE '%/rpc/subscribe_newsletter';

    SELECT count(*), count(*) FILTER (WHERE r.submission)
      INTO recent, recent_submissions
      FROM private.request_log r
     WHERE r.ip = req_ip
       AND r.at > now() - WINDOW_;

    IF (tight AND recent_submissions >= SUBMISSIONS) OR recent >= WRITES THEN
      block := true;

      -- The shop's own people are never the problem, and an afternoon of
      -- cataloguing is exactly the shape of traffic this would otherwise stop.
      -- Asked only here, so the usual request never pays for the question.
      BEGIN
        IF public.is_admin() THEN
          block := false;
        END IF;
      EXCEPTION WHEN others THEN
        NULL;
      END;
    END IF;

    IF NOT block THEN
      INSERT INTO private.request_log (ip, path, submission)
      VALUES (req_ip, left(req_path, 200), coalesce(tight, false));
    END IF;

    -- Swept now and then rather than on a schedule: the log is only ever read
    -- over the last few minutes, and an hour of it is already generous.
    IF random() < 0.01 THEN
      DELETE FROM private.request_log WHERE at < now() - interval '1 hour';
    END IF;
  EXCEPTION WHEN others THEN
    /*
     * Something unforeseen — a header in a shape nobody expected, the log
     * table gone. Let the request through and leave the shop working.
     */
    block := false;
  END;

  /*
   * PostgREST hands this JSON back to the browser as the error body, so what
   * is written here is what the customer reads. `code` travels with it, which
   * is what the site matches on — see throttleMessage in src/lib/throttle.ts.
   * Matching on the sentence would mean the wording could never be improved.
   */
  IF block THEN
    RAISE sqlstate 'PGRST' USING
      message = json_build_object(
        'code', 'throttled',
        'message', 'Too many requests from this connection. Please wait a few minutes and try again, or send it to us on WhatsApp.'
      )::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests'
      )::text;
  END IF;
END;
$$;

/*
 * Reachable as an RPC, which is how PostgREST's own documentation leaves it.
 *
 * Calling it directly does nothing but add one row against the caller's own
 * address, so it costs them and nobody else. It is kept in public, and plainly
 * callable, because the pre-request hook is the one piece of this that must
 * not be clever: it runs before every write the shop makes.
 */
GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated, service_role;

DO $$
BEGIN
  ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_request';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not set pgrst.db_pre_request — set it from the dashboard, or the throttle will not run.';
END $$;

NOTIFY pgrst, 'reload config';
