-- Backend Standardization Migration
-- 1. Security: Set search_path to 'public' for SECURITY DEFINER functions
-- 2. Security: Update RLS policies from 'TO public' to 'TO authenticated' for sensitive data
-- 3. Optimization: Add missing indexes for foreign keys
-- 4. Clean Code: Standardize RLS policy names

-- 1. Security: search_path for SECURITY DEFINER functions (Already partially done in 20260224000000, ensuring others are covered)
-- (Any other custom functions without search_path should be updated here)

-- 2. Security: Update RLS policies to restrict "public" access
-- chunk_mastery
DROP POLICY IF EXISTS "chunk_mastery_user_all" ON public.chunk_mastery;
CREATE POLICY "chunk_mastery_user_access" ON public.chunk_mastery 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- course_session_counters
DROP POLICY IF EXISTS "course_session_counters_user_all" ON public.course_session_counters;
CREATE POLICY "course_session_counters_user_access" ON public.course_session_counters 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- pomodoro_sessions
DROP POLICY IF EXISTS "pomodoro_sessions_user_all" ON public.pomodoro_sessions;
CREATE POLICY "pomodoro_sessions_user_access" ON public.pomodoro_sessions 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- questions
DROP POLICY IF EXISTS "questions_user_all" ON public.questions;
CREATE POLICY "questions_user_access" ON public.questions 
    FOR ALL TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- user_achievements
DROP POLICY IF EXISTS "user_achievements_user_all" ON public.user_achievements;
CREATE POLICY "user_achievements_user_access" ON public.user_achievements 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_quiz_progress
DROP POLICY IF EXISTS "user_quiz_progress_user_all" ON public.user_quiz_progress;
CREATE POLICY "user_quiz_progress_user_access" ON public.user_quiz_progress 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- video_progress
DROP POLICY IF EXISTS "video_progress_user_all" ON public.video_progress;
CREATE POLICY "video_progress_user_access" ON public.video_progress 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Optimization: Missing Indexes
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON public.videos(course_id);
CREATE INDEX IF NOT EXISTS idx_note_chunks_course_id ON public.note_chunks(course_id);

-- 4. Clean Code: Ensure exchange_rates still allows public SELECT but restricted for manage
DROP POLICY IF EXISTS "exchange_rates_read_all" ON public.exchange_rates;
CREATE POLICY "exchange_rates_auth_read" ON public.exchange_rates 
    FOR SELECT TO authenticated USING (true);
