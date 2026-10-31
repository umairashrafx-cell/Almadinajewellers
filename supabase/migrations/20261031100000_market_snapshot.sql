-- The international markets, as the shop's own server last saw them.
--
-- Five numbers from three strangers' APIs — gold and silver from gold-api.com,
-- the dollar index and crude from Yahoo, bitcoin from CoinGecko. None of them
-- is ours, none is under contract, and every phone that opens the app would
-- otherwise ask them all directly. This table is what stops that: the edge
-- function fetches at most once every few minutes and every app reads the same
-- answer, so a thousand customers cost the same as one.
--
-- It is also the memory. When an API is down, or has quietly started refusing
-- us, the function serves the last good figure with its timestamp rather than
-- an empty board, and the app says plainly how old it is.
--
-- One row, enforced by the primary key: there is only one world market.
CREATE TABLE IF NOT EXISTS public.market_snapshot (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Reached only by the edge function, which holds the service role. The app
-- never reads this table; it reads the function, which is what applies the
-- caching rule. No policy and no grants, so anon and authenticated cannot.
ALTER TABLE public.market_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_snapshot FROM anon, authenticated;
GRANT ALL ON public.market_snapshot TO service_role;

COMMENT ON TABLE public.market_snapshot IS
  'Single-row cache of international market prices, written by the market-rates edge function.';
