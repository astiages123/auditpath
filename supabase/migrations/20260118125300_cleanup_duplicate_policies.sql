-- ============================================
-- Cleanup: Duplicate RLS Policies
-- ============================================
-- Removes redundant policies that have identical functionality
-- Safe to apply: No data loss, no functional change

-- 1. note_chunks: Remove duplicate read policy
DROP POLICY IF EXISTS "Enable read access for everyone" ON note_chunks;

-- 2. courses: Remove duplicate read policy  
DROP POLICY IF EXISTS "Anyone can read courses" ON courses;

-- 3. pomodoro_sessions: Remove duplicate user policy
DROP POLICY IF EXISTS "Users manage own sessions" ON pomodoro_sessions;

-- 4. questions: Remove redundant read policies (keeping one)
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;

-- 5. user_achievements: Remove redundant policies
DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users manage own achievements" ON user_achievements;
