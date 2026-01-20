-- Enable extensions
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Schedule the nightly scheduler (Default: 3 AM)
-- NOTE: You must update the URL and Authorization header with your project's details.

-- Use a safe block to handle scheduling
do $$
begin
  -- Check if pg_cron is available
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    
    -- Attempt to unschedule safely by checking if job exists or just ignoring error via perform
    -- Using a direct delete from cron.job is often more reliable for idempotency if unschedule fails on non-existence
    -- But 'cron.unschedule' is the public API. We wrap it in a block to catch errors.
    begin
        perform cron.unschedule('nightly-question-generation');
    exception when others then
        -- Ignore error if job doesn't exist
        null;
    end;

    -- Schedule the new job
    perform cron.schedule(
        'nightly-question-generation',
        '0 3 * * *', -- Every day at 3:00 AM
        $sql$
        select net.http_post(
            url:='https://ccnvhimlbkkydpcqtraw.supabase.co/functions/v1/nightly-scheduler',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbnZoaW1sYmtreWRwY3F0cmF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1NDQ0MSwiZXhwIjoyMDgzNTMwNDQxfQ.efhQYAZ4760Y5pbTTsnQ_7ll8Jo0vOORHQ92Vpt4t-8"}'::jsonb
        ) as request_id;
        $sql$
    );
  end if;
exception when others then
  raise notice 'Could not schedule cron job: %', SQLERRM;
end;
$$;
