-- Enable pg_cron if not enabled (requires superuser, usually enabled on Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Nightly Job (03:00 AM)
-- Selects all PENDING chunks marked for nightly processing and sends them to the Edge Function.
-- Note: pg_net is required for http calls from SQL.
-- Replace 'SERVICE_ROLE_KEY' and URL with actual values if running manually, 
-- but for migration we define the structure. 
-- Ideally, we use an Edge Function to "Trigger Batch" instead of looping inside SQL.
-- Let's stick to the user request: "Gece Vardiyası (Arşiv/Deneme): ... pg_cron SQL komutu hazırla"

-- Job to call a 'janitor' edge function that processes the queue could be better, 
-- but here we assume we call the quiz-generator directly or via a batch function.

-- Let's create a wrapper function to find pending jobs and trigger them.
-- To avoid complex SQL HTTP logic with secrets in generic migration, 
-- we will schedule a SELECT query that *would* trigger if we had a trigger function, 
-- OR we assume an external service calls it.
-- BUT the user asked for pg_cron.

-- For simplicity and security in this agent output, I will provide the Cron Schedule assuming a function 'invoke_quiz_generator' exists
-- OR I will just provide the 'cron.schedule' for a generic 'SELECT 1' as placeholder if I can't guarantee net access.

-- However, to be functional:
-- We can create a table 'generation_queue' validation? No, we used 'status'.

-- Recommendation:
-- Create a new Edge Function 'scheduler' that runs on cron and fetches pending chunks.
-- This is much cleaner than putting HTTP logic in SQL.
-- Is that allowed? "pg_cron SQL komutu hazırla".

-- OK, I will provide the SQL to schedule a call to the edge function.
-- Users must replace their Project URL and Key.

-- UNCOMMENT AND RUN IN SUPABASE SQL EDITOR WITH YOUR ACTUAL KEYS:
/*
select
  cron.schedule(
    'nightly-quiz-generation',
    '0 3 * * *', -- 03:00 AM
    $$
    select
      net.http_post(
          url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/quiz-generator',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
          body:=json_build_object('type', 'nightly_batch')::jsonb
      ) as request_id;
    $$
  );
*/

-- 2. Instant Trigger (Webhook)
-- Created via Dashboard or:
/*
CREATE TRIGGER "trigger_quiz_gen_instant"
AFTER INSERT OR UPDATE ON "public"."note_chunks"
FOR EACH ROW
WHEN (new.status = 'PENDING' AND new.is_ready = true AND new.process_at_night = false)
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/quiz-generator',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer YOUR_KEY"}',
  '{}',
  '1000'
);
*/

-- Since we cannot safely embed secrets in this migration file without env vars (which SQL doesn't support easily),
-- I will create a placeholder migration that prepares the database for extensions if needed.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
