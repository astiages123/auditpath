-- Add username column to users table
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "username" text;

-- Add unique constraint to username
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN
        ALTER TABLE "public"."users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");
    END IF;
END $$;

-- Create function to get email by username (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM public.users
  WHERE username = username_input;
  
  RETURN found_email;
END;
$function$;

-- Update handle_new_user to save username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
begin
  insert into public.users (id, email, username)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$function$;
