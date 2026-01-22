-- Migration: Add question_generation_logs table for real-time logging
-- Created: 2026-01-22

-- Log step enum
CREATE TYPE public.generation_log_step AS ENUM (
    'INIT',
    'MAPPING', 
    'GENERATING',
    'VALIDATING',
    'REVISION',
    'COMPLETED',
    'ERROR'
);

-- Main logs table
CREATE TABLE public.question_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES public.note_chunks(id) ON DELETE CASCADE,
    session_id UUID NOT NULL, -- Groups logs from same generation run
    step public.generation_log_step NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast filtering by chunk_id and session
CREATE INDEX idx_question_generation_logs_chunk ON public.question_generation_logs(chunk_id);
CREATE INDEX idx_question_generation_logs_session ON public.question_generation_logs(session_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.question_generation_logs;

-- RLS Policies
ALTER TABLE public.question_generation_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can read logs (for real-time subscription)
CREATE POLICY "Anyone can read logs" ON public.question_generation_logs
    FOR SELECT USING (true);

-- Only service role can insert (Edge Function uses service role)
CREATE POLICY "Service role can insert logs" ON public.question_generation_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Cleanup: Delete logs older than 7 days (optional scheduled job)
-- Can be set up via pg_cron if needed
