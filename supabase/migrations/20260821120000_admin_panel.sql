-- Admin panel: staff authentication, write access, and image storage.
--
-- Everything the shop edits — products, categories, the daily gold rate — has
-- been read-only to the public and writable only with the service role. The
-- admin screens run in the browser with the anon key plus a signed-in session,
-- so write access has to be granted at the row level rather than by handing a
-- service-role key to the client.
--
-- The gate is public.is_admin(): a signed-in user is staff only if their user id
-- is listed in admin_users. It fails closed — an empty admin_users table means
-- nobody is an administrator, so a stray sign-up cannot edit the catalogue.
--
-- SETUP — the panel is unusable until an administrator exists:
--   1. Supabase dashboard → Authentication → Users → Add user.
--      Use a real email, set a password, and tick "Auto Confirm User".
--   2. Run the INSERT at the foot of this file with that email address.
--   3. Sign in at /admin.
--
-- Also turn off "Allow new users to sign up" in Authentication → Providers →
-- Email. Nothing in the site signs anyone up, and leaving it on lets a stranger
-- create an account. They would still not be an administrator, but there is no
-- reason to allow the account at all.

-- ---------------------------------------------------------------------------
-- Who is staff
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- SECURITY DEFINER so the check itself is not subject to the policies it feeds,
-- which would recurse. STABLE so Postgres evaluates it once per statement
-- rather than once per row. search_path is pinned: a SECURITY DEFINER function
-- must not resolve names through a caller-controlled path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users'
      AND policyname = 'Admins may see the admin list'
  ) THEN
    CREATE POLICY "Admins may see the admin list" ON public.admin_users
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Catalogue write access
-- ---------------------------------------------------------------------------

-- The public SELECT policies on these tables already exist and are left alone.
-- Only the write paths are added, each gated on is_admin().
DO $$
DECLARE
  t text;
  op text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'categories', 'gold_rates'] LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);

    FOREACH op IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      policy_name := format('Admins may %s %s', lower(op), t);

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname = policy_name
      ) THEN
        -- An INSERT policy takes WITH CHECK only; a DELETE policy takes USING only.
        EXECUTE format(
          CASE op
            WHEN 'INSERT' THEN 'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())'
            WHEN 'UPDATE' THEN 'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())'
            ELSE 'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())'
          END, policy_name, t);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Enquiries: readable by staff only
-- ---------------------------------------------------------------------------

-- The enquiries migration revoked SELECT and UPDATE from authenticated and left
-- a note that an admin screen should re-add them scoped to signed-in staff.
-- This is that. Customer names and phone numbers stay unreadable to anon, and
-- to any signed-in user who is not in admin_users, because the policies below
-- match no rows for them. DELETE is deliberately not granted — a lead should be
-- marked handled, never quietly removed.
GRANT SELECT, UPDATE ON public.enquiries TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enquiries'
      AND policyname = 'Admins may read enquiries'
  ) THEN
    CREATE POLICY "Admins may read enquiries" ON public.enquiries
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enquiries'
      AND policyname = 'Admins may update enquiries'
  ) THEN
    CREATE POLICY "Admins may update enquiries" ON public.enquiries
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Product image storage
-- ---------------------------------------------------------------------------

-- products.image_keys has held short strings ("bridal", "rings") that the app
-- maps onto bundled placeholder art. Uploaded photographs live here and their
-- object path goes into that same column; imageFor() resolves a value
-- containing a slash to this bucket's public URL and anything else to a
-- placeholder, so both kinds of row keep rendering during the changeover.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- storage.objects belongs to the storage extension, so creating policies on it
-- needs privileges a migration is not always granted. A failure here costs
-- uploads, not the rest of the panel, so it warns rather than aborting. If this
-- warns, add the same two policies from the Supabase dashboard under
-- Storage → product-images → Policies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Product images are publicly readable'
  ) THEN
    CREATE POLICY "Product images are publicly readable" ON storage.objects
      FOR SELECT USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins may manage product images'
  ) THEN
    CREATE POLICY "Admins may manage product images" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'product-images' AND public.is_admin())
      WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not create storage policies for product-images — add them from the Supabase dashboard.';
END $$;

-- ---------------------------------------------------------------------------
-- Step 2 of setup. Run this once, with your own address.
-- ---------------------------------------------------------------------------
--
--   INSERT INTO public.admin_users (user_id, email)
--   SELECT id, email FROM auth.users WHERE lower(email) = lower('you@example.com')
--   ON CONFLICT (user_id) DO NOTHING;
