-- Migration: Remove Nightly Production Feature
-- Created: 2026-02-01
-- Purpose: Completely remove pg_cron based nightly question generation

-- 1. Unschedule all possible nightly jobs
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    
    -- Unschedule 'nightly-question-generation'
    BEGIN
      PERFORM cron.unschedule('nightly-question-generation');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Job nightly-question-generation not found or already unscheduled';
    END;

    -- Unschedule 'nightly-quiz-generation'
    BEGIN
      PERFORM cron.unschedule('nightly-quiz-generation');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Job nightly-quiz-generation not found or already unscheduled';
    END;

  END IF;
END;
$$;

-- 2. Remove the process_at_night column from note_chunks
-- This column was used to distinguish between instant and nightly processing
ALTER TABLE public.note_chunks 
DROP COLUMN IF EXISTS process_at_night;

-- 3. Additional cleanup (Optional: Drop enum values if they are specific to nightly, 
-- but 'PENDING' is used for instant triggers too, so we keep it)

-- Note: We keep the pg_cron and pg_net extensions as they might be used for other database maintenance tasks
-- or could be required by the Supabase project configuration.
