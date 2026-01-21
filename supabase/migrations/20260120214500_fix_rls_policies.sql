-- Migration: RLS Policy Düzeltmesi (Acil)
-- Önceki migration ile silinen ancak gerekli olan policy'leri yeniden ekler.

-- ====================================
-- VIDEO_PROGRESS TABLOSU
-- ====================================
-- Önce varsa sil, sonra yeniden oluştur
DROP POLICY IF EXISTS "Users can view their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can insert their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can update their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can delete their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users manage own video_progress" ON public.video_progress;

-- Yeniden oluştur
CREATE POLICY "Users can view their own video progress"
  ON public.video_progress
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video progress"
  ON public.video_progress
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video progress"
  ON public.video_progress
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video progress"
  ON public.video_progress
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- ====================================
-- USER_ACHIEVEMENTS TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Users can manage their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Allow insert for owners" ON public.user_achievements;
DROP POLICY IF EXISTS "Allow select for owners" ON public.user_achievements;
DROP POLICY IF EXISTS "Allow update for owners" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can delete their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users manage own achievements" ON public.user_achievements;

CREATE POLICY "Users can manage their own achievements"
  ON public.user_achievements
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (auth.uid() = user_id);

-- ====================================
-- POMODORO_SESSIONS TABLOSU
-- ====================================
DROP POLICY IF EXISTS "Users manage own sessions" ON public.pomodoro_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.pomodoro_sessions;

CREATE POLICY "Users manage own sessions"
  ON public.pomodoro_sessions
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (auth.uid() = user_id);
