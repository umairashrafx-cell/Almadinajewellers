-- "childern-rings" -> "children-rings".
--
-- The children's rings collection was filed under a transposed slug, so the
-- page published at /collections/childern-rings with "Childern Rings" in the
-- title, the H1, the meta description and the breadcrumb. A URL is one of the
-- few things a customer reads before they trust the shop, and a spelling
-- mistake in the address of a jeweller whose whole argument is carefulness is
-- the wrong first impression. It gets more expensive to fix the longer it is
-- live, so it is fixed while the collection is still empty and nothing links
-- to it.
--
-- products.category_slug references categories(slug) WITHOUT ON UPDATE CASCADE
-- (see the original schema migration), so the slug cannot simply be renamed in
-- place while anything points at it. This inserts the corrected row, moves any
-- references onto it, then removes the old one — which is a no-op ordering when
-- the collection is empty, as it is today, and still correct if pieces have
-- been filed under it by the time this runs.
--
-- Every statement is guarded, so this is a no-op on a database that never had
-- the typo or has already been corrected.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'childern-rings') THEN
    RETURN;
  END IF;

  -- 1. The corrected row, carrying the old one's place in the hierarchy and
  --    its position in the navigation. The name is corrected too: it read
  --    "Childern Rings" everywhere the collection was rendered.
  INSERT INTO public.categories (slug, name, image_key, sort_order, parent_slug)
  SELECT 'children-rings', 'Children''s Rings', image_key, sort_order, parent_slug
  FROM public.categories
  WHERE slug = 'childern-rings'
  ON CONFLICT (slug) DO NOTHING;

  -- 2. Anything filed under the old slug moves across. Empty today; this is
  --    here so the migration does not depend on that staying true.
  UPDATE public.products
  SET category_slug = 'children-rings'
  WHERE category_slug = 'childern-rings';

  -- 3. parent_slug has ON UPDATE CASCADE, but the row is being deleted rather
  --    than renamed, and ON DELETE SET NULL would orphan a child instead of
  --    moving it. Children's Rings is a leaf under Rings today; this covers the
  --    case where it is not.
  UPDATE public.categories
  SET parent_slug = 'children-rings'
  WHERE parent_slug = 'childern-rings';

  -- 4. custom_orders.category_slug is ON DELETE SET NULL, so move those too
  --    rather than silently dropping the category from a past enquiry.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custom_orders'
      AND column_name = 'category_slug'
  ) THEN
    UPDATE public.custom_orders
    SET category_slug = 'children-rings'
    WHERE category_slug = 'childern-rings';
  END IF;

  DELETE FROM public.categories WHERE slug = 'childern-rings';
END $$;
