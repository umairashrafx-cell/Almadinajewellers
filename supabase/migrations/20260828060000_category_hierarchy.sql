-- Sub-categories.
--
-- Categories were flat: a product belonged to exactly one of six, and the six
-- were siblings. The shop sells necklace sets in kinds that customers ask for
-- by name — chokar, mala, short, ghani — and those are not six more siblings
-- sitting alongside Rings and Earrings. They are one category with four ways in.
--
-- parent_slug is null for a top-level category and names the parent otherwise.
-- One level only, deliberately: a shop this size does not need a tree, and a
-- self-referencing table with no depth limit invites one.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_slug text
  REFERENCES public.categories(slug) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories (parent_slug, sort_order);

-- A child of a child would be invisible everywhere that renders this, so the
-- database refuses one rather than letting it be created and quietly dropped.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_no_self_parent') THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_no_self_parent CHECK (parent_slug IS DISTINCT FROM slug);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.categories_one_level_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.parent_slug IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.categories
                 WHERE slug = NEW.parent_slug AND parent_slug IS NOT NULL) THEN
    RAISE EXCEPTION 'categories nest one level only: % already has a parent', NEW.parent_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_depth ON public.categories;
CREATE TRIGGER categories_depth
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_one_level_only();

-- ---------------------------------------------------------------------------
-- Necklace Set, and the four kinds under it
-- ---------------------------------------------------------------------------

-- Necklace Set sits second, next to Bridal Sets, so everything below it moves
-- down one. Done before the insert so the new row lands in a free slot.
UPDATE public.categories SET sort_order = sort_order + 1
WHERE parent_slug IS NULL AND sort_order >= 2 AND slug <> 'necklace-set';

INSERT INTO public.categories (slug, name, image_key, sort_order, parent_slug) VALUES
  ('necklace-set', 'Necklace Set', 'bridal', 2, NULL)
ON CONFLICT (slug) DO NOTHING;

-- image_key is NOT NULL and there is no photograph for these yet, so they
-- borrow the bridal placeholder. Replacing it is a one-line UPDATE per row
-- once the shop has its own photography.
INSERT INTO public.categories (slug, name, image_key, sort_order, parent_slug) VALUES
  ('chokar-set', 'Chokar Set', 'bridal', 1, 'necklace-set'),
  ('mala-set',   'Mala Set',   'bridal', 2, 'necklace-set'),
  ('short-set',  'Short Set',  'bridal', 3, 'necklace-set'),
  ('ghani-set',  'Ghani Set',  'bridal', 4, 'necklace-set')
ON CONFLICT (slug) DO NOTHING;
