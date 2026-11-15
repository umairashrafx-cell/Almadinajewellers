-- Let a piece be marked sold instead of deleted.
--
-- Until now the admin panel could add, edit and delete a piece, and nothing
-- else. A shop selling one-off gold sets needs a third thing: taking a piece
-- off the website when it sells, without losing what it was. Deleting did both
-- at once, so the only way to stop quoting a set that is already on somebody's
-- wrist was to destroy its record — its weight, its making charges, the rate it
-- was priced against, and the reviews pointing at it.
--
-- So: one nullable timestamp. NULL means the piece is for sale. A date means it
-- sold, and when. A timestamp rather than a boolean because the date is worth
-- something later ("what went in Ramzan?") and a boolean throws it away for no
-- saving.
--
-- Nothing here deletes or rewrites an existing row: every piece on the site
-- today has sold_at NULL and carries on exactly as before.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sold_at timestamptz;

COMMENT ON COLUMN public.products.sold_at IS
  'When the piece sold. NULL means it is still for sale and shown on the site.';

-- ---------------------------------------------------------------------------
-- Where "sold" is enforced
-- ---------------------------------------------------------------------------
--
-- In the database, not in the queries. The catalogue is read from nine places
-- in src/lib/catalogue.ts alone, plus the sitemap, the home page reviews and
-- the Android app, which shows the same website. Filtering in each of them is
-- nine chances to forget one, and forgetting one means the shop is still
-- advertising a set it has already sold. A row that the public may not see is
-- exactly what row-level security is for.
--
-- The public policy keeps its name: the products table is still publicly
-- readable, just not the pieces that are gone.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Products are publicly readable'
  ) THEN
    ALTER POLICY "Products are publicly readable" ON public.products
      USING (sold_at IS NULL);
  ELSE
    CREATE POLICY "Products are publicly readable" ON public.products
      FOR SELECT TO public USING (sold_at IS NULL);
  END IF;
END $$;

-- Staff still see everything, sold pieces included — otherwise marking a piece
-- sold would hide it from the very screen that has to un-mark it. Permissive
-- policies are OR-ed, so an administrator passes on this one whatever the
-- public policy says, and nobody else gains a row: is_admin() is false for an
-- anonymous visitor and for a signed-in user who is not on the staff list.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Admins may read every product'
  ) THEN
    CREATE POLICY "Admins may read every product" ON public.products
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- No index. The catalogue is a few dozen rows and Postgres will read the table
-- either way; an index here would be furniture. Worth revisiting if the
-- catalogue ever runs to thousands.
