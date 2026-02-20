-- Phase 1 Security Fixes
-- Locked down exchange_rates and added owner security to note_chunks

-- exchange_rates
DROP POLICY IF EXISTS "authenticated_manage_rates" ON public.exchange_rates;
CREATE POLICY "exchange_rates_admin_all" ON public.exchange_rates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "exchange_rates_public_select" ON public.exchange_rates FOR SELECT TO authenticated USING (true);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- note_chunks
ALTER TABLE public.note_chunks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
DROP POLICY IF EXISTS "Allow update for all users" ON public.note_chunks;
CREATE POLICY "Users can update their own chunks" ON public.note_chunks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.note_chunks ENABLE ROW LEVEL SECURITY;
