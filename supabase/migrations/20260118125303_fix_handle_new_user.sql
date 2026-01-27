-- ============================================
-- Fix: handle_new_user Trigger Function
-- ============================================
-- Corrects the table name from "User" to "users"
-- This trigger creates a public.users record when auth.users record is created

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$function$;

-- Ensure trigger exists on auth.users
-- (Only create if not exists - this is idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
