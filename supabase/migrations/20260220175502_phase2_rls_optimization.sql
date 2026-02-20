-- Phase 2 RLS Performance Optimization
-- Wrapping auth.uid() with (SELECT auth.uid()) for caching benefits

-- questions
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.questions;
CREATE POLICY "Enable read access for all authenticated users" ON public.questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.questions;
CREATE POLICY "Enable insert for authenticated users" ON public.questions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = created_by);

-- user_quiz_progress
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_quiz_progress;
CREATE POLICY "Users can view their own progress" ON public.user_quiz_progress FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_quiz_progress;
CREATE POLICY "Users can insert their own progress" ON public.user_quiz_progress FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- chunk_mastery
DROP POLICY IF EXISTS "Users can view their own chunk mastery" ON public.chunk_mastery;
CREATE POLICY "Users can view their own chunk mastery" ON public.chunk_mastery FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can manage their own chunk mastery" ON public.chunk_mastery;
CREATE POLICY "Users can manage their own chunk mastery" ON public.chunk_mastery FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- course_session_counters
DROP POLICY IF EXISTS "Users can view their own counters" ON public.course_session_counters;
CREATE POLICY "Users can view their own counters" ON public.course_session_counters FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can manage their own counters" ON public.course_session_counters;
CREATE POLICY "Users can manage their own counters" ON public.course_session_counters FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- video_progress
DROP POLICY IF EXISTS "Users can manage their own video progress" ON public.video_progress;
CREATE POLICY "Users can manage their own video progress" ON public.video_progress FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ai_generation_logs
DROP POLICY IF EXISTS "Users can view their own generation logs" ON public.ai_generation_logs;
CREATE POLICY "Users can view their own generation logs" ON public.ai_generation_logs FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- pomodoro_sessions
DROP POLICY IF EXISTS "Users can manage their own pomodoro sessions" ON public.pomodoro_sessions;
CREATE POLICY "Users can manage their own pomodoro sessions" ON public.pomodoro_sessions FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
