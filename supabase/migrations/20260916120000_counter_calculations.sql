-- Saved counter calculations.
--
-- The admin Calculator works a bill out the way the shop's spreadsheet does.
-- Staff can save one under the customer's name, so the figures quoted across
-- the counter can be looked up again later with the date and time they were
-- given.
--
-- The lines are stored exactly as they were worked out — weight, polish or
-- kaat, rate and the resulting amounts — rather than recalculated on reading,
-- so a saved bill always shows what the customer was told, even if the
-- formula or a rate changes afterwards.

CREATE TABLE IF NOT EXISTS public.counter_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /* 'selling': polish added and charged. 'buying': kaat taken off and paid. */
  mode text NOT NULL,
  customer_name text NOT NULL,
  /*
   * One object per counted line:
   * { weight, factor, rate, extra, billed, amount }
   * factor is polish g/tola (selling) or kaat rati/tola (buying).
   */
  lines jsonb NOT NULL,
  total_weight_g numeric(12, 3) NOT NULL,
  total_billed_g numeric(12, 3) NOT NULL,
  total_amount_pkr bigint NOT NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counter_calculations_created_idx
  ON public.counter_calculations (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counter_calculations_limits') THEN
    ALTER TABLE public.counter_calculations ADD CONSTRAINT counter_calculations_limits CHECK (
      mode IN ('selling', 'buying')
      AND length(btrim(customer_name)) BETWEEN 1 AND 80
      AND jsonb_typeof(lines) = 'array'
      AND jsonb_array_length(lines) BETWEEN 1 AND 100
      AND total_weight_g >= 0
      AND total_billed_g >= 0
      AND total_amount_pkr >= 0
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Access: staff only. Customers never see or create these.
-- ---------------------------------------------------------------------------

ALTER TABLE public.counter_calculations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.counter_calculations FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.counter_calculations TO authenticated;
GRANT ALL ON public.counter_calculations TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='counter_calculations' AND policyname='Admins may read counter calculations') THEN
    CREATE POLICY "Admins may read counter calculations" ON public.counter_calculations
      FOR SELECT TO authenticated USING (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='counter_calculations' AND policyname='Admins may save counter calculations') THEN
    CREATE POLICY "Admins may save counter calculations" ON public.counter_calculations
      FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                 AND tablename='counter_calculations' AND policyname='Admins may delete counter calculations') THEN
    CREATE POLICY "Admins may delete counter calculations" ON public.counter_calculations
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;
