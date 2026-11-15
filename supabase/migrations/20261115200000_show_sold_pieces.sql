-- Let the website show a sold piece, labelled SOLD, instead of hiding it.
--
-- 20261115120000_mark_piece_sold made the public read policy match only
-- sold_at IS NULL, so marking a piece sold took it off every surface at once.
-- The shop would rather keep it visible: a sold bridal set is a picture of
-- what the workshop makes, and the link somebody was sent on WhatsApp should
-- say "sold — ask for something like it", not "this piece isn't available".
--
-- The obvious change — let the public read every row again — is wrong,
-- because of the Android app. Its own screens are a bundle on the customer's
-- phone, built from this repository's catalogue code as it stood when that
-- release was cut. That code knows nothing about sold_at. Shown a sold row, it
-- would draw it as an ordinary piece, at today's price, with an Enquire
-- button, and keep doing so on every phone until every phone updated. The
-- installed app relies on the database to keep sold pieces away from it.
--
-- So sold rows are shown only to a request that asks for them, with the
-- header x-include-sold: 1. The website's catalogue code sends it where a
-- customer is browsing and knows how to draw a sold piece. Everything that
-- does not send it — the installed app, the homepage rails, "You may also
-- like", the cart, the sitemap — sees the catalogue exactly as it is today.
--
-- This is a filter, not a lock. Anyone can send the header; what it reveals
-- is a piece the shop has chosen to show. Nothing private sits behind it. The
-- point is that a client which cannot draw a sold piece is never handed one.
--
-- It is safe in either order with the code that sends the header: before the
-- code ships nobody sends it, and before this runs the header is ignored. In
-- both cases sold pieces stay hidden, which is today's behaviour.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Products are publicly readable'
  ) THEN
    -- PostgREST publishes the request's headers, lower-cased, as JSON in
    -- request.headers. Outside PostgREST the setting is absent, the cast yields
    -- NULL and the coalesce makes it a plain no — so a direct SQL session sees
    -- only unsold pieces, as before.
    --
    -- Wrapped in a sub-select so Postgres evaluates it once per statement
    -- rather than once per row.
    ALTER POLICY "Products are publicly readable" ON public.products
      USING (
        sold_at IS NULL
        OR (
          SELECT coalesce(
            current_setting('request.headers', true)::json ->> 'x-include-sold',
            ''
          ) = '1'
        )
      );
  ELSE
    RAISE EXCEPTION
      'Expected the policy "Products are publicly readable" on public.products — run 20261115120000_mark_piece_sold first.';
  END IF;
END $$;

-- "Admins may read every product" from 20261115120000 stays. The admin panel
-- does not send the header, and must still see sold pieces to put them back.
