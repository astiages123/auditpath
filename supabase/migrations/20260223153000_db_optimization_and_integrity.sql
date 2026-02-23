-- 1. Indexing Optimization
CREATE INDEX IF NOT EXISTS idx_user_quiz_progress_user_id 
ON public.user_quiz_progress USING btree (user_id);

-- 2. Data Integrity (NOT NULL)
ALTER TABLE public.pomodoro_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.video_progress ALTER COLUMN user_id SET NOT NULL;

-- 3. Standardize Foreign Keys to public.users
-- pomodoro_sessions
ALTER TABLE public.pomodoro_sessions DROP CONSTRAINT IF EXISTS pomodoro_sessions_user_id_fkey;
ALTER TABLE public.pomodoro_sessions
  ADD CONSTRAINT pomodoro_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- video_progress
ALTER TABLE public.video_progress DROP CONSTRAINT IF EXISTS video_progress_user_id_fkey;
ALTER TABLE public.video_progress
  ADD CONSTRAINT video_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ai_generation_logs
ALTER TABLE public.ai_generation_logs DROP CONSTRAINT IF EXISTS ai_generation_logs_user_id_fkey;
ALTER TABLE public.ai_generation_logs
  ADD CONSTRAINT ai_generation_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- user_question_status
ALTER TABLE public.user_question_status DROP CONSTRAINT IF EXISTS user_question_status_user_id_fkey;
ALTER TABLE public.user_question_status
  ADD CONSTRAINT user_question_status_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- user_achievements
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS UserAchievement_userId_fkey;
ALTER TABLE public.user_achievements
  ADD CONSTRAINT user_achievements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- user_quotas
ALTER TABLE public.user_quotas DROP CONSTRAINT IF EXISTS user_quotas_user_id_fkey;
ALTER TABLE public.user_quotas
  ADD CONSTRAINT user_quotas_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
