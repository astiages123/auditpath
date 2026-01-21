-- Unschedule the nightly question generation job
do $$
begin
  -- Check if pg_cron is available
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Attempt to unschedule
    begin
        perform cron.unschedule('nightly-question-generation');
    exception when others then
        -- Ignore error if job doesn't exist
        null;
    end;
  end if;
end;
$$;
