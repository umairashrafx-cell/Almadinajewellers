-- Newsletter sign-ups.
--
-- The home page has always had an email box that told people they were on the
-- list. Nothing was stored. This keeps the promise: each address is saved once,
-- staff can see and export the list, and nobody else can read it.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  /* Where the sign-up came from, e.g. 'home'. */
  source text NOT NULL DEFAULT 'home',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per address, whatever the capitalisation.
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON public.newsletter_subscribers (lower(email));
CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_idx
  ON public.newsletter_subscribers (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_subscribers_limits') THEN
    ALTER TABLE public.newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_limits CHECK (
      length(email) BETWEEN 6 AND 254
      AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      AND length(source) BETWEEN 1 AND 40
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Access: staff read and remove; the public can only add, through the function.
-- ---------------------------------------------------------------------------

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='newsletter_subscribers' AND policyname='Admins may read subscribers') THEN
    CREATE POLICY "Admins may read subscribers" ON public.newsletter_subscribers
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='newsletter_subscribers' AND policyname='Admins may remove subscribers') THEN
    CREATE POLICY "Admins may remove subscribers" ON public.newsletter_subscribers
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

/*
 * Signing up.
 *
 * A definer function rather than an INSERT grant, for two reasons. Signing up
 * twice must succeed quietly — telling a visitor "that address is already
 * subscribed" would let anyone test whether someone else is on the list. And
 * the address is normalised here, where a caller posting straight at the API
 * cannot skip it.
 */
CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email text, p_source text DEFAULT 'home')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_source text := left(coalesce(nullif(btrim(p_source), ''), 'home'), 40);
BEGIN
  IF length(v_email) NOT BETWEEN 6 AND 254
     OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.newsletter_subscribers (email, source)
  VALUES (v_email, v_source)
  ON CONFLICT (lower(email)) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_newsletter(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(text, text) TO anon, authenticated;
