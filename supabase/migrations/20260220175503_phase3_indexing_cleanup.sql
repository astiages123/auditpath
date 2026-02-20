-- Phase 3 Indexing and Cleanup
-- Adding missing FK indexes and removing unused ones

-- Create missing FK indexes
CREATE INDEX IF NOT EXISTS idx_chunk_mastery_course_id ON public.chunk_mastery(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);
CREATE INDEX IF NOT EXISTS idx_user_quiz_progress_course_id ON public.user_quiz_progress(course_id);

-- Remove redundant/unused indexes
DROP INDEX IF EXISTS public.idx_progress_question;
DROP INDEX IF EXISTS public.idx_session_counters_user;
DROP INDEX IF EXISTS public.idx_progress_session;
DROP INDEX IF EXISTS public.idx_pomodoro_sessions_last_active_at;
DROP INDEX IF EXISTS public.idx_progress_chunk_response;
DROP INDEX IF EXISTS public.idx_user_question_status_user_status;
DROP INDEX IF EXISTS public.idx_pomodoro_sessions_user_id;
DROP INDEX IF EXISTS public.idx_questions_course_section;
DROP INDEX IF EXISTS public.idx_questions_concept_title;
DROP INDEX IF EXISTS public.user_question_status_next_review_idx;
DROP INDEX IF EXISTS public.idx_user_question_status_session;
