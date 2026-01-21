-- Migration: Duplicate RLS Policy Temizliği
-- Bu migration, performansı olumsuz etkileyen duplicate RLS policy'leri temizler.

-- ====================================
-- 1. COURSES TABLOSU
-- ====================================
-- "Anyone can read courses" kalacak
DROP POLICY IF EXISTS "Allow public read access on Course" ON public.courses;

-- ====================================
-- 2. NOTE_CHUNKS TABLOSU
-- ====================================
-- "Enable read access for everyone" kalacak
DROP POLICY IF EXISTS "Anyone can read note_chunks" ON public.note_chunks;

-- ====================================
-- 3. POMODORO_SESSIONS TABLOSU
-- ====================================
-- "Users manage own sessions" kalacak
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.pomodoro_sessions;

-- ====================================
-- 4. QUESTIONS TABLOSU
-- ====================================
-- "Enable read access for all users" kalacak
DROP POLICY IF EXISTS "Allow public read access" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

-- ====================================
-- 5. USER_ACHIEVEMENTS TABLOSU
-- ====================================
-- "Users can manage their own achievements" (FOR ALL) kalacak
DROP POLICY IF EXISTS "Allow insert for owners" ON public.user_achievements;
DROP POLICY IF EXISTS "Allow select for owners" ON public.user_achievements;
DROP POLICY IF EXISTS "Allow update for owners" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can delete their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users manage own achievements" ON public.user_achievements;

-- ====================================
-- 6. USERS TABLOSU
-- ====================================
-- "Users can view their own profile" kalacak
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- ====================================
-- 7. VIDEO_PROGRESS TABLOSU
-- ====================================
-- "Users manage own video_progress" (FOR ALL) kalacak
DROP POLICY IF EXISTS "Users can delete their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can insert their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can update their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can view their own video progress" ON public.video_progress;
