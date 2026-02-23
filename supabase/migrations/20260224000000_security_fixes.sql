-- Security Fixes Migration
-- 1. ai_generation_costs view: Add security_invoker
-- 2. trigger_quiz_generator: Add search_path to prevent privilege escalation
-- 3. exchange_rates: Remove overly permissive policy for authenticated users
-- 4. Note: leaked_password_protection must be enabled via Supabase Dashboard

-- 1. Fix ai_generation_costs view - enforce security_invoker
ALTER VIEW public.ai_generation_costs SET (security_invoker = true);

-- 2. Fix trigger_quiz_generator - add search_path to SECURITY DEFINER function
CREATE OR REPLACE FUNCTION "public"."trigger_quiz_generator"()
RETURNS trigger AS $$
DECLARE
  v_service_role_key TEXT;
  v_url TEXT;
BEGIN
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_role_key IS NULL THEN
    RAISE WARNING 'Vault secret "service_role_key" not found!';
    RETURN NEW;
  END IF;

  v_url := 'https://ccnvhimlbkkydpcqtraw.supabase.co/functions/v1/quiz-generator';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'vault';

-- 3. Fix exchange_rates - remove ALL policy for authenticated, keep only service_role
DROP POLICY IF EXISTS "exchange_rates_manage_auth" ON public.exchange_rates;

CREATE POLICY "exchange_rates_service_role_all" ON public.exchange_rates
    FOR ALL TO service_role USING (true) WITH CHECK (true);
