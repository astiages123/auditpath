-- Allow authenticated users to insert and update exchange rates (caching from frontend)
DROP POLICY IF EXISTS "exchange_rates_auth_insert" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_auth_update" ON public.exchange_rates;

CREATE POLICY "exchange_rates_auth_insert" ON public.exchange_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exchange_rates_auth_update" ON public.exchange_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
